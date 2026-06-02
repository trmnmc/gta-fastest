import { NextRequest, NextResponse } from "next/server";
import fs from "node:fs";
import { pipeline } from "node:stream/promises";
import { Readable } from "node:stream";
import { prisma } from "@/lib/prisma";
import { ensureMediaDirs, sourcePathFor, safeImportName, isVideoFile } from "@/lib/media";
import { enqueueAnalyze } from "@/lib/queue";

export const dynamic = "force-dynamic";
// Large uploads: stream to disk rather than buffering in memory.
export const maxDuration = 600;

// Batch upload of one or more source video files (multipart/form-data, field "files").
export async function POST(req: NextRequest) {
  await ensureMediaDirs();

  const form = await req.formData();
  const files = form.getAll("files").filter((f): f is File => f instanceof File);
  const creatorName = (form.get("creatorName") as string | null)?.trim() || null;

  if (files.length === 0) {
    return NextResponse.json({ error: "No files provided" }, { status: 400 });
  }

  const created = [];
  for (const file of files) {
    if (!isVideoFile(file.name)) {
      return NextResponse.json({ error: `Unsupported file type: ${file.name}` }, { status: 400 });
    }
    const filename = safeImportName(file.name);
    const destPath = sourcePathFor(filename);

    // Stream the upload straight to disk.
    await pipeline(
      Readable.fromWeb(file.stream() as unknown as Parameters<typeof Readable.fromWeb>[0]),
      fs.createWriteStream(destPath),
    );

    const video = await prisma.sourceVideo.create({
      data: { filename, originalPath: destPath, status: "imported", creatorName },
    });
    await enqueueAnalyze(video.id);
    created.push(video);
  }

  return NextResponse.json({ created }, { status: 201 });
}
