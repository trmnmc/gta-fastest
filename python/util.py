"""Shared helpers for the CreeperClips Python worker."""
import json
import shutil
import subprocess
import sys
import tempfile
from dataclasses import dataclass


def log(*args):
    """Progress/log output goes to stderr; stdout is reserved for the JSON result."""
    print(*args, file=sys.stderr, flush=True)


def read_input() -> dict:
    """The Node worker passes a JSON job payload on stdin."""
    raw = sys.stdin.read()
    return json.loads(raw) if raw.strip() else {}


def emit(result: dict):
    """Print exactly one JSON object as the final stdout line."""
    print(json.dumps(result), flush=True)


def require_ffmpeg():
    for tool in ("ffmpeg", "ffprobe"):
        if shutil.which(tool) is None:
            raise RuntimeError(
                f"{tool} not found on PATH. Install ffmpeg (e.g. `brew install ffmpeg` "
                f"or `apt install ffmpeg`)."
            )


def run(cmd: list[str], check=True) -> subprocess.CompletedProcess:
    log("$ " + " ".join(cmd))
    return subprocess.run(cmd, check=check, capture_output=True, text=True)


def ffprobe_meta(path: str) -> dict:
    """Return duration/width/height for a video file."""
    cp = run(
        [
            "ffprobe", "-v", "error",
            "-select_streams", "v:0",
            "-show_entries", "format=duration:stream=width,height",
            "-of", "json", path,
        ]
    )
    data = json.loads(cp.stdout)
    stream = (data.get("streams") or [{}])[0]
    duration = float(data.get("format", {}).get("duration", 0.0) or 0.0)
    return {
        "durationSec": duration,
        "width": int(stream.get("width", 0) or 0),
        "height": int(stream.get("height", 0) or 0),
    }


def extract_audio(video_path: str, sample_rate: int = 16000) -> str:
    """Extract mono PCM wav for transcription / loudness analysis. Returns temp path."""
    tmp = tempfile.NamedTemporaryFile(suffix=".wav", delete=False)
    tmp.close()
    run([
        "ffmpeg", "-y", "-i", video_path,
        "-vn", "-ac", "1", "-ar", str(sample_rate), "-f", "wav", tmp.name,
    ])
    return tmp.name


@dataclass
class Word:
    start: float
    end: float
    text: str
