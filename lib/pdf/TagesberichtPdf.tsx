import { Document, Page, View, Text, Image, StyleSheet } from "@react-pdf/renderer";
import { formatDatum } from "@/lib/format";
import type { TagesberichtVollstaendig } from "@/lib/data/tagesberichte";

// Eingebettete Fotos, bereits als Buffer geladen (siehe renderTagesberichtPdf.ts).
// HEIC/WebP kann react-pdf nicht rendern — solche Fotos landen als
// Hinweiszeile statt als Bild (`embeddable: false`).
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
    gap: 24,
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: "#d8d2c4",
    paddingVertical: 10,
    marginBottom: 14,
  },
  metaItem: { flexDirection: "column" },
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

export function TagesberichtPdf({
  bericht,
  firmaWordmark,
  fotos,
}: {
  bericht: TagesberichtVollstaendig;
  firmaWordmark: string | null;
  fotos: PdfFoto[];
}) {
  return (
    <Document>
      <Page size="A4" style={styles.page}>
        <View style={styles.header}>
          <View>
            <Text style={styles.wordmark}>{firmaWordmark ?? "BAUSTIFT"}</Text>
            <Text style={styles.labelTag}>Bautagesbericht</Text>
          </View>
          <Text>{formatDatum(bericht.datum)}</Text>
        </View>

        <Text style={styles.h1}>
          {bericht.baustelle?.name ?? "Unbekannte Baustelle"}
        </Text>

        <View style={styles.metaRow}>
          <View style={styles.metaItem}>
            <Text style={styles.labelTag}>Wetter</Text>
            <Text>{bericht.wetter}</Text>
          </View>
          <View style={styles.metaItem}>
            <Text style={styles.labelTag}>Status</Text>
            <Text>{bericht.status === "final" ? "Final" : "Entwurf"}</Text>
          </View>
          {bericht.created_by && (
            <View style={styles.metaItem}>
              <Text style={styles.labelTag}>Erstellt von</Text>
              <Text>{bericht.created_by}</Text>
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
              {bericht.personal.map((p, i) => (
                <View key={i} style={styles.tableRow}>
                  <Text style={styles.col1}>{p.name}</Text>
                  <Text style={styles.col2}>{p.stunden}</Text>
                  <Text style={styles.col3}>{p.taetigkeit ?? "–"}</Text>
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
              {bericht.material.map((m, i) => (
                <View key={i} style={styles.tableRow}>
                  <Text style={styles.col1}>
                    {m.typ === "geraet" ? "Gerät" : "Material"}
                  </Text>
                  <Text style={styles.col2}>{m.bezeichnung}</Text>
                  <Text style={styles.col3}>{m.menge ?? "–"}</Text>
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
              {fotos.map((foto, i) =>
                foto.embeddable && foto.data ? (
                  // react-pdf's Image hat kein alt-Prop (kein DOM-<img>).
                  // eslint-disable-next-line jsx-a11y/alt-text
                  <Image
                    key={i}
                    style={styles.foto}
                    src={{
                      data: foto.data,
                      format: foto.format ?? "jpg",
                    }}
                  />
                ) : (
                  <View key={i} style={styles.fotoPlatzhalter}>
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
