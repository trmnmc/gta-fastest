"""Generate ASS subtitles with animated word-by-word (karaoke) highlighting.

Whisper word timestamps drive the timing. Words are grouped into short phrases
(~3 words) so vertical short-form captions stay readable.
"""
from util import Word


def _hex_to_ass(color: str) -> str:
    """#RRGGBB -> ASS &HBBGGRR& (ASS uses BGR)."""
    c = color.lstrip("#")
    if len(c) != 6:
        return "&H00FFFFFF"
    r, g, b = c[0:2], c[2:4], c[4:6]
    return f"&H00{b}{g}{r}".upper()


def _fmt_time(t: float) -> str:
    if t < 0:
        t = 0
    h = int(t // 3600)
    m = int((t % 3600) // 60)
    s = t % 60
    return f"{h:d}:{m:02d}:{s:05.2f}"


CAPTION_PRESETS = {
    # fontname is best-effort; falls back to libass default if absent.
    "karaoke": {"font": "Arial Black", "size": 64, "outline": 4, "bold": -1},
    "block": {"font": "Press Start 2P", "size": 44, "outline": 5, "bold": -1},
    "clean": {"font": "Arial", "size": 58, "outline": 3, "bold": -1},
}


def build_ass(
    words: list[Word],
    clip_start: float,
    width: int,
    height: int,
    style: str,
    text_color: str,
    accent_color: str,
    words_per_line: int = 3,
) -> str:
    """Return a full ASS subtitle document covering the clip window.

    Timestamps in `words` are absolute; we offset by `clip_start` so the captions
    line up with the *cut* clip (which starts at t=0).
    """
    preset = CAPTION_PRESETS.get(style, CAPTION_PRESETS["karaoke"])
    primary = _hex_to_ass(text_color)
    accent = _hex_to_ass(accent_color)

    header = f"""[Script Info]
ScriptType: v4.00+
PlayResX: {width}
PlayResY: {height}
WrapStyle: 2
ScaledBorderAndShadow: yes

[V4+ Styles]
Format: Name, Fontname, Fontsize, PrimaryColour, SecondaryColour, OutlineColour, BackColour, Bold, Italic, Underline, StrikeOut, ScaleX, ScaleY, Spacing, Angle, BorderStyle, Outline, Shadow, Alignment, MarginL, MarginR, MarginV, Encoding
Style: Cap,{preset['font']},{preset['size']},{primary},{accent},&H00101010,&H64000000,{preset['bold']},0,0,0,100,100,0,0,1,{preset['outline']},2,2,60,60,260,1

[Events]
Format: Layer, Start, End, Style, Name, MarginL, MarginR, MarginV, Effect, Text
"""

    # Group words into short phrase lines.
    lines = []
    for i in range(0, len(words), words_per_line):
        group = words[i : i + words_per_line]
        if group:
            lines.append(group)

    events = []
    for group in lines:
        gstart = group[0].start - clip_start
        gend = group[-1].end - clip_start
        if gend <= 0:
            continue
        gstart = max(0.0, gstart)

        # karaoke style: each word lights up in the accent colour as it's spoken.
        if style in ("karaoke", "block"):
            parts = []
            for w in group:
                dur_cs = max(1, int(round((w.end - w.start) * 100)))  # centiseconds
                parts.append(f"{{\\k{dur_cs}}}{w.text} ")
            text = "{\\an2}" + "".join(parts).strip()
        else:
            text = "{\\an2}" + " ".join(w.text for w in group)

        events.append(
            f"Dialogue: 0,{_fmt_time(gstart)},{_fmt_time(gend)},Cap,,0,0,0,,{text}"
        )

    return header + "\n".join(events) + "\n"
