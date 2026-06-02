import { NextRequest, NextResponse } from "next/server";
import { getSettings, setSettings } from "@/lib/settings";
import { SETTING_KEYS } from "@/lib/types";

export const dynamic = "force-dynamic";

export async function GET() {
  const settings = await getSettings();
  return NextResponse.json({ settings });
}

// PUT: persist settings. Accepts a partial settings object.
export async function PUT(req: NextRequest) {
  const body = await req.json().catch(() => ({}));
  const entries: Record<string, string> = {};

  if (body.serverName !== undefined) entries[SETTING_KEYS.serverName] = String(body.serverName);
  if (body.serverIp !== undefined) entries[SETTING_KEYS.serverIp] = String(body.serverIp);
  if (body.defaultCaptionStyle !== undefined)
    entries[SETTING_KEYS.defaultCaptionStyle] = String(body.defaultCaptionStyle);
  if (body.creditTagline !== undefined) entries[SETTING_KEYS.creditTagline] = String(body.creditTagline);
  if (body.mediaDir !== undefined) entries[SETTING_KEYS.mediaDir] = String(body.mediaDir);
  if (body.watchFolder !== undefined) entries[SETTING_KEYS.watchFolder] = String(body.watchFolder);
  if (body.defaultOverlay !== undefined)
    entries[SETTING_KEYS.defaultOverlay] = JSON.stringify(body.defaultOverlay);

  await setSettings(entries);
  return NextResponse.json({ settings: await getSettings() });
}
