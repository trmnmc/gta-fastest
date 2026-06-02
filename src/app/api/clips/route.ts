import { NextRequest, NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { enqueueRender } from "@/lib/queue";
import { getSettings } from "@/lib/settings";
import { DEFAULT_OVERLAY } from "@/lib/types";

export const dynamic = "force-dynamic";

// List clips (optionally filtered by ?status=ready or ?sourceVideoId=...).
export async function GET(req: NextRequest) {
  const url = new URL(req.url);
  const status = url.searchParams.get("status") || undefined;
  const sourceVideoId = url.searchParams.get("sourceVideoId") || undefined;
  const clips = await prisma.clip.findMany({
    where: {
      status: status as never,
      sourceVideoId,
    },
    orderBy: { createdAt: "desc" },
    include: { sourceVideo: { select: { filename: true, creatorName: true } } },
  });
  return NextResponse.json({ clips });
}

// Create a clip from a highlight (or a manual in/out range), then enqueue render.
export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}));
  const { sourceVideoId, highlightId, startSec, endSec, title } = body as {
    sourceVideoId?: string;
    highlightId?: string;
    startSec?: number;
    endSec?: number;
    title?: string;
  };

  let resolvedSourceId = sourceVideoId;
  let start = startSec;
  let end = endSec;

  if (highlightId) {
    const hl = await prisma.highlight.findUnique({ where: { id: highlightId } });
    if (!hl) return NextResponse.json({ error: "Highlight not found" }, { status: 404 });
    resolvedSourceId = hl.sourceVideoId;
    start = start ?? hl.startSec;
    end = end ?? hl.endSec;
  }

  if (!resolvedSourceId || start == null || end == null || end <= start) {
    return NextResponse.json({ error: "sourceVideoId, startSec and endSec (end>start) required" }, { status: 400 });
  }

  const settings = await getSettings();
  const clip = await prisma.clip.create({
    data: {
      sourceVideoId: resolvedSourceId,
      highlightId: highlightId ?? null,
      title: title ?? null,
      startSec: start,
      endSec: end,
      durationSec: end - start,
      captionStyle: settings.defaultCaptionStyle,
      overlayConfig: (settings.defaultOverlay ?? DEFAULT_OVERLAY) as unknown as Prisma.InputJsonObject,
      status: "draft",
    },
  });

  await prisma.clip.update({ where: { id: clip.id }, data: { status: "rendering" } });
  await enqueueRender(clip.id);

  return NextResponse.json({ clip }, { status: 201 });
}
