// Secret-Scanner: bricht ab, wenn getrackte Dateien echte Zugangsdaten enthalten.
// Verhindert die häufigste reale Breach-Ursache (versehentlich committete
// Credentials) — ohne externe Abhängigkeit, nur Node + git.
//
// Es werden bewusst nur *Wert*-Muster erkannt (echte Key-/Token-Formate),
// keine bloßen Bezeichner wie "service_role", um Fehlalarme zu vermeiden.

import { execFileSync } from "node:child_process";
import { pathToFileURL } from "node:url";

export const SECRET_MUSTER = [
  { name: "Anthropic API-Key", re: /sk-ant-[A-Za-z0-9_-]{20,}/ },
  { name: "Supabase Secret-Key", re: /sb_secret_[A-Za-z0-9_-]{10,}/ },
  {
    name: "JWT (z. B. service_role-Key)",
    re: /eyJ[A-Za-z0-9_-]{8,}\.eyJ[A-Za-z0-9_-]{8,}\.[A-Za-z0-9_-]{8,}/,
  },
  {
    name: "Privater Schlüssel (PEM)",
    re: /-----BEGIN (?:RSA |EC |OPENSSH |DSA |PGP )?PRIVATE KEY-----/,
  },
  { name: "AWS Access Key", re: /AKIA[0-9A-Z]{16}/ },
  { name: "GitHub Token", re: /gh[pousr]_[A-Za-z0-9]{36,}/ },
  { name: "Slack Token", re: /xox[baprs]-[A-Za-z0-9-]{10,}/ },
];

// Dateien, die legitime Platzhalter/Muster enthalten und nie echte Secrets:
// die Vorlage, der Lockfile und Scanner + Test selbst (enthalten die Muster
// bzw. Beispiel-Tokens als Code/Testdaten).
export const IGNORIERTE_DATEIEN = new Set([
  ".env.example",
  "package-lock.json",
  "scripts/secret-scan.mjs",
  "scripts/secret-scan.test.ts",
]);

/**
 * Reine Prüffunktion: durchsucht {pfad, inhalt}-Paare nach Secret-Mustern.
 * Getrennt vom git-/Datei-Zugriff, damit sie testbar ist.
 */
export function findeSecrets(dateien) {
  const treffer = [];
  for (const { pfad, inhalt } of dateien) {
    const zeilen = inhalt.split("\n");
    zeilen.forEach((zeile, index) => {
      for (const muster of SECRET_MUSTER) {
        if (muster.re.test(zeile)) {
          treffer.push({ pfad, zeile: index + 1, typ: muster.name });
        }
      }
    });
  }
  return treffer;
}

// Binär-Heuristik: ein Null-Byte kommt in Textdateien nicht vor. So werden
// Bilder/PDFs/Fonts übersprungen, ohne ihren Inhalt zu durchsuchen.
function istBinaer(inhalt) {
  return inhalt.includes("\0");
}

function getrackteTextdateien() {
  const dateien = execFileSync("git", ["ls-files"], { encoding: "utf8" })
    .split("\n")
    .filter(Boolean)
    .filter((pfad) => !IGNORIERTE_DATEIEN.has(pfad));

  const ergebnis = [];
  for (const pfad of dateien) {
    let inhalt;
    try {
      inhalt = execFileSync("git", ["show", `:${pfad}`], {
        encoding: "utf8",
        maxBuffer: 20 * 1024 * 1024,
      });
    } catch {
      continue; // nicht lesbar → überspringen
    }
    if (istBinaer(inhalt)) continue;
    ergebnis.push({ pfad, inhalt });
  }
  return ergebnis;
}

function main() {
  const treffer = findeSecrets(getrackteTextdateien());
  if (treffer.length === 0) {
    console.log("Secret-Scan: keine Zugangsdaten in getrackten Dateien gefunden.");
    return;
  }
  console.error("Secret-Scan FEHLGESCHLAGEN — mögliche Zugangsdaten gefunden:");
  for (const t of treffer) {
    console.error(`  ${t.pfad}:${t.zeile}  (${t.typ})`);
  }
  console.error(
    "\nBitte den Wert entfernen, den Schlüssel rotieren und über Umgebungsvariablen laden.",
  );
  process.exit(1);
}

// Nur ausführen, wenn direkt als Skript gestartet (nicht beim Import im Test).
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main();
}
