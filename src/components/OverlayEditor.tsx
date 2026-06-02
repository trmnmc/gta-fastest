"use client";

import type { OverlayConfig } from "@/lib/types";

const FONT_PRESETS: { value: OverlayConfig["fontPreset"]; label: string }[] = [
  { value: "block", label: "Block (Minecraft)" },
  { value: "bold", label: "Bold" },
  { value: "clean", label: "Clean" },
];
const POSITIONS: OverlayConfig["position"][] = ["top", "center", "bottom"];

// Reusable editor for the server-branding overlay. Used by the Clip Editor and
// the Settings default-preset panel.
export function OverlayEditor({
  value,
  onChange,
}: {
  value: OverlayConfig;
  onChange: (next: OverlayConfig) => void;
}) {
  const set = <K extends keyof OverlayConfig>(k: K, v: OverlayConfig[K]) => onChange({ ...value, [k]: v });

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="label">Server name</label>
          <input className="input" value={value.serverName} onChange={(e) => set("serverName", e.target.value)} />
        </div>
        <div>
          <label className="label">Server IP</label>
          <input className="input" value={value.serverIp} onChange={(e) => set("serverIp", e.target.value)} />
        </div>
      </div>

      <div>
        <label className="label">Call to action</label>
        <input className="input" value={value.cta} onChange={(e) => set("cta", e.target.value)} />
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="label">Font preset</label>
          <select
            className="input"
            value={value.fontPreset}
            onChange={(e) => set("fontPreset", e.target.value as OverlayConfig["fontPreset"])}
          >
            {FONT_PRESETS.map((p) => (
              <option key={p.value} value={p.value}>
                {p.label}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="label">Position</label>
          <select
            className="input"
            value={value.position}
            onChange={(e) => set("position", e.target.value as OverlayConfig["position"])}
          >
            {POSITIONS.map((p) => (
              <option key={p} value={p} className="capitalize">
                {p}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="label">Text color</label>
          <div className="flex items-center gap-2">
            <input
              type="color"
              className="h-9 w-10 rounded border border-panel-border bg-transparent"
              value={value.textColor}
              onChange={(e) => set("textColor", e.target.value)}
            />
            <input className="input" value={value.textColor} onChange={(e) => set("textColor", e.target.value)} />
          </div>
        </div>
        <div>
          <label className="label">Accent color (captions)</label>
          <div className="flex items-center gap-2">
            <input
              type="color"
              className="h-9 w-10 rounded border border-panel-border bg-transparent"
              value={value.accentColor}
              onChange={(e) => set("accentColor", e.target.value)}
            />
            <input className="input" value={value.accentColor} onChange={(e) => set("accentColor", e.target.value)} />
          </div>
        </div>
      </div>

      <label className="flex items-center gap-2 text-sm text-gray-300">
        <input
          type="checkbox"
          checked={value.showCredit}
          onChange={(e) => set("showCredit", e.target.checked)}
          className="h-4 w-4 accent-creeper-500"
        />
        Show “Recorded by …” credit (honor your friend)
      </label>
    </div>
  );
}
