import os
import urllib.request

_MODELS_DIR = os.path.join(os.path.dirname(__file__), '..', 'models')

_REGISTRY = {
    'face_detector': (
        os.path.join(_MODELS_DIR, 'blaze_face_short_range.tflite'),
        'https://storage.googleapis.com/mediapipe-models/face_detector/blaze_face_short_range/float16/1/blaze_face_short_range.tflite',
    ),
    'face_landmarker': (
        os.path.join(_MODELS_DIR, 'face_landmarker.task'),
        'https://storage.googleapis.com/mediapipe-models/face_landmarker/face_landmarker/float16/1/face_landmarker.task',
    ),
}


def get_model_path(name: str) -> str:
    path, url = _REGISTRY[name]
    if not os.path.exists(path):
        os.makedirs(os.path.dirname(path), exist_ok=True)
        print(f"Downloading {os.path.basename(path)} ...", flush=True)
        urllib.request.urlretrieve(url, path)
        print(f"  done -> {path}", flush=True)
    return path
