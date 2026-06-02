"use client";

import { useCallback, useEffect, useState } from "react";
import {
  addMonths,
  eachDayOfInterval,
  endOfMonth,
  endOfWeek,
  format,
  isSameDay,
  isSameMonth,
  startOfMonth,
  startOfWeek,
} from "date-fns";
import { ChevronLeft, ChevronRight, FolderOutput, Trash2 } from "lucide-react";
import { PageHeader } from "@/components/PageHeader";
import { StatusBadge } from "@/components/StatusBadge";
import { apiGet, apiSend } from "@/lib/client";

interface PostDTO {
  id: string;
  platform: string;
  scheduledAt: string;
  status: string;
  notes: string | null;
  clip: { id: string; title: string | null; status: string; thumbnailPath: string | null };
}

const PLATFORM_EMOJI: Record<string, string> = {
  tiktok: "🎵",
  instagram: "📸",
  youtube: "▶️",
  manual: "📁",
};

export default function SchedulePage() {
  const [month, setMonth] = useState(new Date());
  const [posts, setPosts] = useState<PostDTO[]>([]);
  const [msg, setMsg] = useState<string | null>(null);

  const load = useCallback(async () => {
    const from = startOfWeek(startOfMonth(month)).toISOString();
    const to = endOfWeek(endOfMonth(month)).toISOString();
    const { posts } = await apiGet<{ posts: PostDTO[] }>(`/api/schedule?from=${from}&to=${to}`);
    setPosts(posts);
  }, [month]);

  useEffect(() => {
    load();
  }, [load]);

  const days = eachDayOfInterval({
    start: startOfWeek(startOfMonth(month)),
    end: endOfWeek(endOfMonth(month)),
  });

  async function exportPost(id: string) {
    setMsg(null);
    try {
      const res = await apiSend<{ exportDir: string; posted: boolean }>(`/api/schedule/${id}/export`, "POST");
      setMsg(res.posted ? "Posted directly ✅" : `Exported to ${res.exportDir}`);
      load();
    } catch (e) {
      setMsg(`Error: ${(e as Error).message}`);
    }
  }

  async function removePost(id: string) {
    await apiSend(`/api/schedule/${id}`, "DELETE");
    load();
  }

  return (
    <div className="mx-auto max-w-6xl px-8 py-8">
      <PageHeader
        title="Schedule"
        subtitle="Plan posts per platform. Default is export-for-manual-upload."
        actions={
          <div className="flex items-center gap-2">
            <button className="btn-ghost" onClick={() => setMonth(addMonths(month, -1))}>
              <ChevronLeft size={16} />
            </button>
            <span className="min-w-[140px] text-center text-sm font-medium text-gray-200">
              {format(month, "MMMM yyyy")}
            </span>
            <button className="btn-ghost" onClick={() => setMonth(addMonths(month, 1))}>
              <ChevronRight size={16} />
            </button>
          </div>
        }
      />

      {msg && <div className="mb-4 rounded-lg border border-panel-border bg-panel-soft px-4 py-2 text-sm text-gray-300">{msg}</div>}

      <div className="grid grid-cols-7 gap-px overflow-hidden rounded-xl border border-panel-border bg-panel-border">
        {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((d) => (
          <div key={d} className="bg-panel px-2 py-2 text-center text-xs font-medium text-gray-500">
            {d}
          </div>
        ))}
        {days.map((day) => {
          const dayPosts = posts.filter((p) => isSameDay(new Date(p.scheduledAt), day));
          return (
            <div
              key={day.toISOString()}
              className={`min-h-[110px] bg-panel p-1.5 ${isSameMonth(day, month) ? "" : "opacity-40"}`}
            >
              <div className={`mb-1 text-right text-[11px] ${isSameDay(day, new Date()) ? "text-creeper-400" : "text-gray-500"}`}>
                {format(day, "d")}
              </div>
              <div className="space-y-1">
                {dayPosts.map((p) => (
                  <div key={p.id} className="group rounded-md border border-panel-border bg-panel-soft p-1.5 text-[11px]">
                    <div className="flex items-center gap-1">
                      <span>{PLATFORM_EMOJI[p.platform]}</span>
                      <span className="truncate text-gray-200">{p.clip.title || "Clip"}</span>
                    </div>
                    <div className="mt-1 flex items-center justify-between gap-1">
                      <StatusBadge status={p.status} />
                      <div className="flex items-center gap-1 opacity-0 transition-opacity group-hover:opacity-100">
                        <button title="Export" onClick={() => exportPost(p.id)} className="text-gray-400 hover:text-creeper-400">
                          <FolderOutput size={13} />
                        </button>
                        <button title="Remove" onClick={() => removePost(p.id)} className="text-gray-400 hover:text-red-400">
                          <Trash2 size={13} />
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>

      <p className="mt-4 text-xs text-gray-500">
        “Export” copies the rendered clip, thumbnail, and a caption.txt (with your credit tagline) into{" "}
        <span className="text-gray-300">MEDIA_DIR/exports</span>. Direct posting is optional — enable it in Settings/.env.
      </p>
    </div>
  );
}
