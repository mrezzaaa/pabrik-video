import { VIDEO_DIR } from "@/lib/media";
import { serveMediaFile } from "@/lib/media-serve";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ slug: string[] }> },
) {
  const { slug } = await params;
  return serveMediaFile(VIDEO_DIR, slug, request);
}

export async function HEAD(
  request: Request,
  { params }: { params: Promise<{ slug: string[] }> },
) {
  const { slug } = await params;
  return serveMediaFile(VIDEO_DIR, slug, request);
}
