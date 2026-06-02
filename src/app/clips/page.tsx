"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { Film } from "lucide-react";
import { PageHeader } from "@/components/PageHeader";
import { StatusBadge } from "@/components/StatusBadge";
import { apiGet, type ClipDTO } from "@/lib/client";
import { formatDuration, relativeTime } from "@/lib/format";

export default function ClipsPage() {
  const [clips, setClips] = useState<ClipDTO[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    try {
      const { clips } = await apiGet<{ clips: ClipDTO[] }>("/api/clips");
      setClips(clips);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
    const t = setInterval(load, 4000);
    return () => clearInterval(t);
  }, [load]);

  return (
    <div className="mx-auto max-w-6xl px-8 py-8">
      <PageHeader title="Clips" subtitle="Your rendered vertical shorts, ready to export and schedule." />

      {loading ? (
        <p className="text-sm text-gray-500">Loading…</p>
      ) : clips.length === 0 ? (
        <div className="card p-8 text-center text-sm text-gray-500">
          No clips yet. Open a video from the <Link href="/" className="text-creeper-400">Library</Link> and make one.
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
          {clips.map((c) => {
            const thumb = c.thumbnailPath
              ? `/api/media/thumbnails/${c.id}.jpg`
              : null;
            return (
              <Link key={c.id} href={`/clips/${c.id}`} className="card group overflow-hidden">
                <div className="relative aspect-[9/16] bg-black">
                  {thumb ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={thumb} alt="" className="h-full w-full object-cover" />
                  ) : (
                    <div className="grid h-full w-full place-items-center text-gray-700">
                      <Film size={28} />
                    </div>
                  )}
                  <div className="absolute left-2 top-2">
                    <StatusBadge status={c.status} />
                  </div>
                </div>
                <div className="p-3">
                  <div className="truncate text-sm text-gray-200">{c.title || "Untitled clip"}</div>
                  <div className="mt-0.5 text-xs text-gray-500">
                    {formatDuration(c.durationSec)} · {relativeTime(c.createdAt)}
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
