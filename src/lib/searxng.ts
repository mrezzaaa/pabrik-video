export interface SearxResult {
  title: string;
  url: string;
  content?: string;
  img_src?: string;
  thumbnail_src?: string;
  resolution?: string;
}

export interface SearxSearchResponse {
  query: string;
  number_of_results: number;
  results: SearxResult[];
  answers?: string[];
  infoboxes?: Array<{ infobox: string; id: string; content: string }>;
}

export interface KnowledgeSnippet {
  title: string;
  snippet: string;
  url: string;
}

export class SearxngService {
  private baseUrl: string;

  constructor(baseUrl?: string) {
    this.baseUrl = baseUrl || process.env.SEARXNG_URL || "http://searxng:8080";
  }

  /**
   * Search general text sources for recon facts
   */
  async searchGeneral(query: string): Promise<KnowledgeSnippet[]> {
    try {
      const url = new URL("/search", this.baseUrl);
      url.searchParams.set("q", query);
      url.searchParams.set("format", "json");
      url.searchParams.set("language", "id-ID");
      url.searchParams.set("categories", "general");

      const res = await fetch(url.toString(), {
        headers: { Accept: "application/json" },
        signal: AbortSignal.timeout(12000),
      });

      if (!res.ok) {
        throw new Error(`SearXNG HTTP ${res.status}: ${res.statusText}`);
      }

      const data = (await res.json()) as SearxSearchResponse;
      if (!data.results || !Array.isArray(data.results)) {
        return [];
      }

      return data.results.slice(0, 5).map((r) => ({
        title: r.title || "Snippet",
        snippet: r.content || r.title || "",
        url: r.url || "",
      }));
    } catch (error) {
      console.warn(`[SEARXNG] General search failed for query "${query}":`, error);
      return [];
    }
  }

  /**
   * Search image sources for high quality visual assets
   */
  async searchImages(query: string): Promise<string[]> {
    try {
      const url = new URL("/search", this.baseUrl);
      url.searchParams.set("q", query);
      url.searchParams.set("format", "json");
      url.searchParams.set("categories", "images");

      const res = await fetch(url.toString(), {
        headers: { Accept: "application/json" },
        signal: AbortSignal.timeout(12000),
      });

      if (!res.ok) {
        throw new Error(`SearXNG Images HTTP ${res.status}: ${res.statusText}`);
      }

      const data = (await res.json()) as SearxSearchResponse;
      if (!data.results || !Array.isArray(data.results)) {
        return [];
      }

      // Collect image URLs from img_src, thumbnail_src, or url
      const imageUrls: string[] = [];
      for (const item of data.results) {
        const candidate = item.img_src || item.thumbnail_src || item.url;
        if (candidate && candidate.startsWith("http")) {
          imageUrls.push(candidate);
        }
      }

      return Array.from(new Set(imageUrls));
    } catch (error) {
      console.warn(`[SEARXNG] Image search failed for query "${query}":`, error);
      return [];
    }
  }

  /**
   * Synthesize snippets from multiple queries into structured knowledge base
   */
  async aggregateKnowledge(queries: string[]): Promise<string> {
    const allSnippets: KnowledgeSnippet[] = [];

    for (const q of queries) {
      const snippets = await this.searchGeneral(q);
      allSnippets.push(...snippets);
    }

    if (allSnippets.length === 0) {
      return "Fakta teknis dan detail operasional mengenai topik ini.";
    }

    // Deduplicate by URL/title and format as bullet facts
    const seen = new Set<string>();
    const formatted: string[] = [];

    for (const s of allSnippets) {
      const key = s.snippet.slice(0, 40).toLowerCase();
      if (!seen.has(key) && s.snippet.trim().length > 15) {
        seen.add(key);
        formatted.push(`- ${s.title}: ${s.snippet.trim()}`);
      }
    }

    return formatted.slice(0, 12).join("\n");
  }
}

export const searxng = new SearxngService();
