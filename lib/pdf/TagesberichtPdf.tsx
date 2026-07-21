import { Document, Page, View, Text, Image, StyleSheet } from "@react-pdf/renderer";
import { formatDatum } from "@/lib/format";
import type { TagesberichtVollstaendig } from "@/lib/data/tagesberichte";

export interface PdfFoto {
  dateiname: string;
  embeddable: boolean;
  data?: Buffer;
  format?: "jpg" | "png";
}

const styles = StyleSheet.create({
  page: {
    padding: 40,
    fontSize: 10,
    fontFamily: "Helvetica",
    color: "#1c1a17",
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-end",
    borderBottomWidth: 2,
    borderBottomColor: "#1c1a17",
    paddingBottom: 10,
    marginBottom: 14,
  },
  wordmark: { fontSize: 14, fontWeight: 700 },
  labelTag: { fontSize: 8, textTransform: "uppercase", letterSpacing: 1, color: "#56514a" },
  h1: { fontSize: 20, fontWeight: 700, marginBottom: 12 },
  metaRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 18,
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: "#d8d2c4",
    paddingVertical: 10,
    marginBottom: 14,
  },
  metaItem: { flexDirection: "column" },
  versionHinweis: {
    borderWidth: 1,
    borderColor: "#9a6700",
    backgroundColor: "#fff8df",
    padding: 8,
    marginBottom: 14,
  },
  section: { marginBottom: 14 },
  table: { marginTop: 4 },
  tableHeaderRow: {
    flexDirection: "row",
    borderBottomWidth: 2,
    borderBottomColor: "#1c1a17",
    paddingBottom: 3,
    marginBottom: 3,
  },
  tableRow: {
    flexDirection: "row",
    borderBottomWidth: 1,
    borderBottomColor: "#d8d2c4",
    paddingVertical: 3,
  },
  col1: { width: "40%" },
  col2: { width: "25%" },
  col3: { width: "35%" },
  berichtText: { fontSize: 10, lineHeight: 1.5 },
  fotoGrid: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginTop: 4 },
  foto: { width: 150, height: 150, objectFit: "cover" },
  fotoPlatzhalter: {
    width: 150,
    height: 150,
    borderWidth: 1,
    borderColor: "#d8d2c4",
    alignItems: "center",
    justifyContent: "center",
    padding: 6,
  },
});

function statusLabel(status: TagesberichtVollstaendig["status"]) {
  if (status === "final") return "Finalisiert";
  if (status === "geprueft") return "Geprüft";
  if (status === "generiert") return "Text erstellt";
  return "Entwurf";
}

function zeitpunkt(value: string) {
  return new Intl.DateTimeFormat("de-DE", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "Europe/Berlin",
  }).format(new Date(value));
}

export function TagesberichtPdf({
  bericht,
  firmaWordmark,
  fotos,
}: {
  bericht: TagesberichtVollstaendig;
  firmaWordmark: string | null;
  fotos: PdfFoto[];
}) {
  const version = bericht.angezeigte_version ??
    (bericht.status === "final" ? bericht.aktuelle_version : 0);

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        <View style={styles.header}>
          <View>
            <Text style={styles.wordmark}>{firmaWordmark ?? "BAUSTIFT"}</Text>
            <Text style={styles.labelTag}>Bautagesbericht</Text>
          </View>
          <View style={{ alignItems: "flex-end" }}>
            <Text>{formatDatum(bericht.datum)}</Text>
            {version > 0 && <Text style={styles.labelTag}>Version {version}</Text>}
          </View>
        </View>

        <Text style={styles.h1}>
          {bericht.baustelle?.name ?? "Unbekannte Baustelle"}
        </Text>

        {bericht.versionsgrund && (
          <View style={styles.versionHinweis}>
            <Text style={styles.labelTag}>Korrektur-/Versionsgrund</Text>
            <Text>{bericht.versionsgrund}</Text>
          </View>
        )}

        <View style={styles.metaRow}>
          <View style={styles.metaItem}>
            <Text style={styles.labelTag}>Wetter</Text>
            <Text>{bericht.wetter}</Text>
          </View>
          <View style={styles.metaItem}>
            <Text style={styles.labelTag}>Status</Text>
            <Text>{statusLabel(bericht.status)}</Text>
          </View>
          {bericht.created_by && (
            <View style={styles.metaItem}>
              <Text style={styles.labelTag}>Erstellt von</Text>
              <Text>{bericht.created_by}</Text>
            </View>
          )}
          {bericht.finalisiert_am && (
            <View style={styles.metaItem}>
              <Text style={styles.labelTag}>Finalisiert am</Text>
              <Text>{zeitpunkt(bericht.finalisiert_am)}</Text>
            </View>
          )}
          {bericht.finalisiert_von && (
            <View style={styles.metaItem}>
              <Text style={styles.labelTag}>Finalisiert durch</Text>
              <Text>{bericht.finalisiert_von}</Text>
            </View>
          )}
        </View>

        {bericht.personal.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.labelTag}>Personal &amp; Stunden</Text>
            <View style={styles.table}>
              <View style={styles.tableHeaderRow}>
                <Text style={[styles.labelTag, styles.col1]}>Name</Text>
                <Text style={[styles.labelTag, styles.col2]}>Stunden</Text>
                <Text style={[styles.labelTag, styles.col3]}>Tätigkeit</Text>
              </View>
              {bericht.personal.map((person, index) => (
                <View key={index} style={styles.tableRow}>
                  <Text style={styles.col1}>{person.name}</Text>
                  <Text style={styles.col2}>{person.stunden}</Text>
                  <Text style={styles.col3}>{person.taetigkeit ?? "–"}</Text>
                </View>
              ))}
            </View>
          </View>
        )}

        {bericht.material.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.labelTag}>Material &amp; Geräte</Text>
            <View style={styles.table}>
              <View style={styles.tableHeaderRow}>
                <Text style={[styles.labelTag, styles.col1]}>Typ</Text>
                <Text style={[styles.labelTag, styles.col2]}>Bezeichnung</Text>
                <Text style={[styles.labelTag, styles.col3]}>Menge</Text>
              </View>
              {bericht.material.map((eintrag, index) => (
                <View key={index} style={styles.tableRow}>
                  <Text style={styles.col1}>
                    {eintrag.typ === "geraet" ? "Gerät" : "Material"}
                  </Text>
                  <Text style={styles.col2}>{eintrag.bezeichnung}</Text>
                  <Text style={styles.col3}>{eintrag.menge ?? "–"}</Text>
                </View>
              ))}
            </View>
          </View>
        )}

        <View style={styles.section}>
          <Text style={styles.labelTag}>Bericht</Text>
          <Text style={[styles.berichtText, { marginTop: 4 }]}>
            {bericht.bericht_text ?? bericht.stichpunkte}
          </Text>
        </View>

        {fotos.length > 0 && (
          <View style={styles.section} wrap={false}>
            <Text style={styles.labelTag}>Fotos</Text>
            <View style={styles.fotoGrid}>
              {fotos.map((foto, index) =>
                foto.embeddable && foto.data ? (
                  // eslint-disable-next-line jsx-a11y/alt-text
                  <Image
                    key={index}
                    style={styles.foto}
                    src={{
                      data: foto.data,
                      format: foto.format ?? "jpg",
                    }}
                  />
                ) : (
                  <View key={index} style={styles.fotoPlatzhalter}>
                    <Text style={{ fontSize: 8, textAlign: "center" }}>
                      Foto &bdquo;{foto.dateiname}&ldquo; — Format in PDF
                      nicht darstellbar, siehe Online-Ansicht.
                    </Text>
                  </View>
                ),
              )}
            </View>
          </View>
        )}
      </Page>
    </Document>
  );
}
