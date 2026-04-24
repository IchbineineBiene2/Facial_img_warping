from importlib.util import find_spec


def warn_missing_ai_dependencies() -> None:
    missing = [name for name in ("mediapipe", "deepface") if find_spec(name) is None]
    if missing:
        print(
            f"[startup] AI dependency warning: missing packages: {', '.join(missing)}. "
            "Install them before using expression transfer or age estimation."
        )
    else:
        print("[startup] AI dependencies detected: mediapipe, deepface")
