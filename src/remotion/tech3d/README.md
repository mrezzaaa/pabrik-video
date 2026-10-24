# tech3d: video gambar teknik 3D (gaya Real Engineering, versi Shorts)

## Cara kerja
Satu objek 3D (assembly) tetap di layar sepanjang video. Tiap beat narasi hanya mengubah
KONDISI objek: wireframe/blueprint, exploded, cross-section, sorotan part, callout.
LLM tidak menulis kode 3D; ia memilih assembly dari katalog dan mengisi beat.

```
topik -> SearXNG -> director LLM (pilih assembly + beat) -> TTS per beat
      -> compileBeatsToSpec (beat -> keyframe) -> Remotion "TechVideo" (WebGL) -> MP4
```

## File
- `types.ts`: tipe murni (aman dipakai worker Node dan bundle Remotion).
- `assemblies.ts`: KATALOG assembly (`piston_engine`, `jet_turbofan`, `li_ion_cell`). Tiap part punya id, nama Indonesia, dan fungsi (dibaca LLM supaya narasi akurat).
- `spec.ts`: matematika keyframe, bounding box, auto-framing kamera.
- `materials.ts`: shader X-ray (Fresnel), garis blueprint, wireframe, geometri part.
- `TechScene.tsx`: scene 3D + callout + HUD.
- `../TechVideo.tsx`: komposisi final (scene + audio + subtitle per beat).
- `../../lib/tech-storyboard.ts`: skema validasi output LLM + compiler beat -> keyframe.

## Menambah assembly baru
1. Tambah objek `AssemblyDef` di `assemblies.ts` lalu daftarkan di `ASSEMBLIES`.
   Kind part yang ada: `cylinder`, `tube`, `box`, `gear`, `cone` (sumbu Y; `axis: "x" | "z"` untuk memutar).
2. `npm run check:tech` (cek geometri + skema + prompt otomatis ikut katalog).
3. Cek visual di Studio dengan props contoh (lihat `makeSampleProps` di `tech-storyboard.ts`).
Prompt director dibangun otomatis dari katalog, tidak perlu diedit.

## Perintah
- `npm run studio` lalu pilih **TechVideo** (props contoh: mesin piston, tanpa audio).
- `npm run check:tech`: pengecekan offline (tanpa LLM/TTS/Docker).
- Satu frame: `npx remotion still src/remotion/index.ts TechVideo out.png --frame=400`
- Env: `PIPELINE_STYLE=tech|classic`, `REMOTION_GL=swiftshader|angle|swangle`.

## Batasan yang diketahui
- Topik di luar katalog gagal dengan pesan jelas (director membalas `NONE`), bukan memaksa assembly yang salah.
- Cross-section belum punya "cap" (permukaan potongan solid); interior terbaca lewat shader X-ray.
- Render headless butuh WebGL; di container tanpa GPU pakai `swiftshader` (lebih lambat dari foto).
