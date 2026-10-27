import { IMAGE_DIR } from "@/lib/images";
import { serveMediaFile } from "@/lib/media-serve";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ slug: string[] }> },
) {
  const { slug } = await params;
  return serveMediaFile(IMAGE_DIR, slug, request);
}

export async function HEAD(
  request: Request,
  { params }: { params: Promise<{ slug: string[] }> },
) {
  const { slug } = await params;
  return serveMediaFile(IMAGE_DIR, slug, request);
}
