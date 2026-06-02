import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

// List all source videos with clip/highlight counts for the Library page.
export async function GET() {
  const videos = await prisma.sourceVideo.findMany({
    orderBy: { createdAt: "desc" },
    include: { _count: { select: { highlights: true, clips: true } } },
  });
  return NextResponse.json({ videos });
}
