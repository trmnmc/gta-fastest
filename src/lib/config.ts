import path from "node:path";

// Centralised, validated access to environment configuration. Imported by both
// the Next.js server runtime and the worker.

function required(name: string, fallback?: string): string {
  const v = process.env[name] ?? fallback;
  if (v === undefined) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return v;
}

export const config = {
  databaseUrl: required("DATABASE_URL", "postgresql://creeper:creeper@localhost:5432/creeperclips?schema=public"),
  redisUrl: required("REDIS_URL", "redis://localhost:6379"),

  // MEDIA_DIR is resolved to an absolute path so the worker and web app agree
  // regardless of the cwd they were launched from.
  mediaDir: path.resolve(process.env.MEDIA_DIR || "./media"),

  watchFolder: process.env.WATCH_FOLDER?.trim() || null,

  pythonBin: process.env.PYTHON_BIN || "python3",
  whisperModel: process.env.WHISPER_MODEL || "base",
  whisperDevice: process.env.WHISPER_DEVICE || "cpu",

  discordWebhookUrl: process.env.DISCORD_WEBHOOK_URL?.trim() || null,

  // Optional direct-posting feature flag (off by default).
  directPostingEnabled: (process.env.ENABLE_DIRECT_POSTING || "false") === "true",
} as const;

// Media sub-directories.
export const mediaPaths = {
  source: path.join(config.mediaDir, "source"),
  clips: path.join(config.mediaDir, "clips"),
  thumbnails: path.join(config.mediaDir, "thumbnails"),
  exports: path.join(config.mediaDir, "exports"),
  audio: path.join(config.mediaDir, "audio"), // scratch audio for transcription
};
