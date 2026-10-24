# tech3d: prototipe gaya gambar teknik (Real Engineering)

Preview: `npm run studio`, lalu pilih composition **TechDemo**.

Render satu frame: `npx remotion still src/remotion/index.ts TechDemo out.png --frame=170`

- `spec.ts`: skema scene (parts, timeline, callouts) + `DEMO_SPEC` (mesin pembakaran).
  Ini yang nanti diisi oleh LLM director, bukan kode 3D.
- `materials.ts`: shader X-ray (Fresnel), garis blueprint (LineSegments2), wireframe, library geometri part.
- `TechScene.tsx`: komposisi: sweep wireframe -> blueprint, cross-section (clipping plane), exploded view, callout + leader line.

Catatan: render headless butuh WebGL. Pakai `--gl=angle` atau `--gl=swiftshader`.
Cross-section belum punya "cap" (permukaan potongan solid); interior terbaca lewat shader X-ray.
