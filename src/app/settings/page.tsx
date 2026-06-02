"use client";

import { useEffect, useState } from "react";
import { Save } from "lucide-react";
import { PageHeader } from "@/components/PageHeader";
import { OverlayEditor } from "@/components/OverlayEditor";
import { apiGet, apiSend } from "@/lib/client";
import { CAPTION_STYLES, DEFAULT_OVERLAY, type OverlayConfig } from "@/lib/types";

interface SettingsDTO {
  serverName: string;
  serverIp: string;
  defaultCaptionStyle: string;
  creditTagline: string;
  mediaDir: string;
  watchFolder: string;
  defaultOverlay: OverlayConfig;
}

export default function SettingsPage() {
  const [s, setS] = useState<SettingsDTO | null>(null);
  const [saved, setSaved] = useState(false);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    apiGet<{ settings: SettingsDTO }>("/api/settings").then(({ settings }) => setS(settings));
  }, []);

  async function save() {
    if (!s) return;
    setBusy(true);
    try {
      await apiSend("/api/settings", "PUT", s);
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } finally {
      setBusy(false);
    }
  }

  if (!s) return <div className="px-8 py-8 text-sm text-gray-500">Loading…</div>;
  const set = <K extends keyof SettingsDTO>(k: K, v: SettingsDTO[K]) => setS({ ...s, [k]: v });

  return (
    <div className="mx-auto max-w-3xl px-8 py-8">
      <PageHeader
        title="Settings"
        subtitle="Server identity, default presets, storage, and the optional watch folder."
        actions={
          <button onClick={save} disabled={busy} className="btn-primary">
            <Save size={16} /> {saved ? "Saved!" : busy ? "Saving…" : "Save"}
          </button>
        }
      />

      <div className="space-y-6">
        <section className="card p-5">
          <h3 className="mb-4 text-sm font-semibold uppercase tracking-wide text-gray-400">Server identity</h3>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label">Server name</label>
              <input className="input" value={s.serverName} onChange={(e) => set("serverName", e.target.value)} />
            </div>
            <div>
              <label className="label">Server IP</label>
              <input className="input" value={s.serverIp} onChange={(e) => set("serverIp", e.target.value)} />
            </div>
          </div>
          <div className="mt-3">
            <label className="label">Credit tagline (auto-appended to exports)</label>
            <input className="input" value={s.creditTagline} onChange={(e) => set("creditTagline", e.target.value)} />
            <p className="mt-1 text-xs text-gray-500">
              Placeholders: <code className="text-gray-300">{"{creator}"}</code> and{" "}
              <code className="text-gray-300">{"{server}"}</code>.
            </p>
          </div>
        </section>

        <section className="card p-5">
          <h3 className="mb-4 text-sm font-semibold uppercase tracking-wide text-gray-400">Default caption & overlay</h3>
          <div className="mb-4">
            <label className="label">Default caption style</label>
            <select
              className="input max-w-xs"
              value={s.defaultCaptionStyle}
              onChange={(e) => set("defaultCaptionStyle", e.target.value)}
            >
              {CAPTION_STYLES.map((c) => (
                <option key={c} value={c} className="capitalize">
                  {c}
                </option>
              ))}
            </select>
          </div>
          <OverlayEditor
            value={{ ...DEFAULT_OVERLAY, ...s.defaultOverlay }}
            onChange={(o) => set("defaultOverlay", o)}
          />
        </section>

        <section className="card p-5">
          <h3 className="mb-4 text-sm font-semibold uppercase tracking-wide text-gray-400">Storage & watch folder</h3>
          <div>
            <label className="label">MEDIA_DIR (source videos + rendered clips)</label>
            <input className="input" value={s.mediaDir} onChange={(e) => set("mediaDir", e.target.value)} />
            <p className="mt-1 text-xs text-gray-500">
              Changing this here updates the stored preference; the running app/worker read it from{" "}
              <code className="text-gray-300">.env</code> at startup.
            </p>
          </div>
          <div className="mt-3">
            <label className="label">Watch folder (optional auto-import)</label>
            <input
              className="input"
              placeholder="/path/to/Dropbox/MinecraftClips"
              value={s.watchFolder}
              onChange={(e) => set("watchFolder", e.target.value)}
            />
            <p className="mt-1 text-xs text-gray-500">
              Run <code className="text-gray-300">npm run watch-folder</code> to auto-import files dropped here.
            </p>
          </div>
        </section>

        <section className="card p-5">
          <h3 className="mb-2 text-sm font-semibold uppercase tracking-wide text-gray-400">Optional integrations</h3>
          <p className="text-sm text-gray-400">
            Direct social posting (TikTok / Instagram / YouTube) and the Discord “clip ready” webhook are configured via{" "}
            <code className="text-gray-300">.env</code> and disabled by default. See the README{" "}
            <span className="text-gray-300">“Optional: enabling direct social posting”</span> section.
          </p>
        </section>
      </div>
    </div>
  );
}
