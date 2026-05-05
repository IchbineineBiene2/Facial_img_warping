"""Hair segmentation and whitening using MediaPipe multiclass selfie segmenter.

The selfie_multiclass_256x256 model outputs per-pixel category masks:
  0 = background
  1 = hair
  2 = body skin
  3 = face skin
  4 = clothes
  5 = others (accessories, etc.)

We extract category 1 (hair) for a precise hair mask, then apply a
natural-looking silver/gray whitening effect.
"""

from __future__ import annotations

import cv2
import numpy as np
import mediapipe as mp
from mediapipe.tasks import python as mp_python
from mediapipe.tasks.python import vision as mp_vision

from utils.model_utils import get_model_path


# ---------------------------------------------------------------------------
# Segmenter singleton
# ---------------------------------------------------------------------------

_segmenter: mp_vision.ImageSegmenter | None = None


def _get_segmenter() -> mp_vision.ImageSegmenter:
    global _segmenter
    if _segmenter is None:
        model_path = get_model_path("selfie_multiclass")
        options = mp_vision.ImageSegmenterOptions(
            base_options=mp_python.BaseOptions(model_asset_path=model_path),
            output_category_mask=True,
            running_mode=mp_vision.RunningMode.IMAGE,
        )
        _segmenter = mp_vision.ImageSegmenter.create_from_options(options)
    return _segmenter


# ---------------------------------------------------------------------------
# Hair mask via MediaPipe segmentation
# ---------------------------------------------------------------------------

def get_hair_mask(image_bgr: np.ndarray) -> np.ndarray:
    """Return a soft [0..1] float32 hair mask using MediaPipe segmenter.

    OPTIMIZATION: Downscales large images for segmentation phase.
    """
    h, w = image_bgr.shape[:2]
    try:
        segmenter = _get_segmenter()
        
        # --- Optimization: Downscale for segmenter if large ---
        # The model uses 256x256 internally anyway.
        target_dim = 1024
        if max(h, w) > target_dim:
            scale = target_dim / max(h, w)
            new_w, new_h = int(w * scale), int(h * scale)
            proc_img = cv2.resize(image_bgr, (new_w, new_h), interpolation=cv2.INTER_LINEAR)
        else:
            proc_img = image_bgr

        rgb = cv2.cvtColor(proc_img, cv2.COLOR_BGR2RGB)
        mp_image = mp.Image(image_format=mp.ImageFormat.SRGB, data=rgb)
        result = segmenter.segment(mp_image)

        if result.category_mask is not None:
            cat = result.category_mask.numpy_view()           # (H, W) uint8
            hair_raw = (cat == 1).astype(np.uint8) * 255      # category 1 = hair
            # Resize to original dimensions
            hair_raw = cv2.resize(hair_raw, (w, h), interpolation=cv2.INTER_LINEAR)
            # Morphological cleanup
            hair_raw = cv2.morphologyEx(hair_raw, cv2.MORPH_CLOSE,
                                        np.ones((5, 5), np.uint8), iterations=2)
            hair_raw = cv2.morphologyEx(hair_raw, cv2.MORPH_OPEN,
                                        np.ones((3, 3), np.uint8), iterations=1)
            # Smooth edges for natural blending
            hair_raw = cv2.GaussianBlur(hair_raw, (21, 21), 0)
            return hair_raw.astype(np.float32) / 255.0

    except Exception as exc:
        print(f"[hair_segmentation] Model fallback: {exc}")

    # Fallback: empty mask
    return np.zeros((h, w), dtype=np.float32)


# ---------------------------------------------------------------------------
# Hair whitening / silver effect
# ---------------------------------------------------------------------------

def apply_hair_whitening(
    image_bgr: np.ndarray,
    hair_mask: np.ndarray | None = None,
    intensity: float = 0.6,
) -> np.ndarray:
    """Apply a natural silver/gray hair whitening effect."""
    intensity = float(np.clip(intensity, 0.0, 1.0))
    if intensity < 0.05:
        return image_bgr.copy()

    h, w = image_bgr.shape[:2]

    if hair_mask is None:
        hair_mask = get_hair_mask(image_bgr)

    # Skip if no hair detected
    if float(np.max(hair_mask)) < 0.1:
        return image_bgr.copy()

    result = image_bgr.astype(np.float32)
    hair3 = np.expand_dims(hair_mask, axis=2)

    # --- Step 1: Convert to LAB for perceptual color manipulation ---
    lab = cv2.cvtColor(image_bgr, cv2.COLOR_BGR2LAB).astype(np.float32)
    l_channel = lab[:, :, 0]  # Luminance
    a_channel = lab[:, :, 1]  # Green-Red
    b_channel = lab[:, :, 2]  # Blue-Yellow

    # --- Step 2: Desaturate hair (push a,b channels toward neutral 128) ---
    desat_strength = 0.70 + 0.30 * intensity  # 0.70 .. 1.0
    a_neutral = a_channel * (1.0 - desat_strength * hair_mask) + 128.0 * (desat_strength * hair_mask)
    b_neutral = b_channel * (1.0 - desat_strength * hair_mask) + 128.0 * (desat_strength * hair_mask)

    # --- Step 3: Brighten luminance toward silver ---
    # Target luminance for silver hair: bright but not blown out
    target_l = 180.0 + 40.0 * intensity  # 180..220
    l_bright = l_channel + (target_l - l_channel) * (0.35 + 0.35 * intensity) * hair_mask

    # --- Step 4: Add subtle cool tint (slightly blue-ish silver) ---
    b_neutral = b_neutral - 4.0 * intensity * hair_mask  # slight blue shift

    # --- Step 5: Reconstruct and preserve texture ---
    # Extract luminance detail from original (high-frequency texture)
    l_smooth = cv2.GaussianBlur(l_channel, (0, 0), sigmaX=2.0, sigmaY=2.0)
    l_detail = l_channel - l_smooth  # hair strand texture

    # Apply detail back to brightened luminance
    l_final = l_bright + l_detail * (0.6 + 0.4 * intensity)

    lab_out = np.stack([
        np.clip(l_final, 0, 255),
        np.clip(a_neutral, 0, 255),
        np.clip(b_neutral, 0, 255),
    ], axis=2).astype(np.uint8)

    silver_hair = cv2.cvtColor(lab_out, cv2.COLOR_LAB2BGR).astype(np.float32)

    # --- Step 6: Blend with original using the hair mask ---
    blend_alpha = hair3 * (0.50 + 0.50 * intensity)  # 0.50..1.0 within hair
    out = result * (1.0 - blend_alpha) + silver_hair * blend_alpha

    return np.clip(out, 0, 255).astype(np.uint8)
