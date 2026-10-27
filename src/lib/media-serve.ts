import { createReadStream, promises as fs } from "node:fs";
import path from "node:path";
import { Readable } from "node:stream";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function getMimeType(filePath: string): string {
  const ext = path.extname(filePath).toLowerCase();
  switch (ext) {
    case ".mp3":
      return "audio/mpeg";
    case ".wav":
      return "audio/wav";
    case ".ogg":
      return "audio/ogg";
    case ".mp4":
      return "video/mp4";
    case ".webm":
      return "video/webm";
    case ".jpg":
    case ".jpeg":
      return "image/jpeg";
    case ".png":
      return "image/png";
    case ".webp":
      return "image/webp";
    case ".svg":
      return "image/svg+xml";
    case ".json":
      return "application/json";
    default:
      return "application/octet-stream";
  }
}

export async function serveMediaFile(
  baseDir: string,
  slugs: string[],
  request: Request,
): Promise<Response> {
  const resolvedBase = path.resolve(baseDir);
  const targetPath = path.resolve(baseDir, ...slugs);

  // Prevent directory traversal attacks
  if (
    !targetPath.startsWith(resolvedBase + path.sep) &&
    targetPath !== resolvedBase
  ) {
    return new Response("Forbidden", { status: 403 });
  }

  let stat;
  try {
    stat = await fs.stat(targetPath);
    if (!stat.isFile()) {
      return new Response("Not Found", { status: 404 });
    }
  } catch {
    return new Response("Not Found", { status: 404 });
  }

  const fileSize = stat.size;
  const contentType = getMimeType(targetPath);
  const range = request.headers.get("range");

  if (range) {
    const match = range.match(/bytes=(\d*)-(\d*)/);
    if (!match) {
      return new Response(null, {
        status: 416,
        headers: { "Content-Range": `bytes */${fileSize}` },
      });
    }

    let start = match[1] ? parseInt(match[1], 10) : NaN;
    let end = match[2] ? parseInt(match[2], 10) : NaN;

    if (isNaN(start) && !isNaN(end)) {
      start = Math.max(0, fileSize - end);
      end = fileSize - 1;
    } else if (!isNaN(start) && isNaN(end)) {
      end = fileSize - 1;
    }

    if (isNaN(start) || isNaN(end) || start > end || start >= fileSize) {
      return new Response(null, {
        status: 416,
        headers: { "Content-Range": `bytes */${fileSize}` },
      });
    }

    end = Math.min(end, fileSize - 1);
    const chunkLength = end - start + 1;

    const stream = Readable.toWeb(createReadStream(targetPath, { start, end }));
    return new Response(stream as unknown as ReadableStream, {
      status: 206,
      headers: {
        "Content-Range": `bytes ${start}-${end}/${fileSize}`,
        "Accept-Ranges": "bytes",
        "Content-Length": String(chunkLength),
        "Content-Type": contentType,
        "Cache-Control": "public, max-age=3600, must-revalidate",
      },
    });
  }

  if (request.method === "HEAD") {
    return new Response(null, {
      status: 200,
      headers: {
        "Accept-Ranges": "bytes",
        "Content-Length": String(fileSize),
        "Content-Type": contentType,
        "Cache-Control": "public, max-age=3600, must-revalidate",
      },
    });
  }

  const stream = Readable.toWeb(createReadStream(targetPath));
  return new Response(stream as unknown as ReadableStream, {
    status: 200,
    headers: {
      "Accept-Ranges": "bytes",
      "Content-Length": String(fileSize),
      "Content-Type": contentType,
      "Cache-Control": "public, max-age=3600, must-revalidate",
    },
  });
}
