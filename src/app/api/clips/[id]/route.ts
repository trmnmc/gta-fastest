import { NextRequest, NextResponse } from "next/server";
import fsp from "node:fs/promises";
import { prisma } from "@/lib/prisma";
import { enqueueRender } from "@/lib/queue";

export const dynamic = "force-dynamic";

export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  const clip = await prisma.clip.findUnique({
    where: { id: params.id },
    include: { sourceVideo: true, highlight: true },
  });
  if (!clip) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json({ clip });
}

// PATCH: edit caption style / overlay / title / in-out, optionally re-render.
export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const body = await req.json().catch(() => ({}));
  const data: Record<string, unknown> = {};
  if (body.title !== undefined) data.title = body.title;
  if (body.captionStyle !== undefined) data.captionStyle = body.captionStyle;
  if (body.overlayConfig !== undefined) data.overlayConfig = body.overlayConfig;
  if (body.startSec !== undefined) data.startSec = body.startSec;
  if (body.endSec !== undefined) data.endSec = body.endSec;
  if (body.startSec !== undefined && body.endSec !== undefined) {
    data.durationSec = body.endSec - body.startSec;
  }

  if (body.rerender) {
    data.status = "rendering";
    data.errorMessage = null;
  }

  const clip = await prisma.clip.update({ where: { id: params.id }, data });
  if (body.rerender) await enqueueRender(clip.id);
  return NextResponse.json({ clip });
}

export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  const clip = await prisma.clip.findUnique({ where: { id: params.id } });
  if (!clip) return NextResponse.json({ error: "Not found" }, { status: 404 });
  await prisma.clip.delete({ where: { id: params.id } });
  if (clip.outputPath) await fsp.rm(clip.outputPath, { force: true }).catch(() => {});
  if (clip.thumbnailPath) await fsp.rm(clip.thumbnailPath, { force: true }).catch(() => {});
  return NextResponse.json({ ok: true });
}
