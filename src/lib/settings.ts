import { prisma } from "./prisma";
import { SETTING_KEYS, DEFAULT_OVERLAY, type OverlayConfig } from "./types";
import { config } from "./config";

// Read every setting as a key->value map, falling back to sensible defaults
// (env / hard-coded) so the app works before anything is configured.
export async function getSettings() {
  const rows = await prisma.setting.findMany();
  const map = new Map(rows.map((r) => [r.key, r.value]));

  const get = (k: string, fallback: string) => map.get(k) ?? fallback;

  let defaultOverlay: OverlayConfig = DEFAULT_OVERLAY;
  const rawOverlay = map.get(SETTING_KEYS.defaultOverlay);
  if (rawOverlay) {
    try {
      defaultOverlay = { ...DEFAULT_OVERLAY, ...JSON.parse(rawOverlay) };
    } catch {
      /* keep default */
    }
  }

  return {
    serverName: get(SETTING_KEYS.serverName, DEFAULT_OVERLAY.serverName),
    serverIp: get(SETTING_KEYS.serverIp, DEFAULT_OVERLAY.serverIp),
    defaultCaptionStyle: get(SETTING_KEYS.defaultCaptionStyle, "karaoke"),
    creditTagline: get(SETTING_KEYS.creditTagline, "🎬 Recorded by {creator} • {server}"),
    mediaDir: get(SETTING_KEYS.mediaDir, config.mediaDir),
    watchFolder: get(SETTING_KEYS.watchFolder, config.watchFolder ?? ""),
    defaultOverlay,
  };
}

export type AppSettings = Awaited<ReturnType<typeof getSettings>>;

export async function setSetting(key: string, value: string) {
  return prisma.setting.upsert({
    where: { key },
    update: { value },
    create: { key, value },
  });
}

export async function setSettings(entries: Record<string, string>) {
  await prisma.$transaction(
    Object.entries(entries).map(([key, value]) =>
      prisma.setting.upsert({ where: { key }, update: { value }, create: { key, value } }),
    ),
  );
}

// Build the credit line for an exported post, given the footage creator.
export function renderCreditTagline(template: string, creator: string | null, server: string): string {
  return template
    .replaceAll("{creator}", creator || "a friend")
    .replaceAll("{server}", server);
}
