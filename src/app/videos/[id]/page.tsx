"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { ArrowLeft, Play, Scissors, Sparkles } from "lucide-react";
import { PageHeader } from "@/components/PageHeader";
import { StatusBadge } from "@/components/StatusBadge";
import { HighlightReasonIcon, REASON_LABEL } from "@/components/HighlightReasonIcon";
import { apiGet, apiSend, type HighlightDTO, type ClipDTO } from "@/lib/client";
import { formatDuration, formatTimecode } from "@/lib/format";

interface VideoDetail {
  id: string;
  filename: string;
  durationSec: number | null;
  status: string;
  creatorName: string | null;
  highlights: HighlightDTO[];
  clips: ClipDTO[];
}

export default function ReviewPage({ params }: { params: { id: string } }) {
  const [video, setVideo] = useState<VideoDetail | null>(null);
  const [selected, setSelected] = useState<HighlightDTO | null>(null);
  const [inSec, setInSec] = useState(0);
  const [outSec, setOutSec] = useState(0);
  const [busy, setBusy] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);

  const load = useCallback(async () => {
    const { video } = await apiGet<{ video: VideoDetail }>(`/api/videos/${params.id}`);
    setVideo(video);
    if (!selected && video.highlights[0]) pick(video.highlights[0]);
  }, [params.id, selected]);

  useEffect(() => {
    load();
    const t = setInterval(load, 5000); // refresh clip render statuses
    return () => clearInterval(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [params.id]);

  function pick(h: HighlightDTO) {
    setSelected(h);
    setInSec(Number(h.startSec.toFixed(1)));
    setOutSec(Number(h.endSec.toFixed(1)));
    if (videoRef.current) {
      videoRef.current.currentTime = h.startSec;
      videoRef.current.play().catch(() => {});
    }
  }

  function preview() {
    if (videoRef.current) {
      videoRef.current.currentTime = inSec;
      videoRef.current.play().catch(() => {});
    }
  }

  async function makeClip() {
    if (!video) return;
    setBusy(true);
    try {
      await apiSend("/api/clips", "POST", {
        sourceVideoId: video.id,
        highlightId: selected?.id,
        startSec: inSec,
        endSec: outSec,
        title: selected?.transcriptSnippet?.slice(0, 80) ?? null,
      });
      await load();
    } finally {
      setBusy(false);
    }
  }

  if (!video) return <div className="px-8 py-8 text-sm text-gray-500">Loading…</div>;

  const duration = video.durationSec ?? 1;
  const mediaSrc = `/api/media/source/${encodeURIComponent(video.filename)}`;

  return (
    <div className="mx-auto max-w-6xl px-8 py-8">
      <Link href="/" className="mb-3 inline-flex items-center gap-1 text-sm text-gray-400 hover:text-gray-200">
        <ArrowLeft size={15} /> Library
      </Link>
      <PageHeader
        title={video.filename}
        subtitle={`${formatDuration(video.durationSec)} · ${video.highlights.length} highlights detected${
          video.creatorName ? ` · footage by ${video.creatorName}` : ""
        }`}
      />

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1.2fr_1fr]">
        {/* Player + timeline + in/out controls */}
        <div className="space-y-4">
          <div className="card overflow-hidden">
            <video ref={videoRef} src={mediaSrc} controls className="aspect-video w-full bg-black" />
          </div>

          {/* Timeline with highlight markers */}
          <div className="card p-4">
            <div className="relative h-10 w-full rounded-lg bg-panel-soft">
              {video.highlights.map((h) => (
                <button
                  key={h.id}
                  onClick={() => pick(h)}
                  title={`${REASON_LABEL[h.reason]} · score ${(h.score * 100).toFixed(0)}`}
                  className={`absolute top-0 h-full rounded transition-all ${
                    selected?.id === h.id ? "bg-creeper-500" : "bg-creeper-700/50 hover:bg-creeper-600"
                  }`}
                  style={{
                    left: `${(h.startSec / duration) * 100}%`,
                    width: `${Math.max(1.2, ((h.endSec - h.startSec) / duration) * 100)}%`,
                  }}
                />
              ))}
            </div>
            <div className="mt-1 flex justify-between text-[10px] text-gray-600">
              <span>0:00</span>
              <span>{formatDuration(video.durationSec)}</span>
            </div>
          </div>

          {/* In/out trim controls */}
          <div className="card p-4">
            <div className="mb-3 flex items-center gap-2 text-sm font-medium text-gray-200">
              <Scissors size={16} className="text-creeper-400" /> Adjust clip in / out
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="label">In ({formatTimecode(inSec)})</label>
                <input
                  type="number"
                  step="0.1"
                  className="input"
                  value={inSec}
                  onChange={(e) => setInSec(parseFloat(e.target.value))}
                />
              </div>
              <div>
                <label className="label">Out ({formatTimecode(outSec)})</label>
                <input
                  type="number"
                  step="0.1"
                  className="input"
                  value={outSec}
                  onChange={(e) => setOutSec(parseFloat(e.target.value))}
                />
              </div>
            </div>
            <div className="mt-2 text-xs text-gray-500">Length: {(outSec - inSec).toFixed(1)}s</div>
            <div className="mt-4 flex gap-2">
              <button onClick={preview} className="btn-ghost">
                <Play size={16} /> Preview
              </button>
              <button onClick={makeClip} disabled={busy || outSec <= inSec} className="btn-primary">
                <Sparkles size={16} /> {busy ? "Creating…" : "Make Clip"}
              </button>
            </div>
          </div>
        </div>

        {/* Ranked highlights + existing clips */}
        <div className="space-y-6">
          <div>
            <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-gray-400">Ranked highlights</h2>
            <div className="space-y-2">
              {video.highlights.map((h, i) => (
                <button
                  key={h.id}
                  onClick={() => pick(h)}
                  className={`card flex w-full items-start gap-3 p-3 text-left transition-colors ${
                    selected?.id === h.id ? "border-creeper-600" : "hover:border-panel-border"
                  }`}
                >
                  <div className="grid h-7 w-7 shrink-0 place-items-center rounded-md bg-panel-soft text-xs font-semibold text-creeper-400">
                    {i + 1}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 text-xs text-gray-400">
                      <HighlightReasonIcon reason={h.reason} />
                      {REASON_LABEL[h.reason]}
                      <span className="text-gray-600">· {formatTimecode(h.startSec)}</span>
                      <span className="ml-auto rounded bg-panel-soft px-1.5 py-0.5 text-creeper-400">
                        {(h.score * 100).toFixed(0)}
                      </span>
                    </div>
                    {h.transcriptSnippet && (
                      <p className="mt-1 line-clamp-2 text-sm text-gray-300">“{h.transcriptSnippet}”</p>
                    )}
                  </div>
                </button>
              ))}
            </div>
          </div>

          {video.clips.length > 0 && (
            <div>
              <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-gray-400">Clips from this video</h2>
              <div className="space-y-2">
                {video.clips.map((c) => (
                  <Link key={c.id} href={`/clips/${c.id}`} className="card flex items-center gap-3 p-3 hover:border-creeper-600">
                    <div className="flex-1">
                      <div className="text-sm text-gray-200">{c.title || "Untitled clip"}</div>
                      <div className="text-xs text-gray-500">{formatDuration(c.durationSec)}</div>
                    </div>
                    <StatusBadge status={c.status} />
                  </Link>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
