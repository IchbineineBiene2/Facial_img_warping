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
_WEBP_MAGIC = b"RIFF"


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
    if file_bytes.startswith(_WEBP_MAGIC) and b'WEBP' in file_bytes[8:12]:
        return 'webp'
    
    # Check if cv2 can decode it (e.g. AVIF, BMP, TIFF)
    img = cv2.imdecode(np.frombuffer(file_bytes, np.uint8), cv2.IMREAD_COLOR)
    if img is not None:
        return 'other'
        
    return None


def validate_image(file_bytes: bytes, filename: str) -> tuple[bool, str]:
    ext = os.path.splitext(filename.lower())[1]

    detected_kind = _detect_image_kind(file_bytes)
    if detected_kind is None:
        return False, "File does not appear to be a valid image."

    img = bytes_to_numpy(file_bytes)
    if img is None:
        return False, "Could not decode image."

    h, w = img.shape[:2]
    if w < 100 or h < 100:
        return False, f"Image too small ({w}x{h}). Minimum 100x100 required."

    return True, ""


def detect_and_crop_face(image_np: np.ndarray) -> tuple[np.ndarray | None, tuple | None]:
    """Detect and crop face from image.
    
    OPTIMIZATION: Downscales large images for face detection phase.
    """
    h, w = image_np.shape[:2]
    
    # --- Optimization: Downscale for detection if too large ---
    target_dim = 1024
    if max(h, w) > target_dim:
        scale = target_dim / max(h, w)
        new_w, new_h = int(w * scale), int(h * scale)
        proc_img = cv2.resize(image_np, (new_w, new_h), interpolation=cv2.INTER_LINEAR)
        is_scaled = True
    else:
        proc_img = image_np
        is_scaled = False
        scale = 1.0

    rgb = cv2.cvtColor(proc_img, cv2.COLOR_BGR2RGB)
    mp_image = mp.Image(image_format=mp.ImageFormat.SRGB, data=rgb)
    result = _detector.detect(mp_image)

    if not result.detections:
        return None, None

    bbox = result.detections[0].bounding_box
    # Scale bbox coordinates back if we downscaled
    inv_scale = 1.0 / scale if is_scaled else 1.0
    
    rx, ry, rbw, rbh = bbox.origin_x, bbox.origin_y, bbox.width, bbox.height
    
    # Actual coordinates in original image
    ax = int(rx * inv_scale)
    ay = int(ry * inv_scale)
    abw = int(rbw * inv_scale)
    abh = int(rbh * inv_scale)

    # Wide horizontal padding and extra-tall top padding to capture full hair.
    pad_x = int(abw * 0.35)
    pad_y_top = int(abh * 0.70)
    pad_y_bottom = int(abh * 0.15)
    
    x1 = max(0, ax - pad_x)
    y1 = max(0, ay - pad_y_top)
    x2 = min(w, ax + abw + pad_x)
    y2 = min(h, ay + abh + pad_y_bottom)

    return image_np[y1:y2, x1:x2], (x1, y1, x2 - x1, y2 - y1)


def normalize_face(face_np: np.ndarray, target_size: tuple = (256, 256)) -> np.ndarray:
    h, w = face_np.shape[:2]
    # Preserve aspect ratio: scale the longest edge to the target dimension.
    scale = min(target_size[0] / w, target_size[1] / h)
    new_w = max(1, int(w * scale))
    new_h = max(1, int(h * scale))
    interp = cv2.INTER_AREA if scale < 1.0 else cv2.INTER_LINEAR
    return cv2.resize(face_np, (new_w, new_h), interpolation=interp)


def to_grayscale(image_np: np.ndarray) -> np.ndarray:
    gray = cv2.cvtColor(image_np, cv2.COLOR_BGR2GRAY)
    return np.stack([gray, gray, gray], axis=-1)


def resize_to_standard(image_np: np.ndarray, size: tuple = (256, 256)) -> np.ndarray:
    return cv2.resize(image_np, size, interpolation=cv2.INTER_LINEAR)
