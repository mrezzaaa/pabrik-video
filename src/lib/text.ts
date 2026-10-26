/**
 * Text + number utilities shared by the planner and the Remotion stage.
 * Everything here is word-safe: we never slice a word in half, which is what
 * produced strings like "RCUN DI KULIT" or "KIRA JAIB?".
 */

const WORD_SPLIT = /\s+/;

/** Collapse whitespace and strip control characters, keeping punctuation. */
export function normalizeCopy(value: string): string {
  return value
    .replace(/[\u0000-\u001f\u007f]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * Clip to a character budget without ever cutting a word.
 * If the first word alone is too long it is kept whole (a short overflow is
 * better than a broken word).
 */
export function clipWords(
  value: string,
  maxChars: number,
  maxWords = 8,
): string {
  const words = normalizeCopy(value).split(WORD_SPLIT).filter(Boolean);
  if (words.length === 0) return "";

  const output: string[] = [];
  let length = 0;

  for (const word of words.slice(0, Math.max(1, maxWords))) {
    const nextLength = length + (output.length > 0 ? 1 : 0) + word.length;
    if (output.length > 0 && nextLength > maxChars) break;
    output.push(word);
    length = nextLength;
  }

  return output.join(" ");
}

const tokenCache = new Map<string, Set<string>>();

function sourceTokens(source: string): Set<string> {
  const existing = tokenCache.get(source);
  if (existing) return existing;

  const tokens = new Set(
    normalizeCopy(source)
      .toLowerCase()
      .replace(/[^\p{L}\p{N}\s]/gu, " ")
      .split(WORD_SPLIT)
      .filter(Boolean)
      .map((token) => token.replace(/[^\p{L}\p{N}]/gu, "")),
  );
  if (tokenCache.size > 200) tokenCache.clear();
  tokenCache.set(source, tokens);
  return tokens;
}

/** Common words that are allowed even when they do not appear in the narration. */
const COPY_ALLOWLIST = new Set([
  "dan",
  "atau",
  "di",
  "ke",
  "dari",
  "ini",
  "itu",
  "yang",
  "vs",
  "versus",
  "fakta",
  "mitos",
  "bahaya",
  "aman",
  "waspada",
  "jangan",
  "stop",
  "ternyata",
  "bukan",
  "beneran",
  "gila",
  "unik",
  "baru",
  "hidden",
  "part",
  "komen",
  "mau",
  "hampir",
  "hanya",
  "cuma",
  "lebih",
  "paling",
  "detik",
  "menit",
  "hari",
  "tahun",
]);

function digitsOf(value: string): string[] {
  return value.match(/\d+/g) ?? [];
}

/**
 * Token integrity guard.
 * A token survives only if it exists in the narration (or is a known
 * connective/emphasis word, or a number that the narration really contains).
 * This kills garbled LLM tokens such as "RCUN" / "JAIB".
 */
export function tokenAllowed(token: string, source: string): boolean {
  const cleaned = token
    .toLowerCase()
    .replace(/[^\p{L}\p{N}]/gu, "")
    .trim();
  if (!cleaned) return true;
  if (COPY_ALLOWLIST.has(cleaned)) return true;

  const numbers = digitsOf(token);
  if (numbers.length > 0) {
    const sourceNumbers = new Set(digitsOf(source));
    if (!numbers.every((number) => sourceNumbers.has(number))) return false;
    if (cleaned.replace(/\d+/g, "") === "") return true;
  }

  const tokens = sourceTokens(source);
  if (tokens.has(cleaned)) return true;
  if (cleaned.length < 4) return false;

  // Allow inflections ("kulit" vs "kulitnya") but never random fragments.
  for (const candidate of tokens) {
    if (candidate.length < 4) continue;
    if (candidate.includes(cleaned) || cleaned.includes(candidate)) {
      return true;
    }
  }
  return false;
}

/**
 * Clean an LLM headline/subheadline so every word is complete and grounded in
 * the narration. Falls back to the narration itself when nothing survives.
 */
export function cleanCopy(
  value: string,
  source: string,
  maxChars: number,
  maxWords: number,
  fallback = "",
): string {
  const tokens = normalizeCopy(value).split(WORD_SPLIT).filter(Boolean);
  const kept = tokens.filter((token) => tokenAllowed(token, source));
  const cleaned = clipWords(kept.join(" "), maxChars, maxWords);
  if (cleaned.length > 0) return cleaned;

  const fallbackTokens = normalizeCopy(fallback)
    .split(WORD_SPLIT)
    .filter((token) => tokenAllowed(token, source));
  return clipWords(fallbackTokens.join(" "), maxChars, maxWords);
}

/** Count words in a string. */
export function wordCount(value: string): number {
  return normalizeCopy(value).split(WORD_SPLIT).filter(Boolean).length;
}

/**
 * Format a number for video display.
 * 4-digit years (1900-2100) are NEVER grouped: 2025 stays "2025", not "2.025".
 * Other numbers use Indonesian separators.
 */
export function formatCounter(value: number): string {
  if (!Number.isFinite(value)) return "0";
  if (Number.isInteger(value)) {
    const abs = Math.abs(value);
    if (abs >= 1900 && abs <= 2100) return String(value);
    return new Intl.NumberFormat("id-ID", {
      maximumFractionDigits: 0,
    }).format(value);
  }
  return new Intl.NumberFormat("id-ID", {
    maximumFractionDigits: 1,
  }).format(value);
}
