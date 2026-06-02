"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { ArrowLeft, RefreshCw, CalendarPlus, Trash2, Film } from "lucide-react";
import { PageHeader } from "@/components/PageHeader";
import { StatusBadge } from "@/components/StatusBadge";
import { OverlayEditor } from "@/components/OverlayEditor";
import { apiGet, apiSend, type ClipDTO } from "@/lib/client";
import { CAPTION_STYLES, DEFAULT_OVERLAY, type OverlayConfig } from "@/lib/types";
import { formatDuration } from "@/lib/format";

export default function ClipEditorPage({ params }: { params: { id: string } }) {
  const [clip, setClip] = useState<ClipDTO | null>(null);
  const [title, setTitle] = useState("");
  const [captionStyle, setCaptionStyle] = useState("karaoke");
  const [overlay, setOverlay] = useState<OverlayConfig>(DEFAULT_OVERLAY);
  const [busy, setBusy] = useState(false);
  const [scheduledAt, setScheduledAt] = useState("");
  const [platform, setPlatform] = useState("manual");

  const load = useCallback(async () => {
    const { clip } = await apiGet<{ clip: ClipDTO }>(`/api/clips/${params.id}`);
    setClip(clip);
    setTitle(clip.title ?? "");
    setCaptionStyle(clip.captionStyle);
    setOverlay({ ...DEFAULT_OVERLAY, ...((clip.overlayConfig as Partial<OverlayConfig>) ?? {}) });
  }, [params.id]);

  useEffect(() => {
    load();
    const t = setInterval(load, 4000);
    return () => clearInterval(t);
  }, [load]);

  async function save(rerender: boolean) {
    setBusy(true);
    try {
      await apiSend(`/api/clips/${params.id}`, "PATCH", { title, captionStyle, overlayConfig: overlay, rerender });
      await load();
    } finally {
      setBusy(false);
    }
  }

  async function addToSchedule() {
    if (!scheduledAt) return;
    await apiSend("/api/schedule", "POST", { clipId: params.id, platform, scheduledAt });
    alert("Added to schedule.");
  }

  async function remove() {
    if (!confirm("Delete this clip?")) return;
    await apiSend(`/api/clips/${params.id}`, "DELETE");
    window.location.href = "/clips";
  }

  if (!clip) return <div className="px-8 py-8 text-sm text-gray-500">Loading…</div>;

  const videoSrc = clip.status === "ready" ? `/api/media/clips/${clip.id}.mp4` : null;

  return (
    <div className="mx-auto max-w-6xl px-8 py-8">
      <Link href="/clips" className="mb-3 inline-flex items-center gap-1 text-sm text-gray-400 hover:text-gray-200">
        <ArrowLeft size={15} /> Clips
      </Link>
      <PageHeader
        title="Clip Editor"
        subtitle={`${formatDuration(clip.durationSec)} · from ${clip.sourceVideo?.filename ?? "source"}`}
        actions={<StatusBadge status={clip.status} />}
      />

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[420px_1fr]">
        {/* 9:16 preview */}
        <div className="space-y-4">
          <div className="card mx-auto w-full max-w-[320px] overflow-hidden">
            <div className="relative aspect-[9/16] bg-black">
              {videoSrc ? (
                <video key={videoSrc} src={videoSrc} controls className="h-full w-full object-contain" />
              ) : (
                <div className="grid h-full w-full place-items-center text-center text-sm text-gray-500">
                  {clip.status === "rendering" ? (
                    <span className="animate-pulse">Rendering…</span>
                  ) : clip.status === "error" ? (
                    <span className="px-4 text-red-400">{clip.errorMessage || "Render failed"}</span>
                  ) : (
                    <Film className="text-gray-700" />
                  )}
                </div>
              )}
            </div>
          </div>
          {clip.status === "error" && clip.errorMessage && (
            <pre className="card max-h-40 overflow-auto p-3 text-xs text-red-300">{clip.errorMessage}</pre>
          )}
        </div>

        {/* Controls */}
        <div className="space-y-6">
          <div className="card p-5">
            <div>
              <label className="label">Title / caption</label>
              <input className="input" value={title} onChange={(e) => setTitle(e.target.value)} />
            </div>
            <div className="mt-3">
              <label className="label">Caption style</label>
              <select className="input max-w-xs" value={captionStyle} onChange={(e) => setCaptionStyle(e.target.value)}>
                {CAPTION_STYLES.map((s) => (
                  <option key={s} value={s} className="capitalize">
                    {s}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="card p-5">
            <h3 className="mb-4 text-sm font-semibold uppercase tracking-wide text-gray-400">Server branding overlay</h3>
            <OverlayEditor value={overlay} onChange={setOverlay} />
          </div>

          <div className="flex flex-wrap gap-2">
            <button onClick={() => save(false)} disabled={busy} className="btn-ghost">
              Save
            </button>
            <button onClick={() => save(true)} disabled={busy} className="btn-primary">
              <RefreshCw size={16} /> {busy ? "Working…" : "Save & Re-render"}
            </button>
            <button onClick={remove} className="btn-danger ml-auto">
              <Trash2 size={16} /> Delete
            </button>
          </div>

          {/* Quick add to schedule */}
          <div className="card p-5">
            <h3 className="mb-3 text-sm font-semibold uppercase tracking-wide text-gray-400">Plan a post</h3>
            <div className="flex flex-wrap items-end gap-3">
              <div>
                <label className="label">Platform</label>
                <select className="input" value={platform} onChange={(e) => setPlatform(e.target.value)}>
                  <option value="manual">Manual export</option>
                  <option value="tiktok">TikTok</option>
                  <option value="instagram">Instagram</option>
                  <option value="youtube">YouTube</option>
                </select>
              </div>
              <div>
                <label className="label">When</label>
                <input
                  type="datetime-local"
                  className="input"
                  value={scheduledAt}
                  onChange={(e) => setScheduledAt(e.target.value)}
                />
              </div>
              <button onClick={addToSchedule} disabled={!scheduledAt} className="btn-ghost">
                <CalendarPlus size={16} /> Add to schedule
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
