import cv2
import numpy as np
from threading import Lock

from modules.landmark import detect_landmarks, get_key_landmark_indices

try:
    import dlib  # type: ignore
    _HAS_DLIB = True
except Exception:
    dlib = None
    _HAS_DLIB = False


_DLIB_MODEL_PATH = "models/shape_predictor_68_face_landmarks.dat"
_DLIB_DETECTOR = None
_DLIB_PREDICTOR = None
_TEMPORAL_CACHE: dict[str, np.ndarray] = {}
_TEMPORAL_LOCK = Lock()


def reset_temporal_state(stream_id: str | None = None) -> None:
    with _TEMPORAL_LOCK:
        if stream_id is None:
            _TEMPORAL_CACHE.clear()
            return
        _TEMPORAL_CACHE.pop(stream_id, None)


def _ema_smooth(
    points: list[tuple[int, int]],
    stream_id: str,
    ema_alpha: float,
    max_jump_px: float = 36.0,
) -> list[tuple[int, int]]:
    if not points:
        return points

    alpha = float(np.clip(ema_alpha, 0.05, 0.95))
    current = np.array(points, dtype=np.float32)

    with _TEMPORAL_LOCK:
        prev = _TEMPORAL_CACHE.get(stream_id)
        if prev is None or prev.shape != current.shape:
            _TEMPORAL_CACHE[stream_id] = current
            return points

        # Adaptive EMA: strong smoothing at small motion, quick catch-up at large motion.
        motion = np.linalg.norm(current - prev, axis=1, keepdims=True)
        motion_ratio = np.clip(motion / float(max_jump_px), 0.0, 1.0)
        adaptive_alpha = alpha + (1.0 - alpha) * motion_ratio

        smoothed = adaptive_alpha * current + (1.0 - adaptive_alpha) * prev
        _TEMPORAL_CACHE[stream_id] = smoothed

    rounded = np.rint(smoothed).astype(np.int32)
    return [(int(x), int(y)) for x, y in rounded]


def _init_dlib() -> bool:
    global _DLIB_DETECTOR, _DLIB_PREDICTOR
    if not _HAS_DLIB:
        return False
    if _DLIB_DETECTOR is not None and _DLIB_PREDICTOR is not None:
        return True

    try:
        _DLIB_DETECTOR = dlib.get_frontal_face_detector()
        _DLIB_PREDICTOR = dlib.shape_predictor(_DLIB_MODEL_PATH)
        return True
    except Exception:
        _DLIB_DETECTOR = None
        _DLIB_PREDICTOR = None
        return False


def _detect_dlib_68(image_np: np.ndarray) -> list[tuple[int, int]] | None:
    if not _init_dlib():
        return None

    gray = cv2.cvtColor(image_np, cv2.COLOR_BGR2GRAY)
    faces = _DLIB_DETECTOR(gray, 1)
    if len(faces) == 0:
        return None

    face = faces[0]
    shape = _DLIB_PREDICTOR(gray, face)
    points: list[tuple[int, int]] = []
    for i in range(68):
        p = shape.part(i)
        points.append((int(p.x), int(p.y)))
    return points


def _blend_points(mp_points: list[tuple[int, int]], dlib_points: list[tuple[int, int]]) -> list[tuple[int, int]]:
    out = list(mp_points)
    key = get_key_landmark_indices()

    # Lightweight mapping from dlib 68 regions to MediaPipe indices.
    mp_mouth = key["mouth_outer"]
    mp_jaw = key["jaw"]

    dlib_mouth = list(range(48, 60))
    dlib_jaw = list(range(0, 17))

    mouth_n = min(len(mp_mouth), len(dlib_mouth))
    jaw_n = min(len(mp_jaw), len(dlib_jaw))

    for i in range(mouth_n):
        mp_i = mp_mouth[i]
        dl_i = dlib_mouth[i]
        if mp_i < len(out) and dl_i < len(dlib_points):
            mx, my = out[mp_i]
            dx, dy = dlib_points[dl_i]
            out[mp_i] = (int(0.65 * mx + 0.35 * dx), int(0.65 * my + 0.35 * dy))

    for i in range(jaw_n):
        mp_i = mp_jaw[i]
        dl_i = dlib_jaw[i]
        if mp_i < len(out) and dl_i < len(dlib_points):
            mx, my = out[mp_i]
            dx, dy = dlib_points[dl_i]
            out[mp_i] = (int(0.70 * mx + 0.30 * dx), int(0.70 * my + 0.30 * dy))

    return out


def detect_landmarks_fused(
    image_np: np.ndarray,
    backend: str = "hybrid",
    temporal_smoothing: bool = False,
    ema_alpha: float = 0.62,
    stream_id: str = "default",
) -> tuple[list[tuple[int, int]] | None, dict]:
    backend = backend.lower().strip()

    if backend not in {"mediapipe", "dlib", "hybrid"}:
        backend = "hybrid"

    mp_points = detect_landmarks(image_np)
    dl_points = _detect_dlib_68(image_np) if backend in {"dlib", "hybrid"} else None

    if backend == "mediapipe":
        if temporal_smoothing and mp_points is not None:
            mp_points = _ema_smooth(mp_points, stream_id=stream_id, ema_alpha=ema_alpha)
        return mp_points, {
            "backend": "mediapipe",
            "dlib_available": _HAS_DLIB,
            "temporal_smoothing": temporal_smoothing,
            "ema_alpha": float(np.clip(ema_alpha, 0.05, 0.95)),
            "stream_id": stream_id,
        }

    if backend == "dlib":
        if dl_points is None:
            if temporal_smoothing and mp_points is not None:
                mp_points = _ema_smooth(mp_points, stream_id=stream_id, ema_alpha=ema_alpha)
            return mp_points, {
                "backend": "mediapipe-fallback",
                "dlib_available": _HAS_DLIB,
                "message": "Dlib unavailable or no face detected; fell back to MediaPipe.",
                "temporal_smoothing": temporal_smoothing,
                "ema_alpha": float(np.clip(ema_alpha, 0.05, 0.95)),
                "stream_id": stream_id,
            }
        if temporal_smoothing:
            dl_points = _ema_smooth(dl_points, stream_id=stream_id, ema_alpha=ema_alpha)
        return dl_points, {
            "backend": "dlib",
            "dlib_available": _HAS_DLIB,
            "temporal_smoothing": temporal_smoothing,
            "ema_alpha": float(np.clip(ema_alpha, 0.05, 0.95)),
            "stream_id": stream_id,
        }

    # hybrid
    if mp_points is None and dl_points is None:
        reset_temporal_state(stream_id)
        return None, {
            "backend": "none",
            "dlib_available": _HAS_DLIB,
            "temporal_smoothing": temporal_smoothing,
            "ema_alpha": float(np.clip(ema_alpha, 0.05, 0.95)),
            "stream_id": stream_id,
        }
    if mp_points is None:
        if temporal_smoothing and dl_points is not None:
            dl_points = _ema_smooth(dl_points, stream_id=stream_id, ema_alpha=ema_alpha)
        return dl_points, {
            "backend": "dlib-only",
            "dlib_available": _HAS_DLIB,
            "temporal_smoothing": temporal_smoothing,
            "ema_alpha": float(np.clip(ema_alpha, 0.05, 0.95)),
            "stream_id": stream_id,
        }
    if dl_points is None:
        if temporal_smoothing and mp_points is not None:
            mp_points = _ema_smooth(mp_points, stream_id=stream_id, ema_alpha=ema_alpha)
        return mp_points, {
            "backend": "mediapipe-only",
            "dlib_available": _HAS_DLIB,
            "temporal_smoothing": temporal_smoothing,
            "ema_alpha": float(np.clip(ema_alpha, 0.05, 0.95)),
            "stream_id": stream_id,
        }

    fused = _blend_points(mp_points, dl_points)
    if temporal_smoothing:
        fused = _ema_smooth(fused, stream_id=stream_id, ema_alpha=ema_alpha)
    return fused, {
        "backend": "hybrid",
        "dlib_available": _HAS_DLIB,
        "temporal_smoothing": temporal_smoothing,
        "ema_alpha": float(np.clip(ema_alpha, 0.05, 0.95)),
        "stream_id": stream_id,
    }
