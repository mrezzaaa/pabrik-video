import net from 'net';
import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';

/**
 * Pemetaan nama Voice di unlimitedtts.com (Supertonic-3) ke ID style model.
 */
const UNLIMITED_TTS_VOICE_MAP: Record<string, string> = {
  aria: 'F1',
  luna: 'F2',
  ivy: 'F3',
  nora: 'F4',
  zoe: 'F5',
  leo: 'M1',
  milo: 'M2',
  ethan: 'M3',
  noah: 'M4',
  kai: 'M5',
};

const UNLIMITED_TTS_LANG_MAP: Record<string, { name: string; code: string }> = {
  indonesian: { name: 'Indonesian', code: 'id' },
  id: { name: 'Indonesian', code: 'id' },
  indonesia: { name: 'Indonesian', code: 'id' },
  english: { name: 'English', code: 'en' },
  en: { name: 'English', code: 'en' },
};

function resolveUnlimitedVoice(voiceInput: string): { id: string; label: string } {
  const clean = (voiceInput || 'Ethan').trim();
  const mapped = UNLIMITED_TTS_VOICE_MAP[clean.toLowerCase()];
  if (mapped) {
    return { id: mapped, label: clean[0].toUpperCase() + clean.slice(1).toLowerCase() };
  }
  if (/^[MF][1-5]$/i.test(clean)) {
    const upper = clean.toUpperCase();
    const labelEntry = Object.entries(UNLIMITED_TTS_VOICE_MAP).find(([, v]) => v === upper);
    const label = labelEntry ? labelEntry[0][0].toUpperCase() + labelEntry[0].slice(1) : upper;
    return { id: upper, label };
  }
  return { id: 'M3', label: 'Ethan' };
}

function resolveUnlimitedLang(langInput: string): { name: string; code: string } {
  const clean = (langInput || 'Indonesian').trim().toLowerCase();
  return UNLIMITED_TTS_LANG_MAP[clean] || { name: 'Indonesian', code: 'id' };
}

function parseSseAudioUrl(sseText: string, baseOrigin: string): string | null {
  const lines = sseText.split(/\r?\n/);
  for (let i = 0; i < lines.length; i++) {
    if (lines[i].startsWith('event: complete')) {
      const dataLine = lines.slice(i + 1).find((l) => l.startsWith('data:'));
      if (dataLine) {
        try {
          const payload = JSON.parse(dataLine.replace(/^data:\s*/, ''));
          const fileObj = Array.isArray(payload) ? payload[0] : payload;
          if (fileObj?.url) return String(fileObj.url);
          if (fileObj?.path) return `${baseOrigin}/gradio_api/file=${fileObj.path}`;
        } catch {
          // ignore parse error
        }
      }
    }
  }
  return null;
}

/**
 * Sintesis suara menggunakan mesin Supertonic-3 milik unlimitedtts.com
 * Default: Language = Indonesian (id), Voice = Ethan (M3), Speed = 1.1x
 */
export async function synthesizeWithUnlimitedTts(
  text: string,
  opts: {
    voice?: string;
    language?: string;
    speed?: number;
  } = {}
): Promise<{ wavBuffer: Buffer; voiceLabel: string; langName: string; speed: number; applyAtempo: boolean }> {
  const voice = resolveUnlimitedVoice(opts.voice || process.env.UNLIMITEDTTS_VOICE || 'Ethan');
  const lang = resolveUnlimitedLang(opts.language || process.env.UNLIMITEDTTS_LANG || 'Indonesian');
  const rawSpeed = Number(opts.speed ?? process.env.UNLIMITEDTTS_SPEED ?? 1.1);
  const speed = Number.isFinite(rawSpeed) && rawSpeed >= 0.5 && rawSpeed <= 2.0 ? rawSpeed : 1.1;

  const cpuSpaces = [
    'https://arjunbroepic-supertonic-3-cpu.hf.space',
    'https://renderlib-dev-supertonic-3-cpu.hf.space',
  ];

  let lastErr: unknown;

  for (const origin of cpuSpaces) {
    try {
      const callRes = await fetch(`${origin}/gradio_api/call/generate_speech`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ data: [text, voice.id, lang.name] }),
        signal: AbortSignal.timeout(15000),
      });
      if (!callRes.ok) throw new Error(`HTTP ${callRes.status} on ${origin}`);
      const { event_id } = (await callRes.json()) as { event_id?: string };
      if (!event_id) throw new Error(`Missing event_id from ${origin}`);

      const streamRes = await fetch(`${origin}/gradio_api/call/generate_speech/${event_id}`, {
        signal: AbortSignal.timeout(60000),
      });
      if (!streamRes.ok) throw new Error(`Stream HTTP ${streamRes.status} on ${origin}`);
      const sseText = await streamRes.text();
      const audioUrl = parseSseAudioUrl(sseText, origin);
      if (!audioUrl) throw new Error(`No audio URL in complete event from ${origin}`);

      const wavRes = await fetch(audioUrl, { signal: AbortSignal.timeout(30000) });
      if (!wavRes.ok) throw new Error(`Failed downloading WAV (${wavRes.status})`);
      const wavBuffer = Buffer.from(await wavRes.arrayBuffer());
      if (wavBuffer.length < 1000) throw new Error('WAV buffer too small');

      return {
        wavBuffer,
        voiceLabel: voice.label,
        langName: lang.name,
        speed,
        applyAtempo: true,
      };
    } catch (err) {
      lastErr = err;
    }
  }

  // Fallback mirror: mlx-community-supertonic-3 (supports native speed parameter)
  const mlxOrigin = 'https://mlx-community-supertonic-3.hf.space';
  try {
    const callRes = await fetch(`${mlxOrigin}/gradio_api/call/synthesize`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ data: [text, lang.code, voice.id, 5, speed, 0] }),
      signal: AbortSignal.timeout(15000),
    });
    if (!callRes.ok) throw new Error(`HTTP ${callRes.status} on ${mlxOrigin}`);
    const { event_id } = (await callRes.json()) as { event_id?: string };
    if (!event_id) throw new Error(`Missing event_id from ${mlxOrigin}`);

    const streamRes = await fetch(`${mlxOrigin}/gradio_api/call/synthesize/${event_id}`, {
      signal: AbortSignal.timeout(75000),
    });
    if (!streamRes.ok) throw new Error(`Stream HTTP ${streamRes.status} on ${mlxOrigin}`);
    const sseText = await streamRes.text();
    const audioUrl = parseSseAudioUrl(sseText, mlxOrigin);
    if (!audioUrl) throw new Error(`No audio URL in complete event from ${mlxOrigin}`);

    const wavRes = await fetch(audioUrl, { signal: AbortSignal.timeout(30000) });
    if (!wavRes.ok) throw new Error(`Failed downloading WAV (${wavRes.status})`);
    const wavBuffer = Buffer.from(await wavRes.arrayBuffer());
    if (wavBuffer.length < 1000) throw new Error('WAV buffer too small');

    return {
      wavBuffer,
      voiceLabel: voice.label,
      langName: lang.name,
      speed,
      applyAtempo: false,
    };
  } catch (err) {
    throw lastErr instanceof Error ? lastErr : err;
  }
}

function createWavHeader(pcmLength: number, sampleRate = 22050, numChannels = 1, bitsPerSample = 16): Buffer {
  const byteRate = (sampleRate * numChannels * bitsPerSample) / 8;
  const blockAlign = (numChannels * bitsPerSample) / 8;
  const header = Buffer.alloc(44);

  header.write('RIFF', 0);
  header.writeUInt32LE(36 + pcmLength, 4);
  header.write('WAVE', 8);
  header.write('fmt ', 12);
  header.writeUInt32LE(16, 16);
  header.writeUInt16LE(1, 20);
  header.writeUInt16LE(numChannels, 22);
  header.writeUInt32LE(sampleRate, 24);
  header.writeUInt32LE(byteRate, 28);
  header.writeUInt16LE(blockAlign, 32);
  header.writeUInt16LE(bitsPerSample, 34);
  header.write('data', 36);
  header.writeUInt32LE(pcmLength, 40);

  return header;
}

export async function synthesizeWithWyomingPiper(
  text: string,
  host = 'localhost',
  port = 10200,
  timeoutMs = 15000
): Promise<{ pcm: Buffer; rate: number; width: number; channels: number }> {
  return new Promise((resolve, reject) => {
    const socket = net.createConnection({ host, port });
    let buffer = Buffer.alloc(0);
    const pcmChunks: Buffer[] = [];
    let rate = 22050;
    let width = 2;
    let channels = 1;
    let settled = false;

    const finish = (err?: Error) => {
      if (settled) return;
      settled = true;
      socket.destroy();
      if (err) {
        reject(err);
      } else {
        resolve({ pcm: Buffer.concat(pcmChunks), rate, width, channels });
      }
    };

    socket.setTimeout(timeoutMs);
    socket.on('timeout', () => finish(new Error('Piper TTS timeout')));
    socket.on('error', (err) => finish(err));

    socket.on('connect', () => {
      const dataBytes = Buffer.from(JSON.stringify({ text }), 'utf-8');
      const headerBytes = Buffer.from(
        JSON.stringify({ type: 'synthesize', data_length: dataBytes.length }) + '\n',
        'utf-8'
      );
      socket.write(Buffer.concat([headerBytes, dataBytes]));
    });

    socket.on('data', (chunk: Buffer) => {
      buffer = Buffer.concat([buffer, chunk]);

      while (true) {
        const newlineIdx = buffer.indexOf(0x0a);
        if (newlineIdx === -1) break;

        const headerLine = buffer.subarray(0, newlineIdx).toString('utf-8');
        let ev: any;
        try {
          ev = JSON.parse(headerLine);
        } catch {
          break;
        }

        const dataLen = ev.data_length || 0;
        const payloadLen = ev.payload_length || 0;
        const totalNeeded = newlineIdx + 1 + dataLen + payloadLen;

        if (buffer.length < totalNeeded) {
          break;
        }

        const dataStart = newlineIdx + 1;
        const dataBuf = buffer.subarray(dataStart, dataStart + dataLen);
        const payloadBuf = buffer.subarray(dataStart + dataLen, totalNeeded);

        buffer = buffer.subarray(totalNeeded);

        if (ev.type === 'audio-start' && dataLen > 0) {
          try {
            const meta = JSON.parse(dataBuf.toString('utf-8'));
            rate = meta.rate || 22050;
            width = meta.width || 2;
            channels = meta.channels || 1;
          } catch {
            // ignore
          }
        } else if (ev.type === 'audio-chunk' && payloadLen > 0) {
          pcmChunks.push(Buffer.from(payloadBuf));
        } else if (ev.type === 'audio-stop') {
          finish();
          return;
        }
      }
    });

    socket.on('end', () => finish());
  });
}

function probeDurationSeconds(filePath: string, fallback = 28): number {
  try {
    const out = execSync(
      `ffprobe -v error -show_entries format=duration -of default=noprint_wrappers=1:nokey=1 "${filePath}"`
    )
      .toString()
      .trim();
    const parsed = parseFloat(out);
    if (Number.isFinite(parsed) && parsed > 0) {
      return parseFloat(parsed.toFixed(2));
    }
  } catch {
    // ignore
  }
  return fallback;
}

export async function generateTtsAudioFile(text: string): Promise<{
  audioUrl: string;
  filePath: string;
  durationSeconds: number;
  engine: string;
}> {
  const publicTtsDir = path.join(process.cwd(), 'public', 'tts');
  if (!fs.existsSync(publicTtsDir)) {
    fs.mkdirSync(publicTtsDir, { recursive: true });
  }

  const stamp = Date.now();
  const wavPath = path.join(publicTtsDir, `narration-${stamp}.wav`);
  const mp3Filename = `narration-${stamp}.mp3`;
  const mp3Path = path.join(publicTtsDir, mp3Filename);

  // 1. Primary: UnlimitedTTS (Supertonic-3: Language=Indonesian, Voice=Ethan, Speed=1.1x)
  try {
    const unlimited = await synthesizeWithUnlimitedTts(text);
    fs.writeFileSync(wavPath, unlimited.wavBuffer);

    const filterArg =
      unlimited.applyAtempo && Math.abs(unlimited.speed - 1.0) > 0.01
        ? `-filter:a "atempo=${unlimited.speed}"`
        : '';

    execSync(`ffmpeg -y -i "${wavPath}" ${filterArg} -codec:a libmp3lame -qscale:a 3 "${mp3Path}"`, {
      stdio: 'ignore',
    });
    try {
      fs.unlinkSync(wavPath);
    } catch {
      // ignore
    }

    const durationSeconds = Math.max(probeDurationSeconds(mp3Path, 28), 5);
    return {
      audioUrl: `/tts/${mp3Filename}`,
      filePath: mp3Path,
      durationSeconds,
      engine: `UnlimitedTTS (${unlimited.langName} - ${unlimited.voiceLabel} @ ${unlimited.speed}x)`,
    };
  } catch (err: any) {
    console.warn(`[UnlimitedTTS Fallback]: ${err?.message}`);
  }

  // 2. Secondary Fallback: Local Wyoming Piper TTS
  try {
    const piperUrl = process.env.PIPER_URL || 'http://localhost:10200';
    const u = new URL(piperUrl);
    const { pcm, rate, width, channels } = await synthesizeWithWyomingPiper(
      text,
      u.hostname || 'localhost',
      Number(u.port || 10200)
    );

    if (pcm.length > 0) {
      const wavHeader = createWavHeader(pcm.length, rate, channels, width * 8);
      fs.writeFileSync(wavPath, Buffer.concat([wavHeader, pcm]));

      const rawSpeed = Number(process.env.UNLIMITEDTTS_SPEED ?? 1.1);
      const speed = Number.isFinite(rawSpeed) && rawSpeed >= 0.5 && rawSpeed <= 2.0 ? rawSpeed : 1.1;
      execSync(
        `ffmpeg -y -i "${wavPath}" -filter:a "atempo=${speed}" -codec:a libmp3lame -qscale:a 4 "${mp3Path}"`,
        { stdio: 'ignore' }
      );
      try {
        fs.unlinkSync(wavPath);
      } catch {
        // ignore
      }

      const durationSeconds = Math.max(probeDurationSeconds(mp3Path, 28), 5);
      return {
        audioUrl: `/tts/${mp3Filename}`,
        filePath: mp3Path,
        durationSeconds,
        engine: 'Piper TTS (id_ID-news_tts-medium)',
      };
    }
  } catch (err: any) {
    console.warn(`[Piper TTS Fallback]: ${err.message}`);
  }

  // 3. Tertiary Fallback: macOS System Indonesian TTS
  try {
    const aiffPath = path.join(publicTtsDir, `narration-${stamp}.aiff`);
    const safeText = text.replace(/"/g, '\\"');
    execSync(`say -v Damayanti -r 190 -o "${aiffPath}" "${safeText}"`, { stdio: 'ignore' });
    execSync(`ffmpeg -y -i "${aiffPath}" -codec:a libmp3lame -qscale:a 4 "${mp3Path}"`, {
      stdio: 'ignore',
    });
    try {
      fs.unlinkSync(aiffPath);
    } catch {
      // ignore
    }

    const durationSeconds = probeDurationSeconds(mp3Path, 28);
    return {
      audioUrl: `/tts/${mp3Filename}`,
      filePath: mp3Path,
      durationSeconds,
      engine: 'System Indonesian Neural TTS',
    };
  } catch {
    const words = text.split(/\s+/).filter(Boolean);
    const durationSeconds = Math.max(words.length * 0.28, 10);
    execSync(
      `ffmpeg -y -f lavfi -i anullsrc=r=44100:cl=mono -t ${durationSeconds} -q:a 9 -acodec libmp3lame "${mp3Path}"`,
      { stdio: 'ignore' }
    );
    return {
      audioUrl: `/tts/${mp3Filename}`,
      filePath: mp3Path,
      durationSeconds,
      engine: 'Fallback Audio Track',
    };
  }
}
