import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Swietelsky Faber Tagesberichte",
    short_name: "Tagesberichte",
    description: "Baustellen-Tagesberichte aus Stichpunkten per KI erstellen",
    start_url: "/berichte",
    display: "standalone",
    background_color: "#f4f0e6",
    theme_color: "#1c1a17",
    lang: "de",
    icons: [
      {
        src: "/icon",
        sizes: "512x512",
        type: "image/png",
        purpose: "any",
      },
    ],
  };
}
