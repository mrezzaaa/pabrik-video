# PABRIK VIDEO — FB Pro Reels Factory

Pabrik video otomatis: masukkan satu topik, pipeline multi-agent akan riset,
menulis naskah viral, membuat suara, menyusun visual plan, lalu merender MP4
vertikal 9:16 (1080×1920, 30 fps, maksimal 60 detik) ke `public/videos/`.

Stack: **Next.js 16 (App Router, TypeScript)**, Tailwind CSS v4, shadcn/ui,
Framer Motion, **Prisma + PostgreSQL**, **Redis + BullMQ**, **SearXNG**,
**OmniRoute** (gateway LLM OpenAI-compatible), **VoiceStudio** (TTS utama) /
edge-tts (fallback), dan **Remotion 4**.

## Arsitektur

```
Topik
  │
  ▼
POST /api/projects ──► Project + 5 Job (Prisma) ──► BullMQ
                                                      │
                              ┌───────────────────────┘
                              ▼
                    worker (npm run worker)
                              │
   research ─► scriptwriting ─► tts ─► visual-planning ─► render
      │             │            │            │              │
   SearXNG       OmniRoute    VoiceStudio   OmniRoute      Remotion
   + OmniRoute   (primary)    / edge-tts    (primary)      → MP4 + JPG
                              │
                              ▼
                 PostgreSQL (status) + Redis (queue)
                              │
                              ▼
                 SSE /api/projects/[id]/stream → UI
```

Setiap stage adalah job BullMQ terpisah dengan **retry 3×** (backoff
eksponensial). Status project dan job disimpan di PostgreSQL; UI memantau
lewat SSE yang membaca database.

| Stage | Agent | Output |
| --- | --- | --- |
| `research` | `src/lib/agents/research.ts` | fakta, sumber, angka, angle viral |
| `scriptwriting` | `src/lib/agents/scriptwriter.ts` | hook + naskah 30–45 detik |
| `tts` | `src/lib/agents/tts.ts` | `public/audio/{id}.mp3` + word timestamps |
| `visual-planning` | `src/lib/agents/visual-planner.ts` | b-roll query, infografis SVG, gerakan kamera, warna |
| `render` | `src/lib/agents/render.ts` | `public/videos/{id}.mp4` + thumbnail |

## Kebutuhan

- Node.js 20.9+ (disarankan 22)
- PostgreSQL 16 (port `5433` untuk setup lokal)
- Redis 7 (port `6379`)
- SearXNG dengan format JSON aktif (port `8080`)
- [OmniRoute](https://github.com/) berjalan di `http://localhost:20128/v1`
- VoiceStudio berjalan di `http://localhost:3900/v1` (opsional; fallback edge-tts)
- `ffmpeg` + `ffprobe` di `PATH`
- `edge-tts` untuk fallback TTS: `pipx install edge-tts` atau `pip install edge-tts`

OmniRoute dan VoiceStudio adalah layanan lokal di host. Docker Compose
menjangkau keduanya lewat `host.docker.internal` (port `20128` dan `3900`).

## Mulai Cepat (lokal)

```bash
cp .env.example .env.local   # lalu sesuaikan API key OmniRoute
npm install

# Infrastruktur (pakai compose, atau container yang sudah ada)
docker compose up -d postgres redis searxng

# Siapkan database
npx prisma migrate deploy
# atau saat development: npx prisma migrate dev

# Terminal 1 — web
npm run dev                  # http://localhost:2000

# Terminal 2 — worker
npm run worker               # atau: npm run worker:watch
```

Buka `http://localhost:2000`, isi topik (contoh: “Fakta unik kucing”), lalu
tunggu pipeline selesai. Hasil video tersedia di
`public/videos/{projectId}.mp4` dan tampil di halaman detail project.

Cek kesehatan layanan:

```bash
curl http://localhost:2000/api/health
curl http://localhost:2000/api/worker
```

## Perintah

| Perintah | Fungsi |
| --- | --- |
| `npm run dev` | Next.js dev server di port 2000 |
| `npm run build` | `prisma generate` + build produksi |
| `npm start` | Jalankan hasil build di port 2000 |
| `npm run worker` | Worker BullMQ + renderer |
| `npm run worker:watch` | Worker dengan auto-reload |
| `npm run dev:all` | Web + worker sekaligus |
| `npm run remotion:studio` | Remotion Studio untuk preview komposisi |
| `npm run lint` | ESLint |
| `npm run db:migrate` | `prisma migrate dev` |
| `npm run db:studio` | Prisma Studio |

## Environment

Semua variabel dibaca dari `process.env`; worker memuat `.env.local` lalu `.env`.

| Variabel | Default | Keterangan |
| --- | --- | --- |
| `DATABASE_URL` | `postgresql://pabrik:pabrik_secret@localhost:5433/pabrik_video?schema=public` | PostgreSQL |
| `REDIS_URL` | `redis://localhost:6379` | Redis / BullMQ |
| `SEARXNG_URL` | `http://localhost:8080` | SearXNG research |
| `OMNIROUTE_BASE_URL` | `http://localhost:20128/v1` | Gateway LLM |
| `OMNIROUTE_API_KEY` | `local` | API key OmniRoute |
| `OMNIROUTE_PRIMARY_MODEL` | `auto` | Model naskah & visual plan |
| `OMNIROUTE_FAST_MODEL` | `auto` | Model riset |
| `VOICESTUDIO_BASE_URL` | `http://localhost:3900/v1` | TTS utama |
| `VOICE_DEFAULT_ID` | `alloy` | Voice ID VoiceStudio (OpenAI alias) |
| `VOICESTUDIO_VOICE_NAME` | `Alloy` | Label suara |
| `VOICESTUDIO_MODEL` | `omnivoice` | Model TTS VoiceStudio |
| `VOICESTUDIO_SPEED` | `1.05` | Kecepatan VoiceStudio |
| `UNLIMITEDTTS_LANGUAGE` | `id-ID` | Fallback edge-tts |
| `UNLIMITEDTTS_VOICE_ID` | `id-ID-ArdiNeural` | Voice fallback |
| `UNLIMITEDTTS_SPEED` | `1.1` | Kecepatan fallback |
| `REMOTION_CONCURRENCY` | `2` | Concurrency render |
| `REMOTION_GL` | `angle` (macOS) / `swangle` (Docker) | Renderer WebGL |
| `WORKER_CONCURRENCY` | `1` | Job paralel per worker |

## API

| Method | Endpoint | Fungsi |
| --- | --- | --- |
| `GET` | `/api/projects` | Daftar project |
| `POST` | `/api/projects` | Buat project + antre pipeline `{ "topic": "..." }` |
| `GET` | `/api/projects/[id]` | Detail project + jobs |
| `PATCH` | `/api/projects/[id]` | Edit naskah / hook |
| `POST` | `/api/projects/[id]/rerun` | Ulangi stage tertentu |
| `GET` | `/api/projects/[id]/stream` | SSE status project |
| `GET` | `/api/projects/stream` | SSE semua project |
| `GET` | `/api/worker` | Status worker + queue |
| `GET` | `/api/health` | Kesehatan semua layanan |
| `POST` | `/api/tts` | Proxy TTS (preview suara) |
| `GET` | `/api/search` | Proxy SearXNG |

## Remotion

Komposisi `Reels` berada di `src/remotion/`. Spesifikasi render:

- 1080×1920, 30 fps, H.264, CRF 18
- Scene anti-boring: maksimal **2.5 detik** per scene, motion berganti
  (`zoomIn`/`zoomOut`/`shake`/`pan`/`panLeft`)
- **Caption bawah adalah satu-satunya renderer transkrip.** Center stage tidak
  pernah mengulang kalimat narasi; isinya hanya angka/metrik atau label sumbu
  1–2 kata.
- **Tanpa emoji di mana pun** (UI, caption, stage). Semua output LLM melewati
  post-processor regex yang membuang rentang Unicode emoji.
- **B-roll nyata dari SearXNG**: visual planner menulis `imageSearchQuery`,
  render mengunduh gambar ke `public/images/{projectId}/` lalu menormalkannya
  ke 1080×1350. Tiga varian frame: full-bleed, split reveal, dan glass rounded.
- **Infografis SVG animatif**: `SVG_COUNTER` (odometer), `SVG_GAUGE` (arc
  meter), `SVG_BAR_CHART` (spring bars), `SVG_WAVEFORM` (ECG/flatline).
- Caption karaoke per kata, maksimal 3 kata per baris
- Kata aktif berwarna kuning dengan skala 1.2 dan stroke hitam 4 px
- Tanpa CTA (komen/share/like/follow/part 2) dan tanpa badge CTA; naskah
  ditutup dengan refleksi/open loop natural
- TTS disintesis per klausa/kalimat utuh lalu digabung dengan jeda 120 ms,
  sehingga tidak ada pemotongan di tengah kata atau plosif yang terpotong

Preview tanpa render:

```bash
npm run remotion:studio
```

Render manual memakai props JSON yang dihasilkan agent (lihat
`src/lib/agents/render.ts`).

## Docker Compose

```bash
cp .env.example .env
docker compose up -d --build
```

Service: `postgres` (5433), `redis` (6379), `searxng` (8080), `web` (2000),
`worker`. OmniRoute (20128) dan VoiceStudio (3900) tetap berjalan di host.
Volume `media_*` dipakai bersama oleh web dan worker agar file audio/video
langsung bisa disajikan.

Catatan: worker image memakai `REMOTION_GL=swangle` karena container tidak
punya GPU Metal. Render pertama bisa lebih lambat.

## Troubleshooting

- **Worker offline** — pastikan `npm run worker` berjalan dan Redis hidup.
  `/api/worker` menampilkan heartbeat dan isi queue.
- **`EADDRINUSE :2000`** — port dipakai proses lain; hentikan dev server lama.
- **TTS gagal** — cek VoiceStudio di `:3900`; fallback butuh CLI `edge-tts`.
- **Render gagal / Chromium** — jalankan `npx remotion browser ensure`, dan
  pastikan `ffmpeg` tersedia. Di Docker gunakan `REMOTION_GL=swangle`.
- **SearXNG 403/format** — `searxng/settings.yml` harus mengaktifkan `json`
  pada `search.formats`.
- **Video lebih dari 60 detik** — naskah dipangkas otomatis saat perencanaan;
  periksa durasi audio di halaman detail.

## Struktur

```
src/
  app/                 halaman + API routes (App Router)
  components/          dashboard, project detail, shadcn/ui
  lib/
    agents/            research, scriptwriter, tts, visual-planner, render
    pipeline.ts        lifecycle stage + status project
    queue.ts           koneksi Redis + BullMQ
    omniroute.ts       klien LLM (JSON + teks)
    tts.ts             VoiceStudio + edge-tts fallback (chunk per kalimat)
    searxng.ts         pencarian web + gambar
    images.ts          unduh/normalisasi b-roll SearXNG ke public/images
    alignment.ts       estimasi timestamp kata + caption 3 kata
    media.ts           path publik, ffprobe, thumbnail
  remotion/            komposisi Reels 9:16
  worker/              entry point + runner BullMQ
prisma/                schema + migration
searxng/settings.yml   konfigurasi SearXNG (JSON API)
docker-compose.yml     infra + web + worker
```
