import { env } from "./env";

export interface SearchResult {
  title: string;
  url: string;
  content: string;
}

const MAX_RESULTS = 10;

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

export async function searchWeb(query: string): Promise<SearchResult[]> {
  const url = new URL(`${env.searxngUrl}/search`);
  url.searchParams.set("q", query);
  url.searchParams.set("format", "json");
  url.searchParams.set("language", "id-ID");
  url.searchParams.set("safesearch", "0");
  url.searchParams.set("categories", "general");

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 20_000);

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
      response = await fetch(`${env.searxngUrl}/search`, {
        method: "POST",
        headers: {
          Accept: "application/json",
          "Content-Type": "application/x-www-form-urlencoded",
        },
        body: new URLSearchParams({
          q: query,
          format: "json",
          language: "id-ID",
        }).toString(),
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

    return normalizeResults(await response.json());
  } finally {
    clearTimeout(timeout);
  }
}
