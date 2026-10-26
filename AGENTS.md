Pabrik-Video - X-Ray Hologram Factory

Context
Repo: mrezzaaa/pabrik-video branch claude-modified
Goal: Video factory 9:16 vertical, style kitabedah.id tapi visual X-RAY HOLOGRAM transparent biru #00D4FF background hitam #000, bukan payung flat abu #F2F2F2.

Current Problem (Kenapa ngaco)
Coder: Gemini 3.8 -> lemah 3D math, fan jadi triangle payung flat top-down
Content: gpt-oss-120B Groq -> lemah structured JSON, phase title hardcode "Solusi Vakum", enum 7 biji doang, jadi jalan tol/turbo/laptop gagal

Tech Stack
Next.js 16, Remotion 4.x, Zustand, Prisma/Postgres, BullMQ+Redis
Omniroute AI gateway http://localhost:20128/v1 (ganti model dari gpt-oss ke glm)
TTS VoiceStudio local http://localhost:3900/v1 voice_id aad77d68 name reza model tts-1-hd speed 1.1
FPS: VIDEO_FPS=30 (jangan \*60), WIDTH=1080 HEIGHT=1920 di remotion/constants.ts

Visual Target
Referensi: mobil x-ray biru mesin oranye, F16 hologram biru, jet engine kaca biru, terrain wireframe hijau, plus jalan tol elevated x-ray, turbocharger x-ray, laptop x-ray.

Material universal: xrayBlue opacity 0.18, xrayOrange opacity 0.65, wireframe overlay, fresnel shader.

Rules
JANGAN pakai public/assets/models/*.glb, repo harus ringan <50MB, pakai procedural primitives
JANGAN if-else hardcode topik, pakai universal factory blueprint.components[].geometryType
Movement: rotateZ only transformOrigin 50% 50%, explode pakai translateY + spring, JANGAN scale
Timeline: let from=0 accumulate, bukan from={0} semua
Telemetry: seededRandom(jobId) + clamp, bukan Math.random()
TTS: silenceremove ffmpeg + ffprobe duration*VIDEO_FPS
