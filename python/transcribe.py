"""faster-whisper transcription with graceful degradation.

If faster-whisper isn't installed (or the model can't load), transcription is
skipped and the rest of the pipeline still works using loudness/scene signals.
"""
import os
from util import log, Word

_model = None
_load_failed = False


def _get_model():
    global _model, _load_failed
    if _model is not None or _load_failed:
        return _model
    try:
        from faster_whisper import WhisperModel  # type: ignore

        name = os.environ.get("WHISPER_MODEL", "base")
        device = os.environ.get("WHISPER_DEVICE", "cpu")
        compute = "float16" if device == "cuda" else "int8"
        log(f"[whisper] loading model={name} device={device} compute={compute}")
        _model = WhisperModel(name, device=device, compute_type=compute)
    except Exception as e:  # pragma: no cover - depends on env
        log(f"[whisper] unavailable, continuing without transcription: {e}")
        _load_failed = True
        _model = None
    return _model


def transcribe(audio_path: str, start: float = 0.0):
    """Return (segments, words). Each word has absolute timestamps offset by `start`.

    segments: list of {start, end, text}
    words:    list of Word(start, end, text)
    """
    model = _get_model()
    if model is None:
        return [], []

    segments_iter, _info = model.transcribe(
        audio_path, word_timestamps=True, vad_filter=True
    )
    segments = []
    words: list[Word] = []
    for seg in segments_iter:
        segments.append({
            "start": float(seg.start) + start,
            "end": float(seg.end) + start,
            "text": seg.text.strip(),
        })
        for w in (seg.words or []):
            words.append(Word(start=float(w.start) + start, end=float(w.end) + start, text=w.word.strip()))
    log(f"[whisper] {len(segments)} segments, {len(words)} words")
    return segments, words
