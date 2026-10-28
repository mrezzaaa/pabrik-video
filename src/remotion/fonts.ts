import { staticFile } from "remotion";

if (typeof document !== "undefined") {
  const existing = document.getElementById("pabrik-local-fonts");
  if (!existing) {
    const fontStyle = document.createElement("style");
    fontStyle.id = "pabrik-local-fonts";
    fontStyle.innerHTML = `
      @font-face {
        font-family: 'Anton';
        src: url('${staticFile("fonts/Anton-Regular.ttf")}') format('truetype');
        font-weight: 400;
        font-style: normal;
        font-display: swap;
      }
    `;
    document.head.appendChild(fontStyle);
  }
}

export const ANTON_FAMILY = "'Anton', Impact, 'Arial Black', sans-serif";

