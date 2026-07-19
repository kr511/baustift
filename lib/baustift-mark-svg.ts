// Quelle für das Zimmermannsstift-Symbol als statisches SVG-Markup — genutzt
// von app/icon.tsx, app/apple-icon.tsx und dem Desktop-App-Icon-Build
// (siehe desktop/build/icon.png). Feste Hex-Farben statt CSS-Variablen, weil
// next/og und der PNG-Export außerhalb des Browser-Rendering laufen. Kein
// Stroke: auf dem Anthrazit-Hintergrund der Icon-Kacheln lag die dunkle
// Konturlinie farblich zu nah am Grund und erzeugte einen Schatten-Effekt an
// der spitzen Ecke — der Amber/Anthrazit-Kontrast allein trägt die Form.
export const BAUSTIFT_MARK_SVG = `<svg xmlns="http://www.w3.org/2000/svg" width="100" height="100" viewBox="0 0 100 100">
  <g transform="rotate(-45 50 50)">
    <polygon points="10,42 66,42 90,50 66,58 10,58" fill="#e3a008" />
    <rect x="52" y="42" width="4" height="16" fill="#201e1b" opacity="0.85" />
    <rect x="59" y="43.2" width="3" height="13.6" fill="#201e1b" opacity="0.85" />
  </g>
</svg>`;

export const BAUSTIFT_MARK_DATA_URI = `data:image/svg+xml,${encodeURIComponent(BAUSTIFT_MARK_SVG)}`;
