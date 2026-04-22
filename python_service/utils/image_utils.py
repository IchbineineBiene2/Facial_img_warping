import base64
import cv2
import numpy as np


def numpy_to_b64(img_np: np.ndarray) -> str:
    success, buf = cv2.imencode('.png', img_np)
    if not success:
        raise ValueError("Failed to encode image to PNG")
    return base64.b64encode(buf.tobytes()).decode('utf-8')


def b64_to_numpy(b64_str: str) -> np.ndarray:
    raw = base64.b64decode(b64_str)
    arr = np.frombuffer(raw, dtype=np.uint8)
    img = cv2.imdecode(arr, cv2.IMREAD_COLOR)
    if img is None:
        raise ValueError("Failed to decode base64 image")
    return img


def bytes_to_numpy(image_bytes: bytes) -> np.ndarray:
    arr = np.frombuffer(image_bytes, dtype=np.uint8)
    img = cv2.imdecode(arr, cv2.IMREAD_COLOR)
    if img is None:
        raise ValueError("Failed to decode image bytes")
    return img
