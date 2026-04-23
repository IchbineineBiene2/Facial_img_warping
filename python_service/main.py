import numpy as np
from fastapi import FastAPI, File, Form, HTTPException, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from modules.aging import apply_aging, apply_deaging
from modules.landmark import detect_landmarks, draw_landmarks
from modules.landmark_fusion import detect_landmarks_fused
from modules.preprocessing import (
    detect_and_crop_face,
    normalize_face,
    validate_image,
)
from modules.pro_warping import (
    aging_pro,
    brow_lift_pro,
    de_aging_pro,
    plump_lips_pro,
    quality_metrics,
    slim_face_pro,
    smile_enhancement_pro,
)
from modules.warping import raise_eyebrows, simulate_smile, slim_face, widen_lips
from utils.image_utils import bytes_to_numpy, numpy_to_b64

app = FastAPI(title="Facial CV Service")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.exception_handler(Exception)
async def global_exception_handler(request, exc):
    return JSONResponse(status_code=500, content={"success": False, "message": str(exc)})


@app.get("/health")
async def health():
    return {"status": "ok", "service": "python-cv"}


@app.post("/preprocess")
async def preprocess(image: UploadFile = File(...)):
    file_bytes = await image.read()
    valid, err = validate_image(file_bytes, image.filename or "upload.jpg")
    if not valid:
        return {"success": False, "message": err}

    img = bytes_to_numpy(file_bytes)
    orig_h, orig_w = img.shape[:2]

    face, bbox = detect_and_crop_face(img)
    if face is None:
        return {"success": False, "message": "No face detected in image."}

    processed = normalize_face(face)
    return {
        "success": True,
        "original_size": [orig_w, orig_h],
        "face_bbox": list(bbox),
        "processed_image_b64": numpy_to_b64(processed),
        "message": "Face detected and preprocessed",
    }


@app.post("/landmarks")
async def landmarks(image: UploadFile = File(...)):
    file_bytes = await image.read()
    img = bytes_to_numpy(file_bytes)

    lms = detect_landmarks(img)
    if lms is None:
        return {"success": False, "message": "No face detected for landmark extraction."}

    annotated = draw_landmarks(img, lms)
    return {
        "success": True,
        "landmarks": [[x, y] for x, y in lms],
        "landmark_image_b64": numpy_to_b64(annotated),
        "landmark_count": len(lms),
    }


@app.post("/warp")
async def warp(
    image: UploadFile = File(...),
    operation: str = Form("smile"),
    intensity: float = Form(0.5),
):
    intensity = float(np.clip(intensity, 0.0, 1.0))
    file_bytes = await image.read()
    img = bytes_to_numpy(file_bytes)

    lms = detect_landmarks(img)
    if lms is None:
        return {"success": False, "message": "No face detected."}

    ops = {
        "smile": simulate_smile,
        "raise_eyebrows": raise_eyebrows,
        "widen_lips": widen_lips,
        "slim_face": slim_face,
    }

    if operation not in ops:
        return {"success": False, "message": f"Unknown operation '{operation}'. Valid: {list(ops.keys())}"}

    result_img = ops[operation](img, lms, intensity)
    lms_after = detect_landmarks(result_img) or lms

    return {
        "success": True,
        "operation": operation,
        "result_image_b64": numpy_to_b64(result_img),
        "landmarks_before": [[x, y] for x, y in lms],
        "landmarks_after": [[x, y] for x, y in lms_after],
    }


@app.post("/warp/pro")
async def warp_pro(
    image: UploadFile = File(...),
    operation: str = Form("lip_plump"),
    intensity: float = Form(0.6),
    landmark_backend: str = Form("hybrid"),
    rbf_smooth: float = Form(2.8),
    temporal_smoothing: bool = Form(False),
    ema_alpha: float = Form(0.62),
    stream_id: str = Form("default"),
):
    intensity = float(np.clip(intensity, 0.0, 1.0))
    file_bytes = await image.read()
    img = bytes_to_numpy(file_bytes)

    lms, landmark_info = detect_landmarks_fused(
        img,
        backend=landmark_backend,
        temporal_smoothing=temporal_smoothing,
        ema_alpha=ema_alpha,
        stream_id=stream_id,
    )
    if lms is None:
        return {"success": False, "message": "No face detected."}

    rbf_smooth = float(np.clip(rbf_smooth, 0.8, 10.0))

    ops = {
        "lip_plump": lambda im, lm, inten: plump_lips_pro(im, lm, inten, smooth=rbf_smooth),
        "slim_face": lambda im, lm, inten: slim_face_pro(im, lm, inten, smooth=rbf_smooth),
        "smile_enhancement": lambda im, lm, inten: smile_enhancement_pro(im, lm, inten, smooth=rbf_smooth),
        "brow_lift": lambda im, lm, inten: brow_lift_pro(im, lm, inten, smooth=rbf_smooth),
    }
    if operation not in ops:
        return {
            "success": False,
            "message": f"Unknown operation '{operation}'. Valid: {list(ops.keys())}",
        }

    result_img = ops[operation](img, lms, intensity)
    metrics = quality_metrics(img, result_img)

    return {
        "success": True,
        "operation": operation,
        "intensity": intensity,
        "rbf_smooth": rbf_smooth,
        "landmark_info": landmark_info,
        "metrics": metrics,
        "result_image_b64": numpy_to_b64(result_img),
    }


@app.post("/frequency")
async def frequency(
    image: UploadFile = File(...),
    mode: str = Form("aging"),
    intensity: float = Form(0.5),
):
    intensity = float(np.clip(intensity, 0.0, 1.0))
    file_bytes = await image.read()
    img = bytes_to_numpy(file_bytes)

    if mode == "aging":
        result_img = apply_aging(img, intensity)
    elif mode == "deaging":
        result_img = apply_deaging(img, intensity)
    else:
        return {"success": False, "message": f"Unknown mode '{mode}'. Valid: aging, deaging"}

    return {
        "success": True,
        "mode": mode,
        "result_image_b64": numpy_to_b64(result_img),
        "intensity": intensity,
    }


@app.post("/frequency/pro")
async def frequency_pro(
    image: UploadFile = File(...),
    mode: str = Form("aging"),
    intensity: float = Form(0.6),
    landmark_backend: str = Form("hybrid"),
    temporal_smoothing: bool = Form(False),
    ema_alpha: float = Form(0.62),
    stream_id: str = Form("default"),
):
    intensity = float(np.clip(intensity, 0.0, 1.0))
    file_bytes = await image.read()
    img = bytes_to_numpy(file_bytes)

    lms, landmark_info = detect_landmarks_fused(
        img,
        backend=landmark_backend,
        temporal_smoothing=temporal_smoothing,
        ema_alpha=ema_alpha,
        stream_id=stream_id,
    )

    if mode == "aging":
        out = aging_pro(img, lms, intensity=intensity)
    elif mode == "deaging":
        out = de_aging_pro(img, lms, intensity=intensity)
    else:
        return {
            "success": False,
            "message": f"Unknown mode '{mode}'. Valid: aging, deaging",
        }

    return {
        "success": True,
        "mode": mode,
        "intensity": intensity,
        "landmark_info": landmark_info,
        "result_image_b64": numpy_to_b64(out["result_image"]),
        "spectrum_before_b64": numpy_to_b64(out["spectrum_before"]),
        "spectrum_after_b64": numpy_to_b64(out["spectrum_after"]),
        "metrics": out["metrics"],
    }


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
