import { config } from "../config";

// ---------------------------------------------------------------------------
// OPTIONAL direct social-posting scaffold. DISABLED unless ENABLE_DIRECT_POSTING
// is true AND you supply the relevant API credentials. The core product exports
// clips to a folder for manual upload; this is a later/optional convenience.
//
// IMPORTANT: each platform requires you to create your own developer app and
// complete their auth + app-review process. These functions intentionally throw
// until you implement the upload call against credentials you control. See the
// README "Optional: enabling direct social posting" section.
// ---------------------------------------------------------------------------

export interface PostRequest {
  videoPath: string;
  caption: string;
}

export type Platform = "youtube" | "instagram" | "tiktok";

export function isDirectPostingEnabled(): boolean {
  return config.directPostingEnabled;
}

function ensureEnabled() {
  if (!config.directPostingEnabled) {
    throw new Error(
      "Direct posting is disabled. Set ENABLE_DIRECT_POSTING=true and configure the platform credentials to use it.",
    );
  }
}

// YouTube Data API v3 — videos.insert (resumable upload), shorts via #Shorts.
export async function postToYouTube(_req: PostRequest): Promise<{ url: string }> {
  ensureEnabled();
  if (!process.env.YOUTUBE_REFRESH_TOKEN) throw new Error("YOUTUBE_* credentials not configured");
  // TODO: exchange refresh token -> access token, then resumable upload.
  throw new Error("postToYouTube not implemented — complete OAuth + videos.insert yourself.");
}

// Instagram Graph API — create media container, then publish (Reels).
export async function postToInstagram(_req: PostRequest): Promise<{ url: string }> {
  ensureEnabled();
  if (!process.env.INSTAGRAM_ACCESS_TOKEN) throw new Error("INSTAGRAM_* credentials not configured");
  // TODO: POST /{ig-user-id}/media (media_type=REELS, video_url) then /media_publish.
  throw new Error("postToInstagram not implemented — complete Graph API setup yourself.");
}

// TikTok Content Posting API — init upload, upload chunks, publish.
export async function postToTikTok(_req: PostRequest): Promise<{ url: string }> {
  ensureEnabled();
  if (!process.env.TIKTOK_ACCESS_TOKEN) throw new Error("TIKTOK_* credentials not configured");
  // TODO: POST /v2/post/publish/video/init, upload, then poll status.
  throw new Error("postToTikTok not implemented — complete Content Posting API setup yourself.");
}

export async function postToPlatform(platform: Platform, req: PostRequest) {
  switch (platform) {
    case "youtube":
      return postToYouTube(req);
    case "instagram":
      return postToInstagram(req);
    case "tiktok":
      return postToTikTok(req);
  }
}
