import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Baustift",
    short_name: "Baustift",
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
