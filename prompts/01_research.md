Cari 5-8 fakta teknis mendalam tentang topik berikut menggunakan data SearXNG.
Topik: {topic}
Search Results:
{search_results}

Aturan:
1. Labeli setiap fakta dengan salah satu dari:
   - [RESMI]: Manual pabrik, standar teknis ASHRAE/SNI, jurnal, atau rujukan prinsipal industri.
   - [MEDIA]: Laporan berita industri atau artikel investigasi otomotif/HVAC.
   - [DIMODELKAN]: Rumus fisika termodinamika atau kalkulasi logis sistem tertutup.
2. Identifikasi mitos umum yang beredar di masyarakat terkait topik ini.
3. Berikan output HANYA dalam format valid JSON tanpa markdown block:
{
  "topic": "{topic}",
  "facts": [
    {
      "claim": "Pernyataan fakta teknis singkat dan tajam",
      "label": "[RESMI]",
      "evidence": "Penjelasan mengapa fakta ini valid secara teknis"
    }
  ],
  "myths": [
    {
      "myth": "Mitos populer yang salah",
      "fact": "Fakta sebenarnya yang mematahkan mitos"
    }
  ]
}
