/**
 * Ambil teks utama dari halaman web untuk bahan riset. Snippet SearXNG terlalu
 * pendek (sekitar 500 karakter), sehingga LLM terpaksa "melengkapi" sendiri.
 * Di sini kita ambil isi halamannya supaya fakta bisa dikutip dan diverifikasi.
 */

const BLOCKED_HOST =
  /^(localhost|0\.0\.0\.0|127\.|10\.|192\.168\.|169\.254\.|172\.(1[6-9]|2\d|3[01])\.|\[?::1\]?$)|\.local$|\.internal$/i;

export function isFetchableUrl(raw: string): boolean {
  try {
    const url = new URL(raw);
    if (url.protocol !== "http:" && url.protocol !== "https:") return false;
    if (BLOCKED_HOST.test(url.hostname)) return false;
    if (/\.(pdf|zip|mp4|mp3|jpg|jpeg|png|gif|webp|docx?|xlsx?|pptx?)(\?|$)/i.test(url.pathname)) {
      return false;
    }
    return true;
  } catch {
    return false;
  }
}

const ENTITIES: Record<string, string> = {
  amp: "&",
  lt: "<",
  gt: ">",
  quot: '"',
  apos: "'",
  nbsp: " ",
  ndash: "-",
  mdash: "-",
  hellip: "...",
  rsquo: "'",
  lsquo: "'",
  ldquo: '"',
  rdquo: '"',
};

function decodeEntities(text: string): string {
  return text
    .replace(/&#(\d+);/g, (_, code: string) => {
      const value = Number(code);
      return value > 31 && value < 65536 ? String.fromCharCode(value) : " ";
    })
    .replace(/&#x([0-9a-f]+);/gi, (_, code: string) => {
      const value = Number.parseInt(code, 16);
      return value > 31 && value < 65536 ? String.fromCharCode(value) : " ";
    })
    .replace(/&([a-z]+);/gi, (match, name: string) => ENTITIES[name.toLowerCase()] ?? match);
}

/** HTML -> teks paragraf. Sengaja sederhana: tanpa dependensi tambahan. */
export function htmlToText(html: string, maxChars = 7000): string {
  let body = html.replace(/<!--[\s\S]*?-->/g, " ");

  // Fokus ke <article> atau <main> bila ada.
  const focus =
    body.match(/<article[\s\S]*?<\/article>/i)?.[0] ??
    body.match(/<main[\s\S]*?<\/main>/i)?.[0];
  if (focus && focus.length > 800) body = focus;

  body = body
    .replace(
      /<(script|style|noscript|svg|nav|footer|header|aside|form|iframe|button|select)\b[\s\S]*?<\/\1>/gi,
      " ",
    )
    .replace(/<\/(p|li|h[1-6]|div|tr|section|blockquote|figcaption)>/gi, "\n")
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<[^>]+>/g, " ");

  const lines = decodeEntities(body)
    .split(/\n+/)
    .map((line) => line.replace(/\s+/g, " ").trim())
    // Buang menu, tombol, dan potongan pendek; sisakan kalimat utuh.
    .filter((line) => line.length >= 45 && /[.!?:;]|\s/.test(line));

  const seen = new Set<string>();
  const unique: string[] = [];
  for (const line of lines) {
    const key = line.toLowerCase().slice(0, 80);
    if (seen.has(key)) continue;
    seen.add(key);
    unique.push(line);
  }

  const joined = unique.join("\n");
  if (joined.length <= maxChars) return joined;
  const cut = joined.slice(0, maxChars);
  return cut.slice(0, Math.max(cut.lastIndexOf("\n"), maxChars * 0.8));
}

async function readLimited(response: Response, maxBytes: number): Promise<string> {
  if (!response.body) return (await response.text()).slice(0, maxBytes);
  const reader = response.body.getReader();
  const chunks: Uint8Array[] = [];
  let total = 0;
  while (total < maxBytes) {
    const { done, value } = await reader.read();
    if (done || !value) break;
    chunks.push(value);
    total += value.byteLength;
  }
  await reader.cancel().catch(() => undefined);
  return new TextDecoder("utf-8", { fatal: false }).decode(Buffer.concat(chunks));
}

export async function fetchPageText(
  url: string,
  options: { timeoutMs?: number; maxChars?: number } = {},
): Promise<string> {
  if (!isFetchableUrl(url)) return "";
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), options.timeoutMs ?? 9_000);
  try {
    const response = await fetch(url, {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (compatible; PabrikVideo/1.0; +research-agent)",
        Accept: "text/html,application/xhtml+xml,text/plain;q=0.8",
        "Accept-Language": "id-ID,id;q=0.9,en;q=0.8",
      },
      redirect: "follow",
      signal: controller.signal,
      cache: "no-store",
    });
    if (!response.ok) return "";
    const type = response.headers.get("content-type") ?? "";
    if (type && !/text\/(html|plain)|application\/xhtml/i.test(type)) return "";
    const html = await readLimited(response, 900_000);
    return htmlToText(html, options.maxChars ?? 7000);
  } catch {
    return "";
  } finally {
    clearTimeout(timer);
  }
}
