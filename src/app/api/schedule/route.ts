import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

// List scheduled posts (optionally within a date window for the calendar).
export async function GET(req: NextRequest) {
  const url = new URL(req.url);
  const from = url.searchParams.get("from");
  const to = url.searchParams.get("to");
  const posts = await prisma.scheduledPost.findMany({
    where:
      from && to ? { scheduledAt: { gte: new Date(from), lte: new Date(to) } } : undefined,
    orderBy: { scheduledAt: "asc" },
    include: {
      clip: {
        select: { id: true, title: true, status: true, thumbnailPath: true, outputPath: true },
      },
    },
  });
  return NextResponse.json({ posts });
}

// Create a planned post for a clip.
export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}));
  const { clipId, platform, scheduledAt, notes } = body as {
    clipId?: string;
    platform?: string;
    scheduledAt?: string;
    notes?: string;
  };
  if (!clipId || !scheduledAt) {
    return NextResponse.json({ error: "clipId and scheduledAt required" }, { status: 400 });
  }
  const post = await prisma.scheduledPost.create({
    data: {
      clipId,
      platform: (platform as never) || "manual",
      scheduledAt: new Date(scheduledAt),
      notes: notes ?? null,
    },
  });
  return NextResponse.json({ post }, { status: 201 });
}
