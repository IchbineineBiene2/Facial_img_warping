import cv2
import numpy as np


def compute_ssim(gray_a: np.ndarray, gray_b: np.ndarray) -> float:
    a = gray_a.astype(np.float32)
    b = gray_b.astype(np.float32)
    c1 = (0.01 * 255) ** 2
    c2 = (0.03 * 255) ** 2

    mu_a = cv2.GaussianBlur(a, (11, 11), 1.5)
    mu_b = cv2.GaussianBlur(b, (11, 11), 1.5)
    mu_a2 = mu_a * mu_a
    mu_b2 = mu_b * mu_b
    mu_ab = mu_a * mu_b

    sigma_a2 = cv2.GaussianBlur(a * a, (11, 11), 1.5) - mu_a2
    sigma_b2 = cv2.GaussianBlur(b * b, (11, 11), 1.5) - mu_b2
    sigma_ab = cv2.GaussianBlur(a * b, (11, 11), 1.5) - mu_ab

    ssim_map = ((2 * mu_ab + c1) * (2 * sigma_ab + c2)) / ((mu_a2 + mu_b2 + c1) * (sigma_a2 + sigma_b2 + c2) + 1e-6)
    return float(np.mean(ssim_map))


def compute_quality_metrics(original: np.ndarray, processed: np.ndarray) -> dict:
    original_gray = cv2.cvtColor(original, cv2.COLOR_BGR2GRAY)
    processed_gray = cv2.cvtColor(processed, cv2.COLOR_BGR2GRAY)

    diff = original_gray.astype(np.float32) - processed_gray.astype(np.float32)
    mse = float(np.mean(diff * diff))
    psnr = float(20.0 * np.log10(255.0 / np.sqrt(max(mse, 1e-9))))
    ssim = compute_ssim(original_gray, processed_gray)

    return {
        "mse": mse,
        "psnr": psnr,
        "ssim": ssim,
    }
