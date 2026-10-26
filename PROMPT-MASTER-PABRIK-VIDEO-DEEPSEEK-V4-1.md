
# MASTER PROMPT FOR DEEPSEEK V4.1 FLASH - PABRIK VIDEO FB PRO REELS
# Copy paste this entire prompt to DeepSeek V4.1

You are an Expert Senior Fullstack Engineer specialized in Next.js 16, Remotion, BullMQ, Prisma, and Viral Content Engineering.

## PROJECT NAME: PABRIK VIDEO - FB PRO REELS FACTORY

### 1. OBJECTIVE
Build a web application where user only inputs a TOPIC (e.g., "5 fakta unik kucing"), then the system automatically orchestrates a multi-agent pipeline to produce a high-retention vertical video (9:16 Reels) ready to upload to Facebook Pro.

Target: Viral FB Pro Reels formula, high retention, rich motion graphics, not boring.

### 2. TECH STACK - MUST USE THIS EXACTLY
- Framework: Next.js 16 (App Router, TypeScript, Server Actions)
- Styling: Tailwind CSS v4 + shadcn/ui (new york style) + lucide-react + framer-motion
- Database: PostgreSQL via Prisma ORM
- Queue: Redis + BullMQ (for orchestration)
- Search: SearXNG (for research agent)
- LLM Gateway: Omniroute (OpenAI-Compatible SDK). Base URL: http://localhost:20128/v1
  - Use `openai` SDK client configured with baseURL and apiKey
  - PRIMARY_MODEL = auto, FAST_MODEL = auto
- TTS: 
  - Primary: VoiceStudio at http://localhost:3900/v1, voice_id=aad77d68, voice_name=reza
  - Fallback: UnlimitedTTS Engine (UNLIMITEDTTS_LANGUAGE=id-ID, VOICE=Ethan, SPEED=1.1)
- Video Engine: Remotion 4.0 + @remotion/player + @remotion/media-utils
- Deployment: Docker Compose ready

### 3. ENVIRONMENT VARIABLES - READ FROM process.env
```
NODE_ENV=development
NEXT_PUBLIC_APP_URL="http://localhost:2000"
DATABASE_URL="postgresql://pabrik:pabrik_secret@localhost:5433/pabrik_video?schema=public"
REDIS_URL="redis://localhost:6379"
REDIS_HOST="localhost"
REDIS_PORT=6379
SEARXNG_URL="http://localhost:8080"
OMNIROUTE_BASE_URL="http://localhost:20128/v1"
OMNIROUTE_API_KEY="sk-3f480b5172cb4e50-bdaadb-65e4e3ef"
OMNIROUTE_PRIMARY_MODEL="auto"
OMNIROUTE_FAST_MODEL="auto"
OMNIROUTE_MODEL="auto"
VOICE_DEFAULT_ID="aad77d68"
VOICESTUDIO_BASE_URL="http://localhost:3900/v1"
VOICESTUDIO_VOICE_NAME="reza"
UNLIMITEDTTS_LANGUAGE=id-ID
UNLIMITEDTTS_VOICE=Ethan
UNLIMITEDTTS_SPEED=1.1
REMOTION_CONCURRENCY=2
REMOTION_FPS=30
REMOTION_GL="angle"
```

### 4. SYSTEM ARCHITECTURE / WORKFLOW
Input Topik (Frontend) -> POST /api/projects -> Create DB Project (status=QUEUED) -> Orchestrator adds BullMQ jobs -> Agents execute sequentially

BullMQ Queue: `pabrik-video-queue`
Jobs Chain:
1. `research` -> 2. `scriptwriting` -> 3. `tts` -> 4. `visual-planning` -> 5. `render`

Each job updates PostgreSQL and emits SSE/WebSocket status to frontend (use Server-Sent Events via /api/projects/[id]/stream).

### 5. DATABASE SCHEMA - Prisma
Design Prisma schema with models:

model Project {
  id String @id @default(cuid())
  topic String
  status ProjectStatus @default(QUEUED) // QUEUED, RESEARCHING, SCRIPTING, TTS_PROCESSING, VISUAL_PLANNING, RENDERING, DONE, FAILED
  hook String? // viral hook
  fullScript Json? // { sentences: [{text, startTime, endTime}] }
  researchData Json?
  visualPlan Json?
  audioUrl String?
  videoUrl String?
  thumbnailUrl String?
  duration Int? // seconds
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
  jobs Job[]
}

model Job {
  id String @id @default(cuid())
  projectId String
  project Project @relation(fields: [projectId], references: [id])
  type String // research, scriptwriting, tts, visual-planning, render
  status JobStatus
  payload Json?
  result Json?
  error String?
  attempts Int @default(0)
  createdAt DateTime @default(now())
}

### 6. DETAILED AGENT SPECIFICATIONS

**AGENT 1: Pencari Materi (Researcher)**
- Input: topic
- Tool: Fetch `${SEARXNG_URL}/search?q={topic}&format=json` (or POST)
- Task: Get top 10 results, extract facts, controversy, numbers, unique angles. Must produce JSON: { facts: string[], sources: {title,url}[], uniqueAngles: string[], viralPotential: string }
- LLM: Use OMNIROUTE_FAST_MODEL for speed

**AGENT 2: Pembuat Narasi (Scriptwriter) - MOST IMPORTANT FOR VIRAL**
- Input: researchData + topic
- Use OMNIROUTE_PRIMARY_MODEL
- Must follow FORMULA VIRAL FB PRO REELS (30-45 detik):
  STRUCTURE:
  1. HOOK 0-3s: Must be shocking/controversial/curiosity gap. Pattern: "Jangan pernah... kalau gak mau...", "99% orang salah...", "Fakta ini bakal bikin lu..."
  2. SETUP 3-8s: Janji payoff
  3. BODY 8-35s: 3-5 poin dengan pattern interrupt setiap 2-3 detik. Gunakan storytelling, angka, konflik.
  4. PAYOFF + CTA 35-45s: Kesimpulan + CTA komen "Komen 'MAU' kalau mau part 2"
- Output JSON strict: 
  {
    hook: "string max 12 words",
    script: "full narration in Indonesian casual, 80-120 words, for TTS",
    sentences: [{ id, text, emphasisWords: string[], emotion: "shocking|curious|excited" }],
    captions: [{ text, words: [{word, start, end}] }], // for word-by-word
    durationEstimate: number
  }
- Tone: Indonesian casual, Gen Z, Bogor style, jangan formal.

**AGENT 3: TTS**
- Input: sentences from scriptwriter
- Task: Call VoiceStudio API: POST ${VOICESTUDIO_BASE_URL}/tts with { voice_id: VOICE_DEFAULT_ID, text: fullScript, language: id-ID }
- If fails, fallback to UnlimitedTTS
- Output: Save audio file to /public/audio/{projectId}.mp3, also generate word-level timestamps using Whisper-like forced alignment (use whisper or estimate: total duration / total words)
- Return audioUrl and wordTimestamps

**AGENT 4: Visual Planner (High Retention Engine)**
- Input: script sentences + wordTimestamps
- Use OMNIROUTE_PRIMARY_MODEL
- Task: Generate visualPlan JSON for Remotion:
  {
    scenes: [{
      id, startTime, endTime, 
      background: { type: "gradient|solid|video", value: "..." },
      motion: { type: "zoomIn|zoomOut|shake|pan", intensity: 0.1-0.5 },
      textAnimation: { type: "karaoke|popIn|typewriter" },
      bRollKeywords: ["cat", "funny"], // for pexels placeholder or color block
      overlayEmoji: "😱"
    }]
  }
- High retention rules: Change motion every 1.5s, zoom 110-125%, add shake on emphasisWords.

**AGENT 5: Sync & Render (Remotion)**
- Input: visualPlan + audioUrl + wordTimestamps
- Build Remotion Composition: Reels.tsx
  - 1080x1920, 30fps, 9:16
  - Components: <Audio src>, <Sequence> for each scene, <Caption> component with karaoke style
  - Caption Component Requirements (ANTI-BORING):
    - Max 3 words per line, centered bottom 35%
    - Current word: scale 1.2, color #FFFF00, stroke 4px black, pop animation with spring
    - Previous words: white
    - Use framer-motion style interpolation
    - Add emoji pop on emphasisWords
    - Background highlight behind caption (rounded bg black/70)
  - Render via: npx remotion render src/remotion/index.ts <CompositionId> out/{projectId}.mp4 --gl=angle --concurrency=2
- Save videoUrl to DB and /public/videos/{projectId}.mp4

### 7. FRONTEND - Tailwind + shadcn

Pages:
- `/` : Dashboard factory style. Input besar "Mau bikin konten apa hari ini?" + button "Bikin Pabrik Jalan!". List projects dengan status realtime (SSE). Card showing thumbnail, progress bar, hook.
- `/project/[id]` : Detail view with 3 columns: Timeline (jobs), Preview Player (Remotion Player), Script editor.

Components to build (shadcn):
- Use Card, Input, Button, Badge, Progress, ScrollArea, Tabs
- Custom: VideoPlayer (Remotion Player wrapper), CaptionPreview, JobTimeline, ViralScore (estimated hook strength)

Design: Dark factory theme, zinc-950 background, neon green accent, monospace for factory vibes.

### 8. API ROUTES (Next.js App Router)
- POST /api/projects - create project, enqueue research job
- GET /api/projects - list
- GET /api/projects/[id] - detail
- GET /api/projects/[id]/stream - SSE for job status (use BullMQ events)
- POST /api/worker - BullMQ worker endpoint (or run separate worker.ts)
- POST /api/tts - proxy to VoiceStudio
- POST /api/search - proxy to SearXNG

### 9. WORKER IMPLEMENTATION
Create `src/lib/queue.ts`:
- Connection to Redis
- Queue: new Queue('pabrik-video-queue', { connection })
- Worker: new Worker('pabrik-video-queue', async job => { switch job.name })

Each job function in `src/lib/agents/*.ts`

Use Prisma to update status.

### 10. REMOTION SETUP
- Folder: `src/remotion/`
- `Root.tsx`: Register compositions
- `Reels.tsx`: Main composition that takes props: { script, visualPlan, audioUrl, wordTimestamps }
- `components/Caption.tsx`: Karaoke caption component
- `components/SceneBackground.tsx`

Install: npm install remotion @remotion/cli @remotion/player @remotion/media-utils

Add scripts in package.json: "remotion:studio": "remotion studio src/remotion/index.ts"

### 11. VIRAL FORMULA CONSTANTS - Embed in prompt of scriptwriter agent
Hook formulas array: [
  "Jangan pernah {action} kalau gak mau {bad consequence}",
  "{Number}% orang salah tentang {topic}",
  "Fakta {topic} ini bakal bikin lu {emotion}...",
  "Kenapa {topic} dilarang di {place}?"
]

### 12. IMPLEMENTATION ORDER - DO THIS STEP BY STEP
1. Setup Next.js 16 project, Tailwind, shadcn init, Prisma init with postgresql
2. Create Prisma schema and run migration
3. Create lib/queue.ts and lib/omniroute.ts (OpenAI client)
4. Build API routes for projects and SSE
5. Build Frontend Dashboard
6. Build Agent 1 Researcher (SearXNG integration)
7. Build Agent 2 Scriptwriter with viral prompt
8. Build Agent 3 TTS integration
9. Build Agent 4 Visual Planner
10. Build Remotion compositions + Caption component
11. Build Agent 5 Render
12. Connect worker flow end-to-end
13. Test with topic "Fakta unik kucing"

### 13. CONSTRAINTS - IMPORTANT
- Do NOT use any external paid API except Omniroute gateway (which is local)
- All TTS must use local VoiceStudio or UnlimitedTTS
- Video must be 9:16, 1080x1920, max 60 seconds for FB Pro Reels
- Captions MUST be karaoke style, word-by-word, not static subtitle
- Use `auto` model from Omniroute - don't hardcode model name
- Handle BullMQ job failures with retry 3x
- Code must be production ready, with error handling

### 14. FINAL DELIVERABLE
A working Next.js app where I can type topic and get video MP4 file in /public/videos/. Provide docker-compose.yml for postgres (5433), redis (6379), searxng (8080), omniroute (20128), voicestudio (3900).

Start coding now. Build file by file. Use TypeScript strictly.

