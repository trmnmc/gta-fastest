// Shared types used across the web UI, API, and worker.

// Branding overlay configuration stored on Clip.overlayConfig (JSON).
export interface OverlayConfig {
  serverName: string;
  serverIp: string;
  cta: string; // e.g. "Join: play.myserver.net"
  position: "top" | "bottom" | "center";
  // Font preset; "block" mimics the Minecraft pixel aesthetic.
  fontPreset: "block" | "clean" | "bold";
  textColor: string; // hex
  accentColor: string; // hex, used for caption highlight
  showCredit: boolean; // append "Recorded by <creatorName>"
}

export const DEFAULT_OVERLAY: OverlayConfig = {
  serverName: "My Minecraft Server",
  serverIp: "play.myserver.net",
  cta: "Join: play.myserver.net",
  position: "bottom",
  fontPreset: "block",
  textColor: "#ffffff",
  accentColor: "#3bb143",
  showCredit: true,
};

export const CAPTION_STYLES = ["karaoke", "block", "clean"] as const;
export type CaptionStyle = (typeof CAPTION_STYLES)[number];

// Settings keys persisted in the Setting table.
export const SETTING_KEYS = {
  serverName: "server_name",
  serverIp: "server_ip",
  defaultCaptionStyle: "default_caption_style",
  defaultOverlay: "default_overlay",
  creditTagline: "credit_tagline", // auto-appended to exported posts
  mediaDir: "media_dir",
  watchFolder: "watch_folder",
} as const;

// ---- Job payloads (BullMQ) ----
export interface AnalyzeJobData {
  sourceVideoId: string;
}

export interface RenderJobData {
  clipId: string;
}

// ---- Python worker JSON contracts ----
// Output of python/analyze.py
export interface AnalyzeResult {
  durationSec: number;
  width: number;
  height: number;
  highlights: {
    startSec: number;
    endSec: number;
    score: number;
    reason: "loudness" | "scene_change" | "speech";
    transcriptSnippet: string | null;
  }[];
}

// Output of python/render.py
export interface RenderResult {
  outputPath: string;
  thumbnailPath: string;
  durationSec: number;
}
