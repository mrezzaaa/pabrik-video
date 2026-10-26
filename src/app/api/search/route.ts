import { NextResponse } from "next/server";
import { z } from "zod";
import { searchWeb } from "@/lib/searxng";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const bodySchema = z.object({
  query: z.string().trim().min(2).max(300),
});

async function runSearch(query: string) {
  try {
    const results = await searchWeb(query);
    return NextResponse.json({ query, count: results.length, results });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Pencarian gagal." },
      { status: 502 },
    );
  }
}

export async function GET(request: Request) {
  const query = new URL(request.url).searchParams.get("q") ?? "";
  const parsed = bodySchema.safeParse({ query });
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Query minimal 2 karakter." },
      { status: 400 },
    );
  }
  return runSearch(parsed.data.query);
}

export async function POST(request: Request) {
  let payload: unknown;
  try {
    payload = await request.json();
  } catch {
    return NextResponse.json({ error: "Body JSON tidak valid." }, { status: 400 });
  }

  const parsed = bodySchema.safeParse(payload);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Query minimal 2 karakter." },
      { status: 400 },
    );
  }
  return runSearch(parsed.data.query);
}
