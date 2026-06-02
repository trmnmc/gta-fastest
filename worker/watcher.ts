import fs from "node:fs";
import fsp from "node:fs/promises";
import path from "node:path";
import chokidar from "chokidar";
import { config } from "../src/lib/config";
import { prisma } from "../src/lib/prisma";
import { ensureMediaDirs, sourcePathFor, safeImportName, isVideoFile } from "../src/lib/media";
import { enqueueAnalyze } from "../src/lib/queue";
import { getSettings } from "../src/lib/settings";

// Optional watch-folder importer. When WATCH_FOLDER (env or Settings) is set,
// any new video file dropped there (e.g. a synced Dropbox/Drive folder) is
// copied into MEDIA_DIR/source, registered, and queued for analysis.

async function resolveWatchFolder(): Promise<string | null> {
  const settings = await getSettings().catch(() => null);
  const folder = settings?.watchFolder || config.watchFolder;
  return folder?.trim() || null;
}

// Wait until a file's size stops changing — avoids importing half-copied files.
async function waitUntilStable(filePath: string, quietMs = 3000): Promise<boolean> {
  let lastSize = -1;
  for (let i = 0; i < 200; i++) {
    let size: number;
    try {
      size = (await fsp.stat(filePath)).size;
    } catch {
      return false;
    }
    if (size === lastSize && size > 0) return true;
    lastSize = size;
    await new Promise((r) => setTimeout(r, quietMs));
  }
  return true;
}

async function importFile(srcPath: string) {
  const name = path.basename(srcPath);
  if (!isVideoFile(name)) return;

  // Skip if we've already imported a file with this original basename today-ish.
  const stable = await waitUntilStable(srcPath);
  if (!stable) return;

  const filename = safeImportName(name);
  const dest = sourcePathFor(filename);
  await fsp.copyFile(srcPath, dest);

  const video = await prisma.sourceVideo.create({
    data: { filename, originalPath: dest, status: "imported", creatorName: null },
  });
  await enqueueAnalyze(video.id);
  console.log(`[watch] imported ${name} -> ${filename} (${video.id})`);
}

async function main() {
  await ensureMediaDirs();
  const folder = await resolveWatchFolder();
  if (!folder) {
    console.log("[watch] WATCH_FOLDER not set — watcher idle. Set it in .env or Settings to enable.");
    return;
  }
  if (!fs.existsSync(folder)) {
    console.error(`[watch] folder does not exist: ${folder}`);
    process.exit(1);
  }

  console.log(`👀 Watching ${folder} for new gameplay files…`);
  chokidar
    .watch(folder, { ignoreInitial: true, depth: 0, awaitWriteFinish: false })
    .on("add", (p) => {
      importFile(p).catch((e) => console.error("[watch] import failed:", e.message));
    });
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
