// Tiny typed fetch helpers for client components.

export async function apiGet<T>(url: string): Promise<T> {
  const res = await fetch(url, { cache: "no-store" });
  if (!res.ok) throw new Error((await res.json().catch(() => ({}))).error || res.statusText);
  return res.json();
}

export async function apiSend<T>(
  url: string,
  method: "POST" | "PATCH" | "PUT" | "DELETE",
  body?: unknown,
): Promise<T> {
  const res = await fetch(url, {
    method,
    headers: body ? { "Content-Type": "application/json" } : undefined,
    body: body ? JSON.stringify(body) : undefined,
  });
  if (!res.ok) throw new Error((await res.json().catch(() => ({}))).error || res.statusText);
  return res.json();
}

// Shapes returned by the API (kept loose; the server owns the source of truth).
export interface SourceVideoDTO {
  id: string;
  filename: string;
  durationSec: number | null;
  width: number | null;
  height: number | null;
  status: "imported" | "processing" | "analyzed" | "error";
  creatorName: string | null;
  errorMessage: string | null;
  createdAt: string;
  _count?: { highlights: number; clips: number };
}

export interface HighlightDTO {
  id: string;
  startSec: number;
  endSec: number;
  score: number;
  reason: "loudness" | "scene_change" | "speech";
  transcriptSnippet: string | null;
}

export interface ClipDTO {
  id: string;
  sourceVideoId: string;
  title: string | null;
  status: "draft" | "rendering" | "ready" | "error";
  startSec: number;
  endSec: number;
  durationSec: number | null;
  outputPath: string | null;
  thumbnailPath: string | null;
  captionStyle: string;
  overlayConfig: unknown;
  errorMessage: string | null;
  createdAt: string;
  sourceVideo?: { filename: string; creatorName: string | null };
}
