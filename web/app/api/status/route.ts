import { NextResponse } from 'next/server';
import net from 'net';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

function checkTcpPort(host: string, port: number, timeoutMs = 1500): Promise<boolean> {
  return new Promise((resolve) => {
    const socket = new net.Socket();
    let settled = false;

    const finish = (ok: boolean) => {
      if (!settled) {
        settled = true;
        socket.destroy();
        resolve(ok);
      }
    };

    socket.setTimeout(timeoutMs);
    socket.once('connect', () => finish(true));
    socket.once('timeout', () => finish(false));
    socket.once('error', () => finish(false));
    socket.connect(port, host);
  });
}

export async function GET() {
  const searxUrl = process.env.SEARXNG_URL || 'http://localhost:8080/search?q=';
  const piperUrl = process.env.PIPER_URL || 'http://localhost:10200';
  const omnirouteUrl = (process.env.OMNIROUTE_URL || 'http://localhost:20128/v1').replace(/\/$/, '');
  const apiKey = process.env.OPENAI_API_KEY || 'free-key';

  const researchModel = process.env.RESEARCH_MODEL || 'nvidia/moonshotai/kimi-k3';
  const scriptModel = process.env.SCRIPT_MODEL || 'nvidia/meta/muse-glimmer-30b';
  const svgModel = process.env.SVG_MODEL || 'nvidia/nvidia/nemotron-3.5-lightning-30b-a3b';
  const juryModel = process.env.JURY_MODEL || 'nvidia/nvidia/nemotron-3-nano-omni-30b-a3b-reasoning';

  // 1. Check SearXNG
  let searxOnline = false;
  let searxPort = '8080';
  try {
    const u = new URL(searxUrl);
    searxPort = u.port || '8080';
    const res = await fetch(`${u.origin}/search?q=test&format=json`, {
      signal: AbortSignal.timeout(2000),
    });
    searxOnline = res.ok;
  } catch {
    searxOnline = false;
  }

  // 2. Check Piper TTS TCP Port
  let piperOnline = false;
  let piperPort = '10200';
  try {
    const u = new URL(piperUrl);
    piperPort = u.port || '10200';
    piperOnline = await checkTcpPort(u.hostname || 'localhost', Number(piperPort));
  } catch {
    piperOnline = await checkTcpPort('localhost', 10200);
  }

  // 3. Check Omniroute Endpoint
  let omnirouteOnline = false;
  let omniroutePort = '';
  try {
    const u = new URL(omnirouteUrl);
    omniroutePort = u.port || (u.protocol === 'https:' ? '443' : '80');
    const res = await fetch(`${omnirouteUrl}/models`, {
      headers: { Authorization: `Bearer ${apiKey}` },
      signal: AbortSignal.timeout(2500),
    });
    omnirouteOnline = res.ok;
  } catch {
    omnirouteOnline = false;
  }

  // Short model label from SCRIPT_MODEL / RESEARCH_MODEL
  const shortModel = (model: string) => {
    const parts = model.split('/');
    return parts[parts.length - 1] || model;
  };

  return NextResponse.json({
    searxng: {
      online: searxOnline,
      port: searxPort,
      label: `SearXNG: ${searxPort}`,
    },
    piper: {
      online: true,
      port: piperPort,
      fallback: process.env.UNLIMITEDTTS_VOICE || 'Ethan',
      label: `UnlimitedTTS: ${process.env.UNLIMITEDTTS_VOICE || 'Ethan'} (${process.env.UNLIMITEDTTS_SPEED || '1.1'}x)`,
    },
    omniroute: {
      online: omnirouteOnline,
      url: omnirouteUrl,
      port: omniroutePort,
      activeModel: shortModel(scriptModel),
      models: {
        research: shortModel(researchModel),
        script: shortModel(scriptModel),
        svg: shortModel(svgModel),
        jury: shortModel(juryModel),
      },
      label: `Omniroute: ${shortModel(researchModel)} / ${shortModel(scriptModel)}`,
    },
  });
}
