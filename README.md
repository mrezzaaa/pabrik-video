# PABRIK VIDEO (AUTOMATED VIDEO FACTORY)

Platform otomatisasi produksi video eksplanatori bergaya **kitabedah.id** (vektor isometrik 3D, telemetri HUD dirgantara/industri real-time, dan pop-up callout dinamis) berbasis **Next.js 16**, **BullMQ FlowProducer (DAG)**, **Omniroute OpenAI Gateway**, **UnlimitedTTS (id-ID, Ethan, 1.1x)**, dan **Remotion 60fps**.

## Arsitektur 5 Sub-Agent (BullMQ FlowProducer DAG)

1. **Agent 1: Orchestrator & Topic Deconstructor (`src/workers/deconstructor.worker.ts`)**
   - Membedah topik mentah menjadi 5 fase ilmiah/rekayasa (`HOOK`, `CORE_MECHANISM`, `COMPONENT_BREAKDOWN`, `TELEMETRY_DATA`, `SUMMARY`) beserta komponen material dan rumus fisika utama.
2. **Agent 2: Script & Telemetry Architect (`src/workers/scriptwriter.worker.ts`)**
   - Menulis naskah narasi Bahasa Indonesia bergaya *bedah mekanisme*, mendefinisikan kanal telemetri HUD (`°C`, `mPa`/`Bar`, `W/m²K`, `%`), serta memetakan titik *pop-up callout*.
3. **Agent 3: TTS & Audio Timing Synchronizer (`src/workers/tts.worker.ts`)**
   - Menyintesis segmen suara melalui `unlimitedtts.com` (`Language: id-ID`, `Voice: Ethan`, `Speed: 1.1x`), menyimpan file `.mp3` ke `/public/renders/[jobId]/audio/`, serta mengekstrak durasi presisi via `ffprobe` untuk kalkulasi frame Remotion (`durationInFrames = Math.ceil(audioDurationInSeconds * 60)`).
4. **Agent 4: Isometric 3D Vector & Scene Choreographer (`src/workers/visual.worker.ts`)**
   - Menghasilkan definisi layer vektor isometrik 3D, keyframe kamera (*zoom*, *pan*, *exploded-view*, *cross-section*), serta koordinat garis penunjuk 45 derajat ke dalam skema `RemotionCompositionProps`.
5. **Agent 5: Remotion Render Worker (`src/workers/renderer.worker.ts`)**
   - Mengeksekusi `@remotion/renderer` (`renderMedia`) secara *headless* untuk menghasilkan video akhir `/public/renders/[jobId]/output.mp4` pada resolusi `1920x1080` (atau `1080x1920` Shorts) 60fps.

## Cara Menjalankan

```bash
# 1. Jalankan Redis & Bull-Board (opsional jika Redis lokal sudah aktif di :6379)
docker compose up -d

# 2. Instal dependensi
npm install

# 3. Jalankan Next.js 16 Factory Dashboard & Studio
npm run dev

# 4. (Opsional) Jalankan proses BullMQ Worker secara terpisah
npm run workers
```
