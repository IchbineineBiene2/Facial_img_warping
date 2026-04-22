import cv2
import numpy as np


def apply_aging(image_np: np.ndarray, intensity: float = 0.5) -> np.ndarray:
    intensity = float(np.clip(intensity, 0.0, 1.0))
    img = image_np.astype(np.float32)
    h, w = img.shape[:2]

    result = img.copy()

    # 1. Wrinkle texture via structured noise
    rng = np.random.default_rng(42)
    noise = rng.standard_normal((h, w)).astype(np.float32)
    kernel_size = int(3 + intensity * 4) | 1
    noise_blurred = cv2.GaussianBlur(noise, (kernel_size, kernel_size), 0)
    noise_blurred /= (np.max(np.abs(noise_blurred)) + 1e-6)
    wrinkle_strength = intensity * 40
    for c in range(3):
        result[:, :, c] -= noise_blurred * wrinkle_strength

    # 2. FFT high-frequency amplification (coarsen skin texture)
    for c in range(3):
        f = np.fft.fft2(result[:, :, c])
        fshift = np.fft.fftshift(f)
        cy, cx = h // 2, w // 2
        Y, X = np.ogrid[:h, :w]
        dist = np.sqrt((X - cx) ** 2 + (Y - cy) ** 2)
        radius = int(min(h, w) * 0.12)
        mask = np.where(dist < radius, 0.4, 1.0 + intensity * 1.6).astype(np.float32)
        fshift *= mask
        result[:, :, c] = np.real(np.fft.ifft2(np.fft.ifftshift(fshift)))

    # 3. Skin tone shift: warmer + darker
    result[:, :, 0] *= (1.0 - intensity * 0.12)   # -blue (BGR)
    result[:, :, 1] *= (1.0 - intensity * 0.05)   # -green slightly
    result *= (1.0 - intensity * 0.10)             # overall darkening

    # 4. Unsharp masking to emphasize texture
    blurred = cv2.GaussianBlur(result, (5, 5), 0)
    usm_strength = 1.0 + intensity * 1.2
    result = cv2.addWeighted(result, usm_strength, blurred, -intensity * 1.2, 0)

    result = np.clip(result, 0, 255).astype(np.uint8)

    # Blend proportional to intensity so effect is always noticeable
    alpha = 0.35 + intensity * 0.50   # 0.35 … 0.85
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
    passes = 1 + int(intensity * 3)
    sc = int(40 + intensity * 60)
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
        cutoff = min(h, w) * (0.35 - intensity * 0.15)
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
    result *= (1.0 + intensity * 0.10)
    result[:, :, 0] *= (1.0 + intensity * 0.08)   # +blue (BGR)
    result[:, :, 2] *= (1.0 - intensity * 0.05)   # -red slightly

    result = np.clip(result, 0, 255).astype(np.uint8)

    alpha = 0.40 + intensity * 0.45   # 0.40 … 0.85
    final = cv2.addWeighted(
        image_np.astype(np.float32), 1.0 - alpha,
        result.astype(np.float32), alpha, 0,
    )
    return np.clip(final, 0, 255).astype(np.uint8)
