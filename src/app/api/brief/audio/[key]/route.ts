import { createReadStream } from "node:fs";
import { Readable } from "node:stream";
import { fileBriefs, isBriefKey } from "@/lib/brief/assemble";

// Streams a stitched morning brief (MP3 when the server has ffmpeg, else WAV),
// with byte ranges so the player can seek to a chapter without downloading the
// whole file. The page stitches and stores the file; this only reads it. Behind
// the site password like every page. With SSO (phase B5), check the key belongs
// to the signed-in user's brief run before serving it.

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: Request, { params }: { params: Promise<{ key: string }> }) {
  const { key } = await params;
  if (!isBriefKey(key)) return new Response("Not found", { status: 404 });
  const file = await fileBriefs().file(key);
  if (!file) return new Response("Not found", { status: 404 });

  const headers: Record<string, string> = {
    "content-type": file.type,
    "accept-ranges": "bytes",
    // A key names fixed audio, so a browser can keep it for the day.
    "cache-control": "private, max-age=86400, immutable",
  };
  const range = /^bytes=(\d*)-(\d*)$/.exec(req.headers.get("range") ?? "");
  if (range && (range[1] || range[2])) {
    // "bytes=500-" from 500 on; "bytes=-500" the last 500 bytes.
    let start = range[1] ? Number(range[1]) : Math.max(0, file.size - Number(range[2]));
    let end = range[1] && range[2] ? Number(range[2]) : file.size - 1;
    end = Math.min(end, file.size - 1);
    if (start > end || start >= file.size) {
      return new Response(null, { status: 416, headers: { ...headers, "content-range": `bytes */${file.size}` } });
    }
    start = Math.max(0, start);
    const body = Readable.toWeb(createReadStream(file.path, { start, end })) as ReadableStream;
    return new Response(body, {
      status: 206,
      headers: { ...headers, "content-range": `bytes ${start}-${end}/${file.size}`, "content-length": String(end - start + 1) },
    });
  }
  const body = Readable.toWeb(createReadStream(file.path)) as ReadableStream;
  return new Response(body, { headers: { ...headers, "content-length": String(file.size) } });
}
