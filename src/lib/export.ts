import fsp from "node:fs/promises";
import path from "node:path";
import { prisma } from "./prisma";
import { mediaPaths } from "./config";
import { getSettings, renderCreditTagline } from "./settings";

// Copies a clip's rendered mp4 + thumbnail into an export folder and writes a
// caption.txt (with the auto-appended credit tagline). This is the default
// "export for manual upload" path — no third-party APIs involved.
export async function exportClip(clipId: string): Promise<{ exportDir: string }> {
  const clip = await prisma.clip.findUnique({
    where: { id: clipId },
    include: { sourceVideo: true },
  });
  if (!clip) throw new Error("Clip not found");
  if (clip.status !== "ready" || !clip.outputPath) {
    throw new Error("Clip is not rendered yet");
  }

  const settings = await getSettings();
  const exportDir = path.join(mediaPaths.exports, clipId);
  await fsp.mkdir(exportDir, { recursive: true });

  await fsp.copyFile(clip.outputPath, path.join(exportDir, `${clip.title || clipId}.mp4`).replace(/[^\w.\-/ ]+/g, "_"));
  if (clip.thumbnailPath) {
    await fsp.copyFile(clip.thumbnailPath, path.join(exportDir, "thumbnail.jpg")).catch(() => {});
  }

  const credit = renderCreditTagline(
    settings.creditTagline,
    clip.sourceVideo.creatorName,
    settings.serverName,
  );
  const caption = [clip.title || "", "", credit, `▶ ${settings.serverIp}`].join("\n");
  await fsp.writeFile(path.join(exportDir, "caption.txt"), caption, "utf8");

  return { exportDir };
}
