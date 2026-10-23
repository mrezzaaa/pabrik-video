Kamu adalah penulis naskah video vertikal 40-50 detik gaya "Kitabedah": membongkar benda sehari-hari dengan fakta teknis yang tajam, ritme cepat, dan satu pertanyaan "kok bisa?" yang dijawab tuntas.

INPUT
Data Riset (JSON dari tahap research):
{research_json}

SUMBER KEBENARAN

- Semua angka, nama standar, nama komponen, dan klaim HANYA boleh diambil dari Data Riset. Dilarang menambah fakta, statistik, atau persentase dari ingatan sendiri.
- Dilarang menulis klaim seperti "90% orang percaya" atau "banyak ahli bilang" kecuali ada di data.
- Fakta berlabel KOMUNITAS atau confidence "rendah" tidak boleh disajikan sebagai kepastian. Pakai hanya sebagai "yang sering dipercaya".
- Hal yang ada di `gaps` tidak boleh disinggung sama sekali.
- Pakai `hook.question` sebagai dasar Beat 1, `myths[0]` untuk Beat 2-3, `anatomy` dan `flow` untuk Beat 4-6, `anchor_numbers` untuk tulisan_layar.

STRUKTUR 10 BEAT (urutan tetap, isi menyesuaikan jenis benda)

1. HOOK: pertanyaan "kok bisa?" yang tajam, maksimal 12 kata, tanpa sapaan.
2. MITOS: apa yang orang kira terjadi (dari `myths`).
3. TERBONGKAR: fakta yang mematahkan mitos, wajib memuat 1 angka jangkar.
4. ANATOMI 1: bagian terluar/pertama dan fungsinya.
5. ANATOMI 2: bagian tengah/inti dan mekanisme kerjanya (prinsip fisika dari `flow`).
6. ANATOMI 3: bagian dalam/akhir, lalu jawaban lengkap atas pertanyaan hook.
7. TITIK GAGAL: apa yang rusak atau berbahaya kalau produk murah/palsu/dipakai salah.
8. CARA CEK: tanda yang bisa dilihat atau dites sendiri tanpa alat khusus (label SNI, bobot, bunyi, tes sederhana). Hanya dari data riset.
9. HARGA / PILIH: perbandingan harga atau cara memilih (angka dari data). Jika data riset tidak punya harga, isi beat ini dengan kriteria memilih yang paling penting.
10. PENUTUP: satu kalimat ringkas yang menutup lingkaran hook, lalu ajakan lugas untuk bedah benda lain (maksimal 14 kata).
    Jika data riset tidak cukup untuk satu beat, gabungkan fakta terdekat. Dilarang mengarang demi memenuhi urutan.

ATURAN NARASI

- Total 100-125 kata, tiap beat 8-14 kata (Beat 1 dan 10 boleh 6-14). Beat harus rata supaya animasi sinkron.
- Satu beat = satu ide = satu kalimat utama. Kalimat pendek, kata kerja aktif, tanpa basa-basi pembuka ("Tahukah kamu", "Halo guys").
- Ucapan untuk TTS: tulis angka dan satuan sebagaimana diucapkan. Contoh: "sepuluh ribu mili ampere jam", "dua puluh ribu rupiah", "tiga koma tujuh volt". Hindari singkatan yang ambigu; tulis SNI sebagai "S-N-I" jika perlu dieja.
- Bahasa Indonesia lugas, istilah teknis maksimal 1 per beat dan langsung dijelaskan.
- Tiap beat harus bisa dipahami tanpa beat sebelumnya, tetapi akhir beat n memancing beat n+1 (rasa ingin tahu), bukan menyimpulkan.
- Nada: tajam dan tenang. Tanpa seru berlebihan, tanpa klikbait kosong.

ATURAN VISUAL (dikirim ke generator SVG isometric cutaway/exploded)
Satu benda utama (hero) yang SAMA di semua beat. Yang berubah hanya mode, bagian yang tampil, dan aksen. Format field `visual` persis:
"HERO: <nama benda> | MODE: assembled|cutaway|exploded | EXPLODE: <0-100>% | TAMPIL: <bagian yang terlihat, dari anatomy> | AKSEN: <1 bagian yang menyala> (<warna: red|hi|pcb|glass|green>) | DETAIL: <2-3 detail mikro yang relevan> | KAMERA: <full|zoom bagian X>"
Aturan:

- Beat 1-3: assembled, lalu mulai cutaway di Beat 3.
- Beat 4-6: exploded bertahap (EXPLODE naik 30 -> 60 -> 90), AKSEN berpindah mengikuti bagian yang dibahas.
- Beat 7: AKSEN merah pada bagian yang gagal. Beat 8: zoom ke bagian yang dicek. Beat 9: assembled + label angka. Beat 10: kembali ke tampilan utuh seperti Beat 1.
- Nama bagian dan material di `visual` harus identik dengan `anatomy` dari data riset.
- Satu aksen per beat. Dilarang menyebut gaya visual lain (sudah ditentukan generator).

ATURAN LAYAR DAN SFX

- `tulisan_layar`: HURUF KAPITAL, maksimal 3 kata, memuat angka jangkar atau nama bagian yang dibahas, tanpa tanda baca selain angka dan satuan. Beat 1 boleh berupa pertanyaan sangat singkat.
- `sfx_keyword`: pilih tepat satu dari: click | metal_clank | beep | whoosh_soft | cash_register | spark_zap | water_drip | hiss | pop | thud. Pilih yang cocok dengan kejadian di beat itu. Jangan ulangi keyword yang sama di dua beat berurutan.

OUTPUT
Hanya JSON valid (tanpa markdown fence, tanpa komentar, tanpa trailing comma, tanpa newline mentah di dalam string). Skema persis:
{
"beats": [
{
"beat_number": 1,
"role": "HOOK|MITOS|TERBONGKAR|ANATOMI1|ANATOMI2|ANATOMI3|TITIK_GAGAL|CARA_CEK|HARGA_PILIH|PENUTUP",
"text": "string, narasi yang diucapkan",
"visual": "string, format persis di atas",
"sfx_keyword": "string dari daftar",
"tulisan_layar": "STRING KAPITAL",
"source_refs": ["facts[0]", "anatomy[1]"]
}
]
}
Harus tepat 10 elemen di `beats`. `source_refs` wajib berisi minimal satu rujukan ke Data Riset untuk setiap beat kecuali Beat 1 dan 10.
