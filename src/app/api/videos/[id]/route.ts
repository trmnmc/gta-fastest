import { NextRequest, NextResponse } from "next/server";
import fsp from "node:fs/promises";
import { prisma } from "@/lib/prisma";
import { enqueueAnalyze } from "@/lib/queue";

export const dynamic = "force-dynamic";

export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  const video = await prisma.sourceVideo.findUnique({
    where: { id: params.id },
    include: {
      highlights: { orderBy: { score: "desc" } },
      clips: { orderBy: { createdAt: "desc" } },
    },
  });
  if (!video) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json({ video });
}

// PATCH: update creatorName, or re-trigger analysis (?action=reanalyze).
export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const body = await req.json().catch(() => ({}));
  if (body.action === "reanalyze") {
    await prisma.sourceVideo.update({ where: { id: params.id }, data: { status: "imported", errorMessage: null } });
    await enqueueAnalyze(params.id);
    return NextResponse.json({ ok: true });
  }
  const video = await prisma.sourceVideo.update({
    where: { id: params.id },
    data: { creatorName: body.creatorName ?? undefined },
  });
  return NextResponse.json({ video });
}

// DELETE: remove DB row and (best-effort) the source file on disk.
export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  const video = await prisma.sourceVideo.findUnique({ where: { id: params.id } });
  if (!video) return NextResponse.json({ error: "Not found" }, { status: 404 });
  await prisma.sourceVideo.delete({ where: { id: params.id } });
  await fsp.rm(video.originalPath, { force: true }).catch(() => {});
  return NextResponse.json({ ok: true });
}
