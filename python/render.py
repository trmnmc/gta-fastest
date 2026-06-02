#!/usr/bin/env python3
"""Render a vertical 9:16 short clip from a source video.

Input (stdin JSON):
  {
    "videoPath": str, "outputPath": str, "thumbnailPath": str,
    "startSec": float, "endSec": float,
    "captionStyle": "karaoke"|"block"|"clean",
    "overlay": OverlayConfig, "creatorName": str|null
  }
Output (stdout JSON): RenderResult { outputPath, thumbnailPath, durationSec }

Pipeline: cut segment -> reframe to 1080x1920 (centered crop + pad) -> burn-in
karaoke captions (ASS) -> draw server branding overlay -> write mp4 + thumbnail.
"""
import os
import tempfile

from util import log, read_input, emit, require_ffmpeg, run, extract_audio
from transcribe import transcribe
from captions import build_ass

OUT_W, OUT_H = 1080, 1920


def ass_escape(text: str) -> str:
    return text.replace("\\", "\\\\").replace(":", "\\:").replace("'", "’")


def drawtext_escape(text: str) -> str:
    # Escape for ffmpeg drawtext.
    return (
        text.replace("\\", "\\\\")
        .replace(":", "\\:")
        .replace("'", "’")
        .replace("%", "\\%")
    )


def position_y(position: str) -> str:
    if position == "top":
        return "h*0.06"
    if position == "center":
        return "(h-text_h)/2"
    return "h*0.86"  # bottom


def build_branding_drawtext(overlay: dict, creator: str | None) -> list[str]:
    """Return drawtext filter snippets for the server branding + optional credit."""
    font_preset = overlay.get("fontPreset", "block")
    # A blocky font path can be dropped in ./python/fonts to match Minecraft; we
    # fall back to drawtext's default font if not present.
    fontfile = os.path.join(os.path.dirname(__file__), "fonts", "minecraft.ttf")
    fontfile_opt = f"fontfile='{fontfile}':" if os.path.exists(fontfile) else ""

    color = overlay.get("textColor", "#ffffff").lstrip("#")
    accent = overlay.get("accentColor", "#3bb143").lstrip("#")
    y = position_y(overlay.get("position", "bottom"))

    server = drawtext_escape(overlay.get("serverName", ""))
    cta = drawtext_escape(overlay.get("cta", ""))

    snippets = []
    # Server name line.
    snippets.append(
        f"drawtext={fontfile_opt}text='{server}':fontcolor=0x{accent}:fontsize=52:"
        f"borderw=4:bordercolor=black@0.9:x=(w-text_w)/2:y={y}-70"
    )
    # CTA line.
    snippets.append(
        f"drawtext={fontfile_opt}text='{cta}':fontcolor=0x{color}:fontsize=40:"
        f"borderw=4:bordercolor=black@0.9:x=(w-text_w)/2:y={y}"
    )
    # Optional credit line.
    if overlay.get("showCredit") and creator:
        credit = drawtext_escape(f"Recorded by {creator}")
        snippets.append(
            f"drawtext={fontfile_opt}text='{credit}':fontcolor=0x{color}:fontsize=28:"
            f"borderw=3:bordercolor=black@0.8:x=(w-text_w)/2:y=h*0.95"
        )
    return snippets


def main():
    require_ffmpeg()
    data = read_input()
    video_path = data["videoPath"]
    out_path = data["outputPath"]
    thumb_path = data["thumbnailPath"]
    start = float(data["startSec"])
    end = float(data["endSec"])
    duration = max(0.5, end - start)
    overlay = data.get("overlay") or {}
    style = data.get("captionStyle", "karaoke")
    creator = data.get("creatorName")

    os.makedirs(os.path.dirname(out_path), exist_ok=True)
    os.makedirs(os.path.dirname(thumb_path), exist_ok=True)

    log(f"[render] cut {start:.2f}-{end:.2f}s -> {out_path}")

    # 1) Cut the segment first (fast, keyframe-accurate enough with re-encode).
    cut = tempfile.NamedTemporaryFile(suffix=".mp4", delete=False)
    cut.close()
    run([
        "ffmpeg", "-y", "-ss", str(start), "-i", video_path, "-t", str(duration),
        "-c:v", "libx264", "-preset", "veryfast", "-crf", "20",
        "-c:a", "aac", "-b:a", "160k", cut.name,
    ])

    # 2) Transcribe the cut segment for word-accurate captions.
    seg_audio = extract_audio(cut.name)
    _segments, words = transcribe(seg_audio)

    # 3) Build the ASS caption file (timed relative to the cut clip start = 0).
    ass = build_ass(
        words=words, clip_start=0.0, width=OUT_W, height=OUT_H, style=style,
        text_color=overlay.get("textColor", "#ffffff"),
        accent_color=overlay.get("accentColor", "#3bb143"),
    )
    ass_file = tempfile.NamedTemporaryFile(suffix=".ass", delete=False, mode="w", encoding="utf-8")
    ass_file.write(ass)
    ass_file.close()

    # 4) Build the filtergraph: reframe to 9:16 (scale to fill height, center-crop
    #    width, pad if needed) -> subtitles -> branding drawtext.
    reframe = (
        f"scale={OUT_W}:{OUT_H}:force_original_aspect_ratio=increase,"
        f"crop={OUT_W}:{OUT_H},setsar=1"
    )
    subs = f"subtitles='{ass_escape(ass_file.name)}'"
    branding = ",".join(build_branding_drawtext(overlay, creator))
    vf = ",".join([reframe, subs, branding])

    run([
        "ffmpeg", "-y", "-i", cut.name, "-vf", vf,
        "-c:v", "libx264", "-preset", "medium", "-crf", "20",
        "-c:a", "aac", "-b:a", "160k", "-movflags", "+faststart", out_path,
    ])

    # 5) Thumbnail from ~1s into the clip.
    run([
        "ffmpeg", "-y", "-ss", "1", "-i", out_path, "-frames:v", "1",
        "-q:v", "3", thumb_path,
    ])

    for f in (cut.name, seg_audio, ass_file.name):
        try:
            os.remove(f)
        except OSError:
            pass

    emit({
        "outputPath": out_path,
        "thumbnailPath": thumb_path,
        "durationSec": round(duration, 2),
    })


if __name__ == "__main__":
    main()
