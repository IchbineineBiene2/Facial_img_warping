from __future__ import annotations

import math

import numpy as np
from skimage.metrics import structural_similarity
from skimage.transform import resize


def _to_numpy(image: np.ndarray) -> np.ndarray:
    if not isinstance(image, np.ndarray):
        raise TypeError("Input must be a numpy.ndarray.")
    if image.size == 0:
        raise ValueError("Input image cannot be empty.")
    return image


def _normalize_image(image: np.ndarray) -> np.ndarray:
    img = image.astype(np.float32, copy=False)

    # Keep metric ranges consistent by operating in [0, 1].
    max_val = float(np.max(img)) if img.size > 0 else 1.0
    if max_val > 1.0:
        img = img / 255.0

    return np.clip(img, 0.0, 1.0)


def _align_channels(reference: np.ndarray, candidate: np.ndarray) -> np.ndarray:
    if reference.ndim == candidate.ndim:
        return candidate

    if reference.ndim == 3 and candidate.ndim == 2:
        return np.repeat(candidate[..., np.newaxis], reference.shape[2], axis=2)

    if reference.ndim == 2 and candidate.ndim == 3:
        return np.mean(candidate, axis=2)

    raise ValueError("Unsupported channel configuration for image comparison.")


def _resize_to_reference(reference: np.ndarray, candidate: np.ndarray) -> tuple[np.ndarray, bool]:
    if reference.shape == candidate.shape:
        return candidate, False

    resized = resize(
        candidate,
        reference.shape,
        mode="reflect",
        anti_aliasing=True,
        preserve_range=True,
    ).astype(np.float32)
    return resized, True


def _prepare_images(original: np.ndarray, transformed: np.ndarray) -> tuple[np.ndarray, np.ndarray, dict]:
    org = _to_numpy(original)
    trf = _to_numpy(transformed)

    trf = _align_channels(org, trf)
    trf, resized = _resize_to_reference(org, trf)

    org_norm = _normalize_image(org)
    trf_norm = _normalize_image(trf)

    prep_info = {
        "original_shape": tuple(int(v) for v in org.shape),
        "transformed_shape": tuple(int(v) for v in transformed.shape),
        "aligned_shape": tuple(int(v) for v in org_norm.shape),
        "was_resized": bool(resized),
    }
    return org_norm, trf_norm, prep_info


def compute_mse(original: np.ndarray, transformed: np.ndarray) -> dict:
    org_norm, trf_norm, prep_info = _prepare_images(original, transformed)
    mse = float(np.mean((org_norm - trf_norm) ** 2))

    return {
        "mse": mse,
        "preprocessing": prep_info,
    }


def compute_psnr(original: np.ndarray, transformed: np.ndarray) -> dict:
    mse_result = compute_mse(original, transformed)
    mse = mse_result["mse"]

    if mse <= 1e-12:
        psnr = float("inf")
    else:
        # For normalized images MAX_I = 1.0.
        psnr = float(10.0 * math.log10(1.0 / mse))

    return {
        "mse": mse,
        "psnr": psnr,
        "preprocessing": mse_result["preprocessing"],
    }


def compute_ssim(original: np.ndarray, transformed: np.ndarray) -> dict:
    org_norm, trf_norm, prep_info = _prepare_images(original, transformed)

    if org_norm.ndim == 3:
        ssim_value = float(
            structural_similarity(
                org_norm,
                trf_norm,
                data_range=1.0,
                channel_axis=-1,
            )
        )
    else:
        ssim_value = float(structural_similarity(org_norm, trf_norm, data_range=1.0))

    return {
        "ssim": ssim_value,
        "preprocessing": prep_info,
    }


def evaluate_metrics(original: np.ndarray, transformed: np.ndarray) -> dict:
    org_norm, trf_norm, prep_info = _prepare_images(original, transformed)

    mse = float(np.mean((org_norm - trf_norm) ** 2))
    psnr = float("inf") if mse <= 1e-12 else float(10.0 * math.log10(1.0 / mse))

    if org_norm.ndim == 3:
        ssim_value = float(
            structural_similarity(
                org_norm,
                trf_norm,
                data_range=1.0,
                channel_axis=-1,
            )
        )
    else:
        ssim_value = float(structural_similarity(org_norm, trf_norm, data_range=1.0))

    return {
        "mse": mse,
        "psnr": psnr,
        "ssim": ssim_value,
        "preprocessing": prep_info,
    }


def compute_quality_metrics(original: np.ndarray, transformed: np.ndarray) -> dict:
    return evaluate_metrics(original, transformed)
