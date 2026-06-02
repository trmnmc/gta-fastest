import { config } from "../config";

// Optional Discord webhook notification fired when a clip becomes ready.
// No-op if DISCORD_WEBHOOK_URL is unset.
export async function notifyClipReady(opts: {
  title: string | null;
  clipId: string;
  durationSec: number | null;
  creatorName: string | null;
}): Promise<void> {
  if (!config.discordWebhookUrl) return;

  const content = [
    "🎬 **New CreeperClips short is ready!**",
    opts.title ? `**${opts.title}**` : null,
    opts.durationSec ? `Length: ${opts.durationSec.toFixed(1)}s` : null,
    opts.creatorName ? `Footage by: ${opts.creatorName}` : null,
  ]
    .filter(Boolean)
    .join("\n");

  try {
    await fetch(config.discordWebhookUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ content, username: "CreeperClips" }),
    });
  } catch (err) {
    // Notifications are best-effort; never fail a job because Discord is down.
    console.warn("[discord] notification failed:", (err as Error).message);
  }
}
