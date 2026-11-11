import { env } from "./env";

export interface SearchResult {
  title: string;
  url: string;
  content: string;
}

export interface SearchDiagnostics {
  results: SearchResult[];
  /** Engines that SearXNG reported as failing for this request. */
  unresponsive: string[];
  /** Engine list that produced the results (empty string = default set). */
  engines: string;
}

const MAX_RESULTS = 10;
const REQUEST_TIMEOUT_MS = 18_000;

function normalizeResults(payload: unknown): SearchResult[] {
  if (!payload || typeof payload !== "object") return [];
  const results = (payload as { results?: unknown }).results;
  if (!Array.isArray(results)) return [];

  return results
    .slice(0, MAX_RESULTS)
    .map((item) => {
      const record = item as Record<string, unknown>;
      return {
        title: typeof record.title === "string" ? record.title : "Tanpa judul",
        url: typeof record.url === "string" ? record.url : "",
        content: typeof record.content === "string" ? record.content : "",
      };
    })
    .filter((item) => item.url.length > 0);
}

function unresponsiveEngines(payload: unknown): string[] {
  if (!payload || typeof payload !== "object") return [];
  const list = (payload as { unresponsive_engines?: unknown })
    .unresponsive_engines;
  if (!Array.isArray(list)) return [];
  return list
    .map((entry) =>
      Array.isArray(entry) ? String(entry[0] ?? "") : String(entry ?? ""),
    )
    .filter(Boolean);
}

/**
 * Questions read badly to search engines. Strip the question wrapper while
 * keeping the entities: "Seberapa bahaya El-Nino?" -> "bahaya El-Nino".
 */
export function normalizeSearchQuery(query: string) {
  return query
    .replace(/["'`”“]/g, " ")
    .replace(/[?!.]+$/g, "")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 180);
}

export function researchQueryVariants(topic: string): string[] {
  const base = normalizeSearchQuery(topic);
  const variants = [base];

  const stripped = base
    .replace(
      /^(seberapa|gimana|bagaimana|kenapa|mengapa|apakah|berapa|kapan|di\s?mana|dimana|siapa|apa\s+itu)\s+/i,
      "",
    )
    .trim();
  if (stripped && stripped !== base) variants.push(stripped);

  const keywords = base
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s-]/gu, " ")
    .split(/\s+/)
    .filter((word) => word.length > 3 && !SEARCH_STOPWORDS.has(word))
    .slice(0, 4)
    .join(" ");
  if (keywords && !variants.includes(keywords)) variants.push(keywords);

  const withContext = `${stripped || base} indonesia`;
  if (!variants.includes(withContext)) variants.push(withContext);

  return variants.filter((query) => query.length >= 3);
}

const SEARCH_STOPWORDS = new Set([
  "yang",
  "dengan",
  "untuk",
  "dari",
  "dalam",
  "adalah",
  "bisa",
  "akan",
  "atau",
  "juga",
  "sangat",
  "lebih",
  "paling",
  "banyak",
  "sekali",
  "kalau",
  "karena",
  "tetapi",
  "tapi",
  "pada",
  "saat",
  "sudah",
  "belum",
  "masih",
  "harus",
  "cara",
  "bikin",
  "bisa",
]);

async function requestSearch(
  url: URL,
  postBody: Record<string, string>,
): Promise<unknown> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

  try {
    let response = await fetch(url, {
      headers: {
        Accept: "application/json",
        "User-Agent": "PabrikVideo/1.0 (research-agent)",
      },
      signal: controller.signal,
      cache: "no-store",
    });

    // Some SearXNG deployments only expose POST for JSON.
    if (!response.ok && response.status === 405) {
      response = await fetch(`${url.origin}${url.pathname}`, {
        method: "POST",
        headers: {
          Accept: "application/json",
          "Content-Type": "application/x-www-form-urlencoded",
        },
        body: new URLSearchParams(postBody).toString(),
        signal: controller.signal,
        cache: "no-store",
      });
    }

    if (!response.ok) {
      const body = await response.text().catch(() => "");
      throw new Error(
        `SearXNG HTTP ${response.status}: ${body.slice(0, 200)}`,
      );
    }

    return await response.json();
  } finally {
    clearTimeout(timeout);
  }
}

function engineGroups(preferred?: string): Array<string | undefined> {
  const configured = (preferred ?? env.searxngEngines)
    .split(",")
    .map((engine) => engine.trim())
    .filter(Boolean);

  const groups: Array<string | undefined> = [];
  if (configured.length > 0) groups.push(configured.join(","));
  groups.push("bing,yahoo");
  groups.push("bing");
  groups.push("yahoo");
  groups.push(undefined);

  const seen = new Set<string>();
  return groups.filter((group) => {
    const key = group ?? "__default__";
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

/**
 * Web search with engine fallback. Public SearXNG instances routinely suspend
 * individual engines (Google/Brave rate limits, DuckDuckGo TLS failures), so a
 * single request with the default engine set can legitimately return zero
 * results while Bing/Yahoo still work.
 */
export async function searchWebDiagnostics(
  query: string,
  options: { engines?: string } = {},
): Promise<SearchDiagnostics> {
  const normalized = normalizeSearchQuery(query);

  const buildUrl = (engines?: string) => {
    const url = new URL(`${env.searxngUrl}/search`);
    url.searchParams.set("q", normalized);
    url.searchParams.set("format", "json");
    url.searchParams.set("language", "id-ID");
    url.searchParams.set("safesearch", "0");
    url.searchParams.set("categories", "general");
    if (engines) url.searchParams.set("engines", engines);
    return url;
  };

  let unresponsive: string[] = [];
  let lastError: unknown;

  for (const engines of engineGroups(options.engines)) {
    try {
      const payload = await requestSearch(buildUrl(engines), {
        q: normalized,
        format: "json",
        language: "id-ID",
        safesearch: "0",
        categories: "general",
        ...(engines ? { engines } : {}),
      });

      const results = normalizeResults(payload);
      if (results.length > 0) {
        return { results, unresponsive, engines: engines ?? "" };
      }
      unresponsive = unresponsiveEngines(payload);
    } catch (error) {
      lastError = error;
    }
  }

  if (lastError && unresponsive.length === 0) {
    throw lastError;
  }

  return { results: [], unresponsive, engines: "" };
}

export async function searchWeb(query: string): Promise<SearchResult[]> {
  const { results } = await searchWebDiagnostics(query);
  return results;
}

/**
 * Last-resort source when every SearXNG engine is suspended. Wikipedia's API
 * is independent from the search engines and gives citable article URLs.
 */
export async function searchWikipedia(query: string): Promise<SearchResult[]> {
  const normalized = normalizeSearchQuery(query);
  if (normalized.length < 3) return [];

  for (const host of ["id.wikipedia.org", "en.wikipedia.org"]) {
    const url = new URL(`https://${host}/w/api.php`);
    url.searchParams.set("action", "query");
    url.searchParams.set("list", "search");
    url.searchParams.set("srsearch", normalized);
    url.searchParams.set("srlimit", "5");
    url.searchParams.set("format", "json");
    url.searchParams.set("utf8", "1");

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 12_000);
    try {
      const response = await fetch(url, {
        headers: {
          Accept: "application/json",
          "User-Agent": "PabrikVideo/1.0 (research-agent)",
        },
        signal: controller.signal,
        cache: "no-store",
      });
      if (!response.ok) continue;

      const payload = (await response.json()) as {
        query?: { search?: Array<{ title?: string; snippet?: string }> };
      };
      const hits = payload.query?.search ?? [];
      const results = hits
        .filter((hit) => hit.title)
        .slice(0, 5)
        .map((hit) => ({
          title: hit.title as string,
          url: `https://${host}/wiki/${encodeURIComponent(
            (hit.title as string).replace(/\s+/g, "_"),
          )}`,
          content: (hit.snippet ?? "")
            .replace(/<[^>]+>/g, " ")
            .replace(/\s+/g, " ")
            .trim(),
        }));

      if (results.length > 0) return results;
    } catch {
      // try the next language edition
    } finally {
      clearTimeout(timeout);
    }
  }

  return [];
}

/**
 * Search web with query variants and a Wikipedia fallback. Returns diagnostics
 * so the research agent can explain *why* a topic produced no sources.
 */
export async function searchWebResilient(topic: string): Promise<{
  results: SearchResult[];
  query: string;
  unresponsive: string[];
  viaWikipedia: boolean;
}> {
  let unresponsive: string[] = [];

  for (const query of researchQueryVariants(topic)) {
    const diagnostic = await searchWebDiagnostics(query);
    if (diagnostic.results.length > 0) {
      return {
        results: diagnostic.results,
        query,
        unresponsive: diagnostic.unresponsive,
        viaWikipedia: false,
      };
    }
    if (diagnostic.unresponsive.length > 0) {
      unresponsive = diagnostic.unresponsive;
    }
  }

  const wiki = await searchWikipedia(topic);
  return {
    results: wiki,
    query: topic,
    unresponsive,
    viaWikipedia: wiki.length > 0,
  };
}

export interface ImageResult {
  title: string;
  pageUrl: string;
  imgSrc: string;
  source: string;
}

/**
 * Wikimedia Commons image search. Independent from SearXNG engines, gives
 * full-resolution free photos without thumbnails or watermarks, and rarely
 * rate-limits. Used as the first source for photographic b-roll.
 */
export async function searchCommonsImages(
  query: string,
  limit = 12,
): Promise<ImageResult[]> {
  const normalized = query.replace(/\s+/g, " ").trim().slice(0, 120);
  if (normalized.length < 3) return [];

  // Commons butuh frasa yang persis ada di judul/deskripsi. Kalau frasa penuh
  // tidak menghasilkan apa pun, coba versi yang makin umum (kata terakhir)
  // supaya scene tetap dapat foto bertema, bukan plate kosong.
  const words = normalized.split(/\s+/).filter(Boolean);
  const variants = [normalized];
  if (words.length > 3) variants.push(words.slice(-3).join(" "));
  if (words.length > 2) variants.push(words.slice(-2).join(" "));

  const seen = new Set<string>();
  const out: ImageResult[] = [];

  for (const variant of variants) {
    const page = await commonsSearch(variant, limit);
    for (const item of page) {
      if (seen.has(item.imgSrc)) continue;
      seen.add(item.imgSrc);
      out.push(item);
    }
    if (out.length >= Math.min(limit, 10)) break;
  }

  return out.slice(0, limit);
}

async function commonsSearch(
  normalized: string,
  limit: number,
): Promise<ImageResult[]> {
  const url = new URL("https://commons.wikimedia.org/w/api.php");
  url.searchParams.set("action", "query");
  url.searchParams.set("format", "json");
  url.searchParams.set("generator", "search");
  url.searchParams.set("gsrsearch", `filetype:bitmap ${normalized}`);
  url.searchParams.set("gsrnamespace", "6");
  url.searchParams.set("gsrlimit", String(Math.min(30, Math.max(limit, 12))));
  url.searchParams.set("prop", "imageinfo");
  url.searchParams.set("iiprop", "url|size|mime");
  url.searchParams.set("iiurlwidth", "2000");

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 15_000);
  try {
    const response = await fetch(url, {
      headers: {
        Accept: "application/json",
        "User-Agent": "PabrikVideo/1.0 (research-agent)",
      },
      signal: controller.signal,
      cache: "no-store",
    });
    if (!response.ok) return [];

    const payload = (await response.json()) as {
      query?: {
        pages?: Record<
          string,
          {
            title?: string;
            imageinfo?: Array<{
              url?: string;
              thumburl?: string;
              width?: number;
              height?: number;
              mime?: string;
            }>;
          }
        >;
      };
    };
    const pages = Object.values(payload.query?.pages ?? {});

    return pages
      .flatMap((page) => {
        const info = page.imageinfo?.[0];
        const src = info?.thumburl || info?.url;
        if (!src || !/^image\/(jpeg|png|webp)/.test(info?.mime ?? "")) return [];
        return [
          {
            title: (page.title ?? "").replace(/^File:/, "").replace(/\.[a-z]+$/i, ""),
            pageUrl: info?.url ?? src,
            imgSrc: src,
            source: "upload.wikimedia.org",
          },
        ];
      })
      .slice(0, limit);
  } catch {
    return [];
  } finally {
    clearTimeout(timeout);
  }
}


function normalizeImages(payload: unknown, limit: number): ImageResult[] {
  if (!payload || typeof payload !== "object") return [];
  const results = (payload as { results?: unknown }).results;
  if (!Array.isArray(results)) return [];

  return results
    .slice(0, Math.max(limit * 3, 12))
    .map((item) => {
      const record = item as Record<string, unknown>;
      const imgSrc =
        (typeof record.img_src === "string" && record.img_src) ||
        (typeof record.thumbnail_src === "string" && record.thumbnail_src) ||
        "";
      let host = "";
      try {
        host = new URL(imgSrc).hostname;
      } catch {
        host = "";
      }
      return {
        title: typeof record.title === "string" ? record.title : "",
        pageUrl: typeof record.url === "string" ? record.url : "",
        imgSrc,
        source: host,
      };
    })
    .filter((item) => item.imgSrc.startsWith("http"))
    .slice(0, limit);
}

function imageEngineGroups(preferred?: string): Array<string | undefined> {
  const configured = (preferred ?? env.searxngImageEngines)
    .split(",")
    .map((engine) => engine.trim())
    .filter(Boolean);

  const groups: Array<string | undefined> = [];
  if (configured.length > 0) groups.push(configured.join(","));
  groups.push("bing images");
  groups.push("bing images,unsplash,wikimedia");
  groups.push(undefined);

  const seen = new Set<string>();
  return groups.filter((group) => {
    const key = group ?? "__default__";
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

/**
 * SearXNG image search. Returns direct image URLs; the caller downloads and
 * validates them (size, content-type, domain) before rendering.
 */
export async function searchImages(
  query: string,
  limit = 8,
  language?: string,
  /** Daftar engine SearXNG dipisah koma (mis. "unsplash"); kosong = semua engine kategori images. */
  engines?: string,
): Promise<ImageResult[]> {
  const normalized = query.replace(/\s+/g, " ").trim().slice(0, 100);
  if (normalized.length < 3) return [];

  for (const group of imageEngineGroups(engines)) {
    const url = new URL(`${env.searxngUrl}/search`);
    url.searchParams.set("q", normalized);
    url.searchParams.set("format", "json");
    url.searchParams.set("safesearch", "1");
    url.searchParams.set("categories", "images");
    if (language) url.searchParams.set("language", language);
    if (group) url.searchParams.set("engines", group);

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 15_000);

    try {
      const payload = await requestSearch(url, {
        q: normalized,
        format: "json",
        categories: "images",
        safesearch: "1",
        ...(language ? { language } : {}),
        ...(group ? { engines: group } : {}),
      });
      const results = normalizeImages(payload, limit);
      if (results.length > 0) return results;
    } catch {
      // try the next engine group
    } finally {
      clearTimeout(timeout);
    }
  }

  return [];
}
