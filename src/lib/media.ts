import fs from "node:fs/promises";
import path from "node:path";
import { config, mediaPaths } from "./config";

// Ensure all MEDIA_DIR sub-directories exist. Safe to call repeatedly.
export async function ensureMediaDirs(): Promise<void> {
  await Promise.all(
    Object.values(mediaPaths).map((p) => fs.mkdir(p, { recursive: true })),
  );
}

export function sourcePathFor(filename: string): string {
  return path.join(mediaPaths.source, filename);
}

export function clipPathFor(clipId: string): string {
  return path.join(mediaPaths.clips, `${clipId}.mp4`);
}

export function thumbnailPathFor(clipId: string): string {
  return path.join(mediaPaths.thumbnails, `${clipId}.jpg`);
}

// Video file extensions we accept for import / watch-folder pickup.
export const VIDEO_EXTENSIONS = [".mp4", ".mov", ".mkv", ".webm", ".avi", ".m4v"];

export function isVideoFile(filename: string): boolean {
  return VIDEO_EXTENSIONS.includes(path.extname(filename).toLowerCase());
}

// Make a filesystem-safe, collision-resistant filename for an imported video.
export function safeImportName(originalName: string): string {
  const ext = path.extname(originalName).toLowerCase() || ".mp4";
  const base = path
    .basename(originalName, path.extname(originalName))
    .replace(/[^a-zA-Z0-9-_]+/g, "_")
    .slice(0, 60)
    .replace(/^_+|_+$/g, "");
  const stamp = Date.now().toString(36);
  return `${base || "clip"}_${stamp}${ext}`;
}

// Convert an absolute media path into a URL served by /api/media/[...path].
export function mediaUrl(absPath: string | null | undefined): string | null {
  if (!absPath) return null;
  const rel = path.relative(config.mediaDir, absPath);
  if (rel.startsWith("..")) return null; // outside MEDIA_DIR, refuse
  return `/api/media/${rel.split(path.sep).map(encodeURIComponent).join("/")}`;
}
