---
name: reels-visual-engineering
description: Panduan visual Reels bergaya sains/engineering (blueprint teknis, potongan, urutan proses). Memetakan jenis klaim ke tipe visual, aturan label, ritme pergantian visual, dan perlakuan scene hook serta CTA.
---

# Visual engineering (blueprint)

Penonton harus merasa sedang melihat bagian dalam benda itu. Visual menjelaskan, bukan menghias.

## Klaim -> visual
| Isi kalimat | Visual |
|---|---|
| bentuk utuh objek, pembedahan bagian dalam, komponen spesifik | ISO_ASSEMBLY (cutaway / exploded view + fokus bagian) |
| aliran fisika, arus listrik/udara/cairan, mekanisme kerja | MECHANISM_FLOW (partikel mengalir melewati bagian + tahap aktif) |
| spesifikasi teknis, rancangan struktur, perbandingan dimensi | BLUEPRINT (garis kerja teknis + dimensi + callout bernomor) |
| bagian, lapisan, komponen dari luar ke dalam | SVG_CROSSSECTION (3-5 lapisan luar ke dalam) |
| urutan sebab-akibat, tahap proses | SVG_TIMELINE (3-4 langkah) |
| angka teknis tunggal (suhu, tekanan, kecepatan, ukuran) | SVG_COUNTER atau SVG_GAUGE |
| perbandingan dua sampai tiga angka | SVG_BAR_CHART |
| bukti tampilan nyata komponen (maksimal 25% scene) | B_ROLL_IMAGE: foto komponen nyata, close-up mesin |

## Aturan
- Satu klaim = satu visual. Label 1-2 kata, huruf besar, dan harus istilah yang ada di kalimat atau fakta. Jangan mengarang nama komponen.
- Ganti visual maksimal tiap 2.5 detik. Jangan dua grafik identik berurutan; selingi foto atau diagram komponen.
- imageSearchQuery bahasa Inggris dan menyebut objek teknis secara spesifik ("turbofan engine cutaway diagram"). Hindari topik tetangga (lihat avoidTerms).
- Nada warna dingin: cyan, biru, hijau teknis. Merah hanya untuk bahaya atau kegagalan.
- Scene hook: pakai visual paling spesifik dan "wow": cutaway objek utama atau angka skala. Bukan label abstrak.
- Scene CTA: foto atau diagram objek utama, tanpa grafik data dan tanpa stempel.

## Cek akhir
- Setiap label ada di narasi atau fakta.
- Tidak ada dua data-grafis identik berurutan.
- Gambar sesuai objek topik, bukan benda mirip.
