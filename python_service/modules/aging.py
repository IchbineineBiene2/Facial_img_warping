import cv2
import numpy as np


def _skin_mask(image_np: np.ndarray) -> np.ndarray:
    ycrcb = cv2.cvtColor(image_np, cv2.COLOR_BGR2YCrCb)
    lower = np.array([0, 133, 77], dtype=np.uint8)
    upper = np.array([255, 173, 127], dtype=np.uint8)
    mask = cv2.inRange(ycrcb, lower, upper)
    mask = cv2.medianBlur(mask, 5)
    mask = cv2.GaussianBlur(mask, (9, 9), 0)
    return mask.astype(np.float32) / 255.0


def _normalized_abs_detail(gray: np.ndarray, sigma: float) -> np.ndarray:
    blur = cv2.GaussianBlur(gray, (0, 0), sigmaX=sigma, sigmaY=sigma)
    detail = np.abs(gray - blur)
    return cv2.normalize(detail, None, 0.0, 1.0, cv2.NORM_MINMAX)


def _hair_mask(image_np: np.ndarray, skin_mask: np.ndarray) -> np.ndarray:
    h, w = image_np.shape[:2]
    hsv = cv2.cvtColor(image_np, cv2.COLOR_BGR2HSV)

    # Hair is usually non-skin, darker and mostly in upper half of the crop.
    dark = (hsv[:, :, 2] < 170).astype(np.uint8)
    not_skin = (skin_mask < 0.35).astype(np.uint8)
    upper = np.zeros((h, w), dtype=np.uint8)
    upper[: int(h * 0.58), :] = 1

    hair = (dark & not_skin & upper).astype(np.uint8) * 255
    hair = cv2.morphologyEx(hair, cv2.MORPH_OPEN, np.ones((3, 3), np.uint8), iterations=1)
    hair = cv2.morphologyEx(hair, cv2.MORPH_CLOSE, np.ones((5, 5), np.uint8), iterations=2)
    hair = cv2.GaussianBlur(hair, (11, 11), 0)
    return hair.astype(np.float32) / 255.0


def apply_aging(image_np: np.ndarray, intensity: float = 0.5) -> np.ndarray:
    intensity = float(np.clip(intensity, 0.0, 1.0))
    img = image_np.astype(np.float32)
    h, w = img.shape[:2]

    result = img.copy()
    skin = _skin_mask(image_np)

    # 1. Build wrinkle map from facial detail + directional texture noise.
    gray = cv2.cvtColor(image_np, cv2.COLOR_BGR2GRAY).astype(np.float32)
    detail_fine = _normalized_abs_detail(gray, sigma=1.2)
    detail_mid = _normalized_abs_detail(gray, sigma=2.8)

    rng = np.random.default_rng(42)
    noise = rng.standard_normal((h, w)).astype(np.float32)
    horizontal_lines = cv2.GaussianBlur(noise, (0, 0), sigmaX=7.0 + intensity * 7.0, sigmaY=1.0 + intensity * 1.2)
    diagonal_lines = cv2.GaussianBlur(noise, (0, 0), sigmaX=3.0 + intensity * 4.0, sigmaY=2.0 + intensity * 3.0)
    texture = 0.65 * horizontal_lines + 0.35 * diagonal_lines
    texture = cv2.normalize(np.abs(texture), None, 0.0, 1.0, cv2.NORM_MINMAX)

    wrinkle_map = 0.40 * detail_fine + 0.35 * detail_mid + 0.25 * texture
    wrinkle_map = cv2.GaussianBlur(wrinkle_map, (0, 0), sigmaX=0.9, sigmaY=0.9)
    wrinkle_map *= skin

    wrinkle_strength = 28.0 + 44.0 * intensity
    for c in range(3):
        result[:, :, c] -= wrinkle_map * wrinkle_strength

    # 2. Tone shift for aging: darker and slightly warmer skin.
    result[:, :, 0] *= (1.0 - 0.075 * intensity)   # less blue
    result[:, :, 1] *= (1.0 - 0.035 * intensity)
    result[:, :, 2] *= (1.0 + 0.045 * intensity)   # a little more red
    result *= (1.0 - 0.100 * intensity)

    # 3.5 Hair whitening for older appearance.
    hair = _hair_mask(image_np, skin)
    hair3 = np.expand_dims(hair, axis=2)
    gray = cv2.cvtColor(result.astype(np.uint8), cv2.COLOR_BGR2GRAY).astype(np.float32)
    gray3 = np.stack([gray, gray, gray], axis=2)
    hair_whiten = 25.0 + 95.0 * intensity
    result = result * (1.0 - hair3 * 0.55 * intensity) + (gray3 + hair_whiten) * (hair3 * 0.55 * intensity)

    # 3. Keep edges/facial structure stable.
    edges = cv2.Canny(image_np, 35, 100)
    edge_mask = cv2.dilate(edges, np.ones((3, 3), np.uint8), iterations=1).astype(np.float32) / 255.0
    edge_mask = np.expand_dims(edge_mask, axis=2)
    result = result * (1.0 - edge_mask * 0.55) + img * (edge_mask * 0.55)

    result = np.clip(result, 0, 255).astype(np.uint8)

    # Blend with original for controllable visual strength.
    alpha = 0.50 + intensity * 0.45
    final = cv2.addWeighted(
        image_np.astype(np.float32), 1.0 - alpha,
        result.astype(np.float32), alpha, 0,
    )
    return np.clip(final, 0, 255).astype(np.uint8)


def apply_deaging(image_np: np.ndarray, intensity: float = 0.5) -> np.ndarray:
    intensity = float(np.clip(intensity, 0.0, 1.0))
    h, w = image_np.shape[:2]

    # 1. Multi-pass bilateral smoothing
    smoothed = image_np.copy()
    passes = 2 + int(intensity * 4)
    sc = int(55 + intensity * 75)
    for _ in range(passes):
        smoothed = cv2.bilateralFilter(smoothed, d=9, sigmaColor=sc, sigmaSpace=sc)
    result = smoothed.astype(np.float32)

    # 2. FFT low-pass (suppress high-freq skin texture)
    for c in range(3):
        f = np.fft.fft2(result[:, :, c])
        fshift = np.fft.fftshift(f)
        cy, cx = h // 2, w // 2
        Y, X = np.ogrid[:h, :w]
        dist = np.sqrt((X - cx) ** 2 + (Y - cy) ** 2)
        cutoff = min(h, w) * (0.30 - intensity * 0.14)
        lp = np.where(dist <= cutoff, 1.0, 0.05).astype(np.float32)
        fshift *= lp
        result[:, :, c] = np.real(np.fft.ifft2(np.fft.ifftshift(fshift)))

    # 3. Preserve sharp edges so face structure stays intact
    gray_orig = cv2.cvtColor(image_np, cv2.COLOR_BGR2GRAY)
    edges = cv2.Canny(gray_orig, 30, 80)
    edge_mask = cv2.dilate(edges, np.ones((3, 3), np.uint8), iterations=2)
    edge_mask_3ch = np.stack([edge_mask] * 3, axis=2).astype(np.float32) / 255.0
    result = result * (1.0 - edge_mask_3ch * 0.75) + image_np.astype(np.float32) * (edge_mask_3ch * 0.75)

    # 4. Brighten + cool tint (younger skin is lighter, less yellow)
    result *= (1.0 + intensity * 0.14)
    result[:, :, 0] *= (1.0 + intensity * 0.10)   # +blue (BGR)
    result[:, :, 2] *= (1.0 - intensity * 0.07)   # -red slightly

    result = np.clip(result, 0, 255).astype(np.uint8)

    alpha = 0.50 + intensity * 0.40   # 0.50 … 0.90
    final = cv2.addWeighted(
        image_np.astype(np.float32), 1.0 - alpha,
        result.astype(np.float32), alpha, 0,
    )
    return np.clip(final, 0, 255).astype(np.uint8)
