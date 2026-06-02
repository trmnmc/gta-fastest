"use client";

import { useRef, useState } from "react";
import { UploadCloud, Loader2 } from "lucide-react";

// Drag-and-drop / click batch upload of source gameplay files.
export function UploadZone({ onUploaded }: { onUploaded: () => void }) {
  const [dragging, setDragging] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [creatorName, setCreatorName] = useState("");
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  async function upload(files: FileList | File[]) {
    const list = Array.from(files);
    if (list.length === 0) return;
    setError(null);
    setUploading(true);
    try {
      const form = new FormData();
      list.forEach((f) => form.append("files", f));
      if (creatorName.trim()) form.append("creatorName", creatorName.trim());
      const res = await fetch("/api/upload", { method: "POST", body: form });
      if (!res.ok) throw new Error((await res.json().catch(() => ({}))).error || "Upload failed");
      onUploaded();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setUploading(false);
    }
  }

  return (
    <div className="card p-4">
      <div className="mb-3">
        <label className="label">Credit footage to (your friend)</label>
        <input
          className="input max-w-xs"
          placeholder="e.g. Steve"
          value={creatorName}
          onChange={(e) => setCreatorName(e.target.value)}
        />
      </div>

      <div
        onDragOver={(e) => {
          e.preventDefault();
          setDragging(true);
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDragging(false);
          void upload(e.dataTransfer.files);
        }}
        onClick={() => inputRef.current?.click()}
        className={`flex cursor-pointer flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed px-6 py-10 text-center transition-colors ${
          dragging ? "border-creeper-500 bg-creeper-700/10" : "border-panel-border hover:border-creeper-600"
        }`}
      >
        {uploading ? (
          <Loader2 className="animate-spin text-creeper-400" size={28} />
        ) : (
          <UploadCloud className="text-creeper-400" size={28} />
        )}
        <div className="text-sm font-medium text-gray-200">
          {uploading ? "Uploading & queuing analysis…" : "Drop gameplay files here or click to browse"}
        </div>
        <div className="text-xs text-gray-500">mp4, mov, mkv, webm · batch upload supported</div>
        <input
          ref={inputRef}
          type="file"
          accept="video/*"
          multiple
          hidden
          onChange={(e) => e.target.files && upload(e.target.files)}
        />
      </div>

      {error && <p className="mt-3 text-sm text-red-400">{error}</p>}
      <p className="mt-3 text-xs text-gray-500">
        Tip: set a <span className="text-gray-300">watch folder</span> in Settings so files your friend drops into a
        synced Dropbox/Drive folder import automatically.
      </p>
    </div>
  );
}
