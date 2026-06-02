#!/usr/bin/env python3
"""Analyze a source video: probe + transcribe + detect highlight moments.

Input  (stdin JSON):  { "videoPath": str }
Output (stdout JSON):  AnalyzeResult — see src/lib/types.ts

Highlight signals:
  (a) audio loudness / RMS spikes  -> explosions, PvP, reactions
  (b) visual scene-change cuts     -> ffmpeg select='gt(scene,0.4)'
  (c) presence of speech           -> from the Whisper transcript
Candidates are merged, scored, and the top ~10 returned.
"""
import os
import re

from util import log, read_input, emit, require_ffmpeg, run, ffprobe_meta, extract_audio
from transcribe import transcribe

TARGET_HIGHLIGHTS = 10
CLIP_PAD = 6.0  # seconds of context to include around a detected peak
MIN_GAP = 8.0   # merge candidates closer than this


def detect_loudness_peaks(audio_path: str, duration: float):
    """Find RMS energy spikes using librosa. Returns list of (time, intensity 0..1)."""
    try:
        import librosa  # type: ignore
        import numpy as np
    except Exception as e:
        log(f"[loudness] librosa unavailable, skipping: {e}")
        return []

    y, sr = librosa.load(audio_path, sr=16000, mono=True)
    hop = 512
    rms = librosa.feature.rms(y=y, hop_length=hop)[0]
    if rms.size == 0:
        return []
    times = librosa.frames_to_time(np.arange(rms.size), sr=sr, hop_length=hop)

    # Normalise + pick frames well above the rolling mean.
    norm = rms / (rms.max() + 1e-9)
    thresh = float(norm.mean() + norm.std())
    peaks = []
    last_t = -1e9
    for t, v in zip(times, norm):
        if v >= thresh and (t - last_t) > MIN_GAP:
            peaks.append((float(t), float(v)))
            last_t = t
    log(f"[loudness] {len(peaks)} peaks (thresh={thresh:.2f})")
    return peaks


def detect_scene_changes(video_path: str):
    """Use ffmpeg scene detection to find visual cuts. Returns list of times (s)."""
    cp = run(
        [
            "ffmpeg", "-i", video_path,
            "-filter_complex", "select='gt(scene,0.4)',showinfo",
            "-an", "-f", "null", "-",
        ],
        check=False,
    )
    times = []
    for m in re.finditer(r"pts_time:([0-9.]+)", cp.stderr):
        times.append(float(m.group(1)))
    # thin out clustered cuts
    thinned, last = [], -1e9
    for t in sorted(times):
        if t - last > MIN_GAP:
            thinned.append(t)
            last = t
    log(f"[scene] {len(thinned)} scene changes")
    return thinned


def snippet_at(words, start, end) -> str | None:
    chunk = [w.text for w in words if w.start >= start - 1 and w.end <= end + 1]
    text = " ".join(chunk).strip()
    return text[:240] if text else None


def main():
    require_ffmpeg()
    data = read_input()
    video_path = data["videoPath"]
    log(f"[analyze] {video_path}")

    meta = ffprobe_meta(video_path)
    duration = meta["durationSec"]

    audio_path = extract_audio(video_path)
    segments, words = transcribe(audio_path)
    loud = detect_loudness_peaks(audio_path, duration)
    scenes = detect_scene_changes(video_path)

    # Build scored candidates keyed by a coarse time bucket so we can merge.
    candidates: dict[int, dict] = {}

    def add(t, base_score, reason):
        start = max(0.0, t - CLIP_PAD)
        end = min(duration or t + CLIP_PAD, t + CLIP_PAD)
        bucket = int(start // MIN_GAP)
        cur = candidates.get(bucket)
        has_speech = any(w.start >= start and w.end <= end for w in words)
        score = base_score + (0.15 if has_speech else 0.0)
        if cur is None or score > cur["score"]:
            candidates[bucket] = {
                "startSec": round(start, 2),
                "endSec": round(end, 2),
                "score": round(min(score, 1.0), 3),
                "reason": reason,
                "transcriptSnippet": snippet_at(words, start, end),
            }

    for t, intensity in loud:
        add(t, 0.55 + 0.4 * intensity, "loudness")
    for t in scenes:
        add(t, 0.5, "scene_change")
    for seg in segments:
        # Long/energetic speech segments are mild highlight signals on their own.
        if (seg["end"] - seg["start"]) >= 2.5:
            add((seg["start"] + seg["end"]) / 2, 0.45, "speech")

    highlights = sorted(candidates.values(), key=lambda h: h["score"], reverse=True)[:TARGET_HIGHLIGHTS]
    highlights.sort(key=lambda h: h["startSec"])

    try:
        os.remove(audio_path)
    except OSError:
        pass

    emit({
        "durationSec": round(duration, 2),
        "width": meta["width"],
        "height": meta["height"],
        "highlights": highlights,
    })


if __name__ == "__main__":
    main()
