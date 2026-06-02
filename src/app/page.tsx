"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { Trash2, RefreshCw, Film, Scissors } from "lucide-react";
import { PageHeader } from "@/components/PageHeader";
import { UploadZone } from "@/components/UploadZone";
import { StatusBadge } from "@/components/StatusBadge";
import { apiGet, apiSend, type SourceVideoDTO } from "@/lib/client";
import { formatDuration, relativeTime } from "@/lib/format";

export default function LibraryPage() {
  const [videos, setVideos] = useState<SourceVideoDTO[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    try {
      const { videos } = await apiGet<{ videos: SourceVideoDTO[] }>("/api/videos");
      setVideos(videos);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
    // Poll while anything is still processing so statuses update live.
    const t = setInterval(load, 4000);
    return () => clearInterval(t);
  }, [load]);

  async function remove(id: string) {
    if (!confirm("Delete this source video and its source file?")) return;
    await apiSend(`/api/videos/${id}`, "DELETE");
    load();
  }

  async function reanalyze(id: string) {
    await apiSend(`/api/videos/${id}`, "PATCH", { action: "reanalyze" });
    load();
  }

  return (
    <div className="mx-auto max-w-5xl px-8 py-8">
      <PageHeader
        title="Library"
        subtitle="Import your friend's gameplay footage. Each upload is auto-analyzed for highlights."
      />

      <UploadZone onUploaded={load} />

      <div className="mt-8">
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-gray-400">
          Source videos {videos.length > 0 && <span className="text-gray-600">({videos.length})</span>}
        </h2>

        {loading ? (
          <p className="text-sm text-gray-500">Loading…</p>
        ) : videos.length === 0 ? (
          <div className="card p-8 text-center text-sm text-gray-500">
            No footage yet — drop a file above to get started.
          </div>
        ) : (
          <div className="space-y-3">
            {videos.map((v) => (
              <div key={v.id} className="card flex items-center gap-4 p-4">
                <div className="grid h-12 w-12 shrink-0 place-items-center rounded-lg bg-panel-soft text-creeper-400">
                  <Film size={22} />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <span className="truncate font-medium text-gray-100">{v.filename}</span>
                    <StatusBadge status={v.status} />
                  </div>
                  <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-0.5 text-xs text-gray-500">
                    <span>{formatDuration(v.durationSec)}</span>
                    {v.creatorName && <span>· by {v.creatorName}</span>}
                    <span>· {v._count?.highlights ?? 0} highlights</span>
                    <span>· {v._count?.clips ?? 0} clips</span>
                    <span>· {relativeTime(v.createdAt)}</span>
                  </div>
                  {v.status === "error" && v.errorMessage && (
                    <p className="mt-1 line-clamp-2 text-xs text-red-400">{v.errorMessage}</p>
                  )}
                </div>
                <div className="flex shrink-0 items-center gap-2">
                  {v.status === "analyzed" && (
                    <Link href={`/videos/${v.id}`} className="btn-primary">
                      <Scissors size={16} /> Review
                    </Link>
                  )}
                  <button onClick={() => reanalyze(v.id)} className="btn-ghost" title="Re-analyze">
                    <RefreshCw size={16} />
                  </button>
                  <button onClick={() => remove(v.id)} className="btn-danger" title="Delete">
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
