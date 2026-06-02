import { PrismaClient } from "@prisma/client";
import { DEFAULT_OVERLAY, SETTING_KEYS } from "../src/lib/types";

// Seeds default settings plus a couple of demo fixtures so the UI has something
// to show before any real footage is imported. Safe to run repeatedly (idempotent).
const prisma = new PrismaClient();

async function main() {
  // ---- Default settings ----
  const settings: Record<string, string> = {
    [SETTING_KEYS.serverName]: "Creeper Craft SMP",
    [SETTING_KEYS.serverIp]: "play.creepercraft.net",
    [SETTING_KEYS.defaultCaptionStyle]: "karaoke",
    [SETTING_KEYS.creditTagline]: "🎬 Recorded by {creator} • {server}",
    [SETTING_KEYS.defaultOverlay]: JSON.stringify({
      ...DEFAULT_OVERLAY,
      serverName: "Creeper Craft SMP",
      serverIp: "play.creepercraft.net",
      cta: "Join: play.creepercraft.net",
    }),
  };
  for (const [key, value] of Object.entries(settings)) {
    await prisma.setting.upsert({ where: { key }, update: {}, create: { key, value } });
  }

  // ---- Demo source video + highlights + a clip (only if DB is empty) ----
  const existing = await prisma.sourceVideo.count();
  if (existing === 0) {
    const video = await prisma.sourceVideo.create({
      data: {
        filename: "demo_pvp_session.mp4",
        originalPath: "/media/source/demo_pvp_session.mp4",
        durationSec: 1830,
        width: 1920,
        height: 1080,
        status: "analyzed",
        creatorName: "Steve",
      },
    });

    const highlights = await prisma.$transaction([
      prisma.highlight.create({
        data: {
          sourceVideoId: video.id,
          startSec: 142.5,
          endSec: 158.0,
          score: 0.94,
          reason: "loudness",
          transcriptSnippet: "NO WAY he just creeper-trapped the whole base!",
        },
      }),
      prisma.highlight.create({
        data: {
          sourceVideoId: video.id,
          startSec: 612.0,
          endSec: 628.5,
          score: 0.88,
          reason: "scene_change",
          transcriptSnippet: "ender dragon phase two, hold on hold on",
        },
      }),
      prisma.highlight.create({
        data: {
          sourceVideoId: video.id,
          startSec: 1290.0,
          endSec: 1305.0,
          score: 0.81,
          reason: "speech",
          transcriptSnippet: "this is the rarest drop in the entire game",
        },
      }),
    ]);

    await prisma.clip.create({
      data: {
        sourceVideoId: video.id,
        highlightId: highlights[0].id,
        title: "Creeper trap wipes the whole base 😱",
        status: "draft",
        startSec: highlights[0].startSec,
        endSec: highlights[0].endSec,
        durationSec: highlights[0].endSec - highlights[0].startSec,
        captionStyle: "karaoke",
        overlayConfig: {
          ...DEFAULT_OVERLAY,
          serverName: "Creeper Craft SMP",
          serverIp: "play.creepercraft.net",
          cta: "Join: play.creepercraft.net",
        },
      },
    });
  }

  console.log("✅ Seed complete");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
