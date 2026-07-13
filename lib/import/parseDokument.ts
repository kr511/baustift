import mammoth from "mammoth";
import { inflateRawSync } from "node:zlib";
import { extractText, getDocumentProxy } from "unpdf";

export type DokumentTyp = "pdf" | "docx";

const DOCX_MIME =
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document";
const PDF_MIME = "application/pdf";
const GENERISCHE_MIME_TYPES = new Set([
  "",
  "application/octet-stream",
  "application/zip",
  "application/x-zip-compressed",
]);
const MAX_DOCX_ENTRIES = 1_000;
const MAX_DOCX_UNKOMPRIMIERT = 50 * 1024 * 1024;
const MAX_DOCX_EINTRAG_UNKOMPRIMIERT = 15 * 1024 * 1024;
const MAX_PDF_SEITEN = 200;
const ZIP_LOCAL_HEADER = 0x04034b50;
const ZIP_CENTRAL_HEADER = 0x02014b50;
const ZIP_END_OF_CENTRAL_DIRECTORY = 0x06054b50;

export class DokumentLimitError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "DokumentLimitError";
  }
}

function typAusDateiname(dateiname: string): DokumentTyp | null {
  const name = dateiname.trim().toLowerCase();
  if (name.endsWith(".pdf")) return "pdf";
  if (name.endsWith(".docx")) return "docx";
  return null;
}

function typAusMimeType(mimeType: string): DokumentTyp | null {
  const mime = mimeType.split(";", 1)[0].trim().toLowerCase();
  if (mime === PDF_MIME) return "pdf";
  if (mime === DOCX_MIME) return "docx";
  return null;
}

function hatDateiendung(dateiname: string): boolean {
  const name = dateiname.trim();
  const letzterSlash = Math.max(name.lastIndexOf("/"), name.lastIndexOf("\\"));
  return name.slice(letzterSlash + 1).includes(".");
}

function hatGueltigeSignatur(buffer: Buffer, typ: DokumentTyp): boolean {
  if (typ === "pdf") {
    return buffer.length >= 5 && buffer.subarray(0, 5).toString("ascii") === "%PDF-";
  }

  if (buffer.length < 4) return false;
  const signatur = buffer.subarray(0, 4);
  return (
    signatur.equals(Buffer.from([0x50, 0x4b, 0x03, 0x04])) ||
    signatur.equals(Buffer.from([0x50, 0x4b, 0x05, 0x06])) ||
    signatur.equals(Buffer.from([0x50, 0x4b, 0x07, 0x08]))
  );
}

function pruefeDocxArchiv(buffer: Buffer): void {
  // Das End-of-central-directory-Feld liegt in den letzten 65.557 Bytes.
  const sucheAb = Math.max(0, buffer.length - 65_557);
  let eocdOffset = -1;
  for (let offset = buffer.length - 22; offset >= sucheAb; offset -= 1) {
    if (
      buffer.readUInt32LE(offset) === ZIP_END_OF_CENTRAL_DIRECTORY &&
      offset + 22 + buffer.readUInt16LE(offset + 20) === buffer.length
    ) {
      eocdOffset = offset;
      break;
    }
  }

  if (eocdOffset < 0) throw new Error("DOCX-Zentralverzeichnis fehlt.");

  const datentraeger = buffer.readUInt16LE(eocdOffset + 4);
  const zentralDatentraeger = buffer.readUInt16LE(eocdOffset + 6);
  const eintraegeAufDatentraeger = buffer.readUInt16LE(eocdOffset + 8);
  const anzahlEintraege = buffer.readUInt16LE(eocdOffset + 10);
  const zentralGroesse = buffer.readUInt32LE(eocdOffset + 12);
  const zentralOffset = buffer.readUInt32LE(eocdOffset + 16);
  if (
    datentraeger !== 0 ||
    zentralDatentraeger !== 0 ||
    eintraegeAufDatentraeger !== anzahlEintraege ||
    anzahlEintraege === 0 ||
    anzahlEintraege === 0xffff ||
    anzahlEintraege > MAX_DOCX_ENTRIES ||
    zentralGroesse === 0xffffffff ||
    zentralOffset === 0xffffffff ||
    zentralOffset + zentralGroesse > buffer.length
  ) {
    throw new Error("DOCX-Archiv ist zu groß oder ungültig.");
  }

  let offset = zentralOffset;
  let unkomprimierteGroesse = 0;
  let hatContentTypes = false;
  let hatDokumentXml = false;
  const dateinamen = new Set<string>();

  for (let index = 0; index < anzahlEintraege; index += 1) {
    if (offset + 46 > buffer.length || buffer.readUInt32LE(offset) !== ZIP_CENTRAL_HEADER) {
      throw new Error("DOCX-Zentralverzeichnis ist beschädigt.");
    }

    const flags = buffer.readUInt16LE(offset + 8);
    const kompressionsmethode = buffer.readUInt16LE(offset + 10);
    const komprimierteGroesse = buffer.readUInt32LE(offset + 20);
    const dateiGroesse = buffer.readUInt32LE(offset + 24);
    const nameLaenge = buffer.readUInt16LE(offset + 28);
    const extraLaenge = buffer.readUInt16LE(offset + 30);
    const kommentarLaenge = buffer.readUInt16LE(offset + 32);
    const lokalerHeaderOffset = buffer.readUInt32LE(offset + 42);
    const naechsterOffset = offset + 46 + nameLaenge + extraLaenge + kommentarLaenge;

    if (
      (flags & 0x1) !== 0 ||
      ![0, 8].includes(kompressionsmethode) ||
      komprimierteGroesse === 0xffffffff ||
      dateiGroesse === 0xffffffff ||
      dateiGroesse > MAX_DOCX_EINTRAG_UNKOMPRIMIERT ||
      lokalerHeaderOffset === 0xffffffff ||
      naechsterOffset > buffer.length
    ) {
      throw new Error("Verschlüsselte oder übergroße DOCX-Datei wird nicht unterstützt.");
    }

    unkomprimierteGroesse += dateiGroesse;
    if (unkomprimierteGroesse > MAX_DOCX_UNKOMPRIMIERT) {
      throw new Error("DOCX-Datei ist entpackt zu groß.");
    }

    const name = buffer.subarray(offset + 46, offset + 46 + nameLaenge).toString("utf8");
    if (dateinamen.has(name)) {
      throw new Error("DOCX-Archiv enthält mehrdeutige Dateieinträge.");
    }
    dateinamen.add(name);
    if (
      lokalerHeaderOffset + 30 > buffer.length ||
      buffer.readUInt32LE(lokalerHeaderOffset) !== ZIP_LOCAL_HEADER
    ) {
      throw new Error("DOCX-Dateieintrag ist beschädigt.");
    }

    const lokaleFlags = buffer.readUInt16LE(lokalerHeaderOffset + 6);
    const lokaleKompressionsmethode = buffer.readUInt16LE(lokalerHeaderOffset + 8);
    const lokaleNameLaenge = buffer.readUInt16LE(lokalerHeaderOffset + 26);
    const lokaleExtraLaenge = buffer.readUInt16LE(lokalerHeaderOffset + 28);
    const datenStart =
      lokalerHeaderOffset + 30 + lokaleNameLaenge + lokaleExtraLaenge;
    const datenEnde = datenStart + komprimierteGroesse;
    const lokalerName = buffer
      .subarray(lokalerHeaderOffset + 30, lokalerHeaderOffset + 30 + lokaleNameLaenge)
      .toString("utf8");

    if (
      (lokaleFlags & 0x1) !== 0 ||
      lokaleKompressionsmethode !== kompressionsmethode ||
      lokalerName !== name ||
      datenEnde > zentralOffset ||
      datenEnde > buffer.length
    ) {
      throw new Error("DOCX-Dateieintrag ist widersprüchlich oder beschädigt.");
    }

    const komprimierteDaten = buffer.subarray(datenStart, datenEnde);
    let tatsaechlicheGroesse: number;
    try {
      tatsaechlicheGroesse =
        kompressionsmethode === 0
          ? komprimierteDaten.length
          : inflateRawSync(komprimierteDaten, {
              maxOutputLength: dateiGroesse + 1,
            }).length;
    } catch {
      throw new DokumentLimitError(
        "DOCX-Datei überschreitet beim Entpacken das zulässige Größenlimit.",
      );
    }

    if (tatsaechlicheGroesse !== dateiGroesse) {
      throw new Error("DOCX-Dateigröße stimmt nicht mit dem Archiv überein.");
    }

    if (name === "[Content_Types].xml") hatContentTypes = true;
    if (name === "word/document.xml") hatDokumentXml = true;
    offset = naechsterOffset;
  }

  if (
    offset !== zentralOffset + zentralGroesse ||
    zentralOffset + zentralGroesse !== eocdOffset
  ) {
    throw new Error("DOCX-Zentralverzeichnis enthält ungeprüfte Dateieinträge.");
  }

  if (!hatContentTypes || !hatDokumentXml) {
    throw new Error("Die ZIP-Datei ist kein gültiges Word-Dokument.");
  }
}

export function erkenneDokumentTyp(
  mimeType: string,
  dateiname: string,
): DokumentTyp | null {
  const typAusName = typAusDateiname(dateiname);
  const typAusMime = typAusMimeType(mimeType);
  const normalisierterMime = mimeType.split(";", 1)[0].trim().toLowerCase();

  if (typAusName && typAusMime && typAusName !== typAusMime) return null;
  if (typAusName && !typAusMime && !GENERISCHE_MIME_TYPES.has(normalisierterMime)) {
    return null;
  }
  if (!typAusName && hatDateiendung(dateiname)) return null;

  return typAusName ?? typAusMime;
}

export async function extrahiereText(
  buffer: Buffer,
  typ: DokumentTyp,
): Promise<string> {
  if (!hatGueltigeSignatur(buffer, typ)) {
    throw new Error(`Die Datei besitzt keine gültige ${typ.toUpperCase()}-Signatur.`);
  }

  if (typ === "docx") {
    pruefeDocxArchiv(buffer);
    const result = await mammoth.extractRawText({ buffer });
    return result.value;
  }

  const pdf = await getDocumentProxy(new Uint8Array(buffer));
  try {
    if (pdf.numPages > MAX_PDF_SEITEN) {
      throw new DokumentLimitError(
        `PDF-Dateien dürfen maximal ${MAX_PDF_SEITEN} Seiten enthalten.`,
      );
    }

    const { text } = await extractText(pdf, { mergePages: true });
    return text;
  } finally {
    await pdf.destroy().catch(() => undefined);
  }
}
