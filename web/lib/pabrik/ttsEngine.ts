import net from 'net';
import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';

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

      execSync(`ffmpeg -y -i "${wavPath}" -codec:a libmp3lame -qscale:a 4 "${mp3Path}"`, {
        stdio: 'ignore',
      });
      try {
        fs.unlinkSync(wavPath);
      } catch {
        // ignore
      }

      const durationSeconds = parseFloat((pcm.length / (rate * channels * width)).toFixed(2));
      return {
        audioUrl: `/tts/${mp3Filename}`,
        filePath: mp3Path,
        durationSeconds: Math.max(durationSeconds, 5),
        engine: 'Piper TTS (id_ID-news_tts-medium)',
      };
    }
  } catch (err: any) {
    console.warn(`[Piper TTS Fallback]: ${err.message}`);
  }

  try {
    const aiffPath = path.join(publicTtsDir, `narration-${stamp}.aiff`);
    const safeText = text.replace(/"/g, '\\"');
    execSync(`say -v Damayanti -r 165 -o "${aiffPath}" "${safeText}"`, { stdio: 'ignore' });
    execSync(`ffmpeg -y -i "${aiffPath}" -codec:a libmp3lame -qscale:a 4 "${mp3Path}"`, {
      stdio: 'ignore',
    });
    try {
      fs.unlinkSync(aiffPath);
    } catch {
      // ignore
    }

    const probeOut = execSync(
      `ffprobe -v error -show_entries format=duration -of default=noprint_wrappers=1:nokey=1 "${mp3Path}"`
    )
      .toString()
      .trim();
    const durationSeconds = parseFloat(probeOut) || 28;
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
