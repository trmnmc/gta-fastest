const STYLES: Record<string, string> = {
  // source video
  imported: "bg-sky-950/60 text-sky-300 border-sky-900",
  processing: "bg-amber-950/60 text-amber-300 border-amber-900 animate-pulse",
  analyzed: "bg-creeper-700/30 text-creeper-400 border-creeper-700",
  // clip
  draft: "bg-zinc-800 text-zinc-300 border-zinc-700",
  rendering: "bg-amber-950/60 text-amber-300 border-amber-900 animate-pulse",
  ready: "bg-creeper-700/30 text-creeper-400 border-creeper-700",
  // scheduled post
  planned: "bg-sky-950/60 text-sky-300 border-sky-900",
  exported: "bg-violet-950/60 text-violet-300 border-violet-900",
  posted: "bg-creeper-700/30 text-creeper-400 border-creeper-700",
  // shared
  error: "bg-red-950/60 text-red-300 border-red-900",
};

export function StatusBadge({ status }: { status: string }) {
  const cls = STYLES[status] ?? "bg-zinc-800 text-zinc-300 border-zinc-700";
  return (
    <span className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium capitalize ${cls}`}>
      {status}
    </span>
  );
}
