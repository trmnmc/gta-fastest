import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { exportClip } from "@/lib/export";
import { isDirectPostingEnabled, postToPlatform, type Platform } from "@/lib/integrations/posting";

export const dynamic = "force-dynamic";

// Export a scheduled post's clip to a folder (default) OR, if direct posting is
// enabled and the platform is supported, attempt a direct upload.
export async function POST(_req: NextRequest, { params }: { params: { id: string } }) {
  const post = await prisma.scheduledPost.findUnique({
    where: { id: params.id },
    include: { clip: { include: { sourceVideo: true } } },
  });
  if (!post) return NextResponse.json({ error: "Not found" }, { status: 404 });

  try {
    const { exportDir } = await exportClip(post.clipId);

    // Optional direct posting (only when explicitly enabled + a real platform).
    let posted = false;
    if (
      isDirectPostingEnabled() &&
      post.platform !== "manual" &&
      post.clip.outputPath
    ) {
      await postToPlatform(post.platform as Platform, {
        videoPath: post.clip.outputPath,
        caption: post.clip.title || "",
      });
      posted = true;
    }

    const updated = await prisma.scheduledPost.update({
      where: { id: params.id },
      data: { status: posted ? "posted" : "exported", exportPath: exportDir },
    });
    return NextResponse.json({ post: updated, exportDir, posted });
  } catch (err) {
    return NextResponse.json({ error: (err as Error).message }, { status: 400 });
  }
}
