import "dotenv/config"; // load .env for the standalone worker process (Next loads it for the app)
import { Worker } from "bullmq";
import { connection, QUEUE_NAMES } from "../src/lib/queue";
import { prisma } from "../src/lib/prisma";
import { config } from "../src/lib/config";
import { ensureMediaDirs, clipPathFor, thumbnailPathFor } from "../src/lib/media";
import { notifyClipReady } from "../src/lib/integrations/discord";
import { DEFAULT_OVERLAY, type AnalyzeResult, type RenderResult, type OverlayConfig } from "../src/lib/types";
import { runPython } from "./runPython";

// ---------------------------------------------------------------------------
// CreeperClips background worker. Consumes BullMQ jobs and delegates the heavy
// video processing to the Python scripts in ./python.
// ---------------------------------------------------------------------------

async function main() {
  await ensureMediaDirs();
  console.log("🟢 CreeperClips worker starting");
  console.log(`   redis:   ${config.redisUrl}`);
  console.log(`   python:  ${config.pythonBin} (whisper=${config.whisperModel}, device=${config.whisperDevice})`);
  console.log(`   media:   ${config.mediaDir}`);

  // ---- ANALYZE: probe + transcribe + detect highlights ----
  const analyzeWorker = new Worker<{ sourceVideoId: string }>(
    QUEUE_NAMES.analyze,
    async (job) => {
      const { sourceVideoId } = job.data;
      const video = await prisma.sourceVideo.findUnique({ where: { id: sourceVideoId } });
      if (!video) throw new Error(`SourceVideo ${sourceVideoId} not found`);

      await prisma.sourceVideo.update({ where: { id: sourceVideoId }, data: { status: "processing" } });

      const result = await runPython<AnalyzeResult>("analyze.py", {
        videoPath: video.originalPath,
      });

      // Replace any prior highlights, then write the freshly detected ones.
      await prisma.$transaction([
        prisma.highlight.deleteMany({ where: { sourceVideoId } }),
        prisma.sourceVideo.update({
          where: { id: sourceVideoId },
          data: {
            durationSec: result.durationSec,
            width: result.width,
            height: result.height,
            status: "analyzed",
            errorMessage: null,
          },
        }),
        prisma.highlight.createMany({
          data: result.highlights.map((h) => ({
            sourceVideoId,
            startSec: h.startSec,
            endSec: h.endSec,
            score: h.score,
            reason: h.reason,
            transcriptSnippet: h.transcriptSnippet ?? null,
          })),
        }),
      ]);

      return { highlights: result.highlights.length };
    },
    { connection, concurrency: 1 },
  );

  // ---- RENDER: cut + 9:16 reframe + captions + branding overlay + thumbnail ----
  const renderWorker = new Worker<{ clipId: string }>(
    QUEUE_NAMES.render,
    async (job) => {
      const { clipId } = job.data;
      const clip = await prisma.clip.findUnique({
        where: { id: clipId },
        include: { sourceVideo: true },
      });
      if (!clip) throw new Error(`Clip ${clipId} not found`);

      await prisma.clip.update({ where: { id: clipId }, data: { status: "rendering", errorMessage: null } });

      const overlay = (clip.overlayConfig as unknown as OverlayConfig) || DEFAULT_OVERLAY;

      const result = await runPython<RenderResult>("render.py", {
        videoPath: clip.sourceVideo.originalPath,
        outputPath: clipPathFor(clipId),
        thumbnailPath: thumbnailPathFor(clipId),
        startSec: clip.startSec,
        endSec: clip.endSec,
        captionStyle: clip.captionStyle,
        overlay,
        creatorName: clip.sourceVideo.creatorName,
      });

      await prisma.clip.update({
        where: { id: clipId },
        data: {
          status: "ready",
          outputPath: result.outputPath,
          thumbnailPath: result.thumbnailPath,
          durationSec: result.durationSec,
        },
      });

      await notifyClipReady({
        title: clip.title,
        clipId,
        durationSec: result.durationSec,
        creatorName: clip.sourceVideo.creatorName,
      });

      return { outputPath: result.outputPath };
    },
    { connection, concurrency: 1 },
  );

  // ---- Failure handling: mark the row as error + log the underlying output ----
  analyzeWorker.on("failed", async (job, err) => {
    console.error(`[analyze] job ${job?.id} failed:`, err.message);
    if (job?.data.sourceVideoId) {
      await prisma.sourceVideo
        .update({
          where: { id: job.data.sourceVideoId },
          data: { status: "error", errorMessage: err.message.slice(0, 2000) },
        })
        .catch(() => {});
    }
  });

  renderWorker.on("failed", async (job, err) => {
    console.error(`[render] job ${job?.id} failed:`, err.message);
    if (job?.data.clipId) {
      await prisma.clip
        .update({
          where: { id: job.data.clipId },
          data: { status: "error", errorMessage: err.message.slice(0, 2000) },
        })
        .catch(() => {});
    }
  });

  analyzeWorker.on("completed", (job) => console.log(`[analyze] ✅ ${job.id}`));
  renderWorker.on("completed", (job) => console.log(`[render] ✅ ${job.id}`));

  const shutdown = async () => {
    console.log("\n🔻 shutting down worker…");
    await Promise.allSettled([analyzeWorker.close(), renderWorker.close()]);
    await prisma.$disconnect();
    process.exit(0);
  };
  process.on("SIGINT", shutdown);
  process.on("SIGTERM", shutdown);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
