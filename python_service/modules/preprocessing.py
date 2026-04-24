import os

import cv2
import mediapipe as mp
import numpy as np
from mediapipe.tasks import python as mp_python
from mediapipe.tasks.python import vision as mp_vision

from utils.image_utils import bytes_to_numpy
from utils.model_utils import get_model_path

_ALLOWED_EXTENSIONS = {'.jpg', '.jpeg', '.png'}
_JPEG_MAGIC = bytes([0xFF, 0xD8, 0xFF])
_PNG_MAGIC = bytes([0x89, 0x50, 0x4E, 0x47])


def _build_detector():
    model_path = get_model_path('face_detector')
    options = mp_vision.FaceDetectorOptions(
        base_options=mp_python.BaseOptions(model_asset_path=model_path),
        min_detection_confidence=0.5,
    )
    return mp_vision.FaceDetector.create_from_options(options)


_detector = _build_detector()


def _detect_image_kind(file_bytes: bytes) -> str | None:
    if file_bytes.startswith(_PNG_MAGIC):
        return 'png'
    if file_bytes.startswith(_JPEG_MAGIC):
        return 'jpeg'
    return None


def validate_image(file_bytes: bytes, filename: str) -> tuple[bool, str]:
    ext = os.path.splitext(filename.lower())[1]
    if ext and ext not in _ALLOWED_EXTENSIONS:
        return False, f"Unsupported file type '{ext}'. Allowed: jpg, jpeg, png."

    detected_kind = _detect_image_kind(file_bytes)
    if detected_kind is None:
        return False, "File does not appear to be a valid JPEG or PNG."

    img = bytes_to_numpy(file_bytes)
    if img is None:
        return False, "Could not decode image."

    h, w = img.shape[:2]
    if w < 100 or h < 100:
        return False, f"Image too small ({w}x{h}). Minimum 100x100 required."

    return True, ""


def detect_and_crop_face(image_np: np.ndarray) -> tuple[np.ndarray | None, tuple | None]:
    h, w = image_np.shape[:2]
    rgb = cv2.cvtColor(image_np, cv2.COLOR_BGR2RGB)
    mp_image = mp.Image(image_format=mp.ImageFormat.SRGB, data=rgb)
    result = _detector.detect(mp_image)

    if not result.detections:
        return None, None

    bbox = result.detections[0].bounding_box
    x, y, bw, bh = bbox.origin_x, bbox.origin_y, bbox.width, bbox.height

    pad_x = int(bw * 0.10)
    pad_y = int(bh * 0.10)
    x1 = max(0, x - pad_x)
    y1 = max(0, y - pad_y)
    x2 = min(w, x + bw + pad_x)
    y2 = min(h, y + bh + pad_y)

    return image_np[y1:y2, x1:x2], (x1, y1, x2 - x1, y2 - y1)


def normalize_face(face_np: np.ndarray, target_size: tuple = (256, 256)) -> np.ndarray:
    h, w = face_np.shape[:2]
    interp = cv2.INTER_AREA if (w > target_size[0] or h > target_size[1]) else cv2.INTER_LINEAR
    return cv2.resize(face_np, target_size, interpolation=interp)


def to_grayscale(image_np: np.ndarray) -> np.ndarray:
    gray = cv2.cvtColor(image_np, cv2.COLOR_BGR2GRAY)
    return np.stack([gray, gray, gray], axis=-1)


def resize_to_standard(image_np: np.ndarray, size: tuple = (256, 256)) -> np.ndarray:
    return cv2.resize(image_np, size, interpolation=cv2.INTER_LINEAR)
