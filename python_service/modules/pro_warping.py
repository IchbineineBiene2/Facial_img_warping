import cv2
import numpy as np
from scipy.interpolate import RBFInterpolator

from modules.landmark import get_key_landmark_indices
from modules.region_map import REGION_INDICES


_DEF_KERNEL = "thin_plate_spline"


def _clip_points(points: np.ndarray, w: int, h: int) -> np.ndarray:
    out = points.copy()
    out[:, 0] = np.clip(out[:, 0], 0, w - 1)
    out[:, 1] = np.clip(out[:, 1], 0, h - 1)
    return out


def _face_mask(h: int, w: int, face_points: np.ndarray) -> np.ndarray:
    mask = np.zeros((h, w), dtype=np.uint8)
    if len(face_points) < 3:
        return mask.astype(np.float32)

    hull = cv2.convexHull(face_points.astype(np.int32))
    cv2.fillConvexPoly(mask, hull, 255)
    mask = cv2.GaussianBlur(mask, (41, 41), 0)
    return mask.astype(np.float32) / 255.0


def _build_anchor_points(w: int, h: int) -> np.ndarray:
    return np.array([
        [0, 0], [w // 2, 0], [w - 1, 0],
        [0, h // 2], [w - 1, h // 2],
        [0, h - 1], [w // 2, h - 1], [w - 1, h - 1],
    ], dtype=np.float32)


def _rbf_warp(
    image_np: np.ndarray,
    src_points: np.ndarray,
    dst_points: np.ndarray,
    face_points: np.ndarray,
    smoothing: float = 2.5,
    kernel: str = _DEF_KERNEL,
    epsilon: float | None = None,
    neighbors: int | None = None,
) -> np.ndarray:
    h, w = image_np.shape[:2]
    src_points = _clip_points(src_points.astype(np.float32), w, h)
    dst_points = _clip_points(dst_points.astype(np.float32), w, h)

    anchors = _build_anchor_points(w, h)
    src_all = np.vstack([src_points, anchors])
    dst_all = np.vstack([dst_points, anchors])

    displacement = dst_all - src_all

    ys, xs = np.mgrid[0:h, 0:w]
    query = np.stack([xs.ravel(), ys.ravel()], axis=1).astype(np.float32)

    kwargs: dict = {"kernel": kernel, "smoothing": smoothing}
    if epsilon is not None:
        kwargs["epsilon"] = float(max(1e-4, epsilon))
    if neighbors is not None:
        kwargs["neighbors"] = int(max(6, neighbors))

    rbf_dx = RBFInterpolator(src_all, displacement[:, 0], **kwargs)
    rbf_dy = RBFInterpolator(src_all, displacement[:, 1], **kwargs)

    flow_x = rbf_dx(query).reshape(h, w).astype(np.float32)
    flow_y = rbf_dy(query).reshape(h, w).astype(np.float32)

    # Keep deformation localized in face region for natural transitions.
    mask = _face_mask(h, w, face_points)
    flow_x *= mask
    flow_y *= mask

    grid_x, grid_y = np.meshgrid(np.arange(w, dtype=np.float32), np.arange(h, dtype=np.float32))
    map_x = np.clip(grid_x - flow_x, 0, w - 1)
    map_y = np.clip(grid_y - flow_y, 0, h - 1)

    return cv2.remap(image_np, map_x, map_y, interpolation=cv2.INTER_LINEAR, borderMode=cv2.BORDER_REFLECT_101)


def _blend(src: np.ndarray, warped: np.ndarray, intensity: float, low: float, high: float) -> np.ndarray:
    alpha = float(np.clip(low + intensity * (high - low), 0.0, 1.0))
    out = cv2.addWeighted(src.astype(np.float32), 1.0 - alpha, warped.astype(np.float32), alpha, 0)
    return np.clip(out, 0, 255).astype(np.uint8)


def _texture_preserve_blend(
    src: np.ndarray,
    warped: np.ndarray,
    intensity: float,
    low: float,
    high: float,
    detail_weight: float = 0.16,
) -> np.ndarray:
    blended = _blend(src, warped, intensity, low=low, high=high).astype(np.float32)
    src_f = src.astype(np.float32)

    # Keep high-frequency skin detail so deformation looks less smeared.
    base = cv2.GaussianBlur(src_f, (0, 0), sigmaX=1.05, sigmaY=1.05)
    detail = src_f - base
    gain = float(np.clip(detail_weight + 0.06 * intensity, 0.08, 0.28))
    out = blended + gain * detail
    return np.clip(out, 0, 255).astype(np.uint8)


def _polygon_mask(points: list[tuple[int, int]], h: int, w: int, blur: int = 31, dilate_iter: int = 1) -> np.ndarray:
    mask = np.zeros((h, w), dtype=np.uint8)
    if len(points) < 3:
        return mask.astype(np.float32)
    poly = np.array(points, dtype=np.int32)
    hull = cv2.convexHull(poly)
    cv2.fillConvexPoly(mask, hull, 255)
    if dilate_iter > 0:
        mask = cv2.dilate(mask, np.ones((5, 5), np.uint8), iterations=dilate_iter)
    blur = blur | 1
    mask = cv2.GaussianBlur(mask, (blur, blur), 0)
    return mask.astype(np.float32) / 255.0


def _collect_points(landmarks: list[tuple[int, int]], indices: list[int]) -> list[tuple[int, int]]:
    return [landmarks[i] for i in indices if i < len(landmarks)]


def _fft_spectrum(gray: np.ndarray) -> tuple[np.ndarray, np.ndarray]:
    f = np.fft.fft2(gray.astype(np.float32))
    fshift = np.fft.fftshift(f)
    mag = np.log1p(np.abs(fshift))
    return fshift, mag


def _spectrum_vis(mag: np.ndarray) -> np.ndarray:
    norm = cv2.normalize(mag, None, 0, 255, cv2.NORM_MINMAX).astype(np.uint8)
    return cv2.applyColorMap(norm, cv2.COLORMAP_TURBO)


def _hf_lf_energy_ratio(gray: np.ndarray) -> float:
    h, w = gray.shape
    fshift, _ = _fft_spectrum(gray)
    power = np.abs(fshift) ** 2
    cy, cx = h // 2, w // 2
    yy, xx = np.ogrid[:h, :w]
    dist = np.sqrt((xx - cx) ** 2 + (yy - cy) ** 2)
    r = min(h, w) * 0.18
    lf = float(np.sum(power[dist <= r]) + 1e-6)
    hf = float(np.sum(power[dist > r]) + 1e-6)
    return hf / lf


def _compute_ssim(gray_a: np.ndarray, gray_b: np.ndarray) -> float:
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


def _compute_metrics(original: np.ndarray, processed: np.ndarray) -> dict:
    org_gray = cv2.cvtColor(original, cv2.COLOR_BGR2GRAY)
    out_gray = cv2.cvtColor(processed, cv2.COLOR_BGR2GRAY)

    diff = org_gray.astype(np.float32) - out_gray.astype(np.float32)
    mse = float(np.mean(diff * diff))
    psnr = float(20.0 * np.log10(255.0 / np.sqrt(max(mse, 1e-9))))
    ssim = _compute_ssim(org_gray, out_gray)

    hf_lf_before = _hf_lf_energy_ratio(org_gray)
    hf_lf_after = _hf_lf_energy_ratio(out_gray)

    return {
        "mse": mse,
        "psnr": psnr,
        "ssim": ssim,
        "hf_lf_ratio_before": hf_lf_before,
        "hf_lf_ratio_after": hf_lf_after,
        "hf_lf_ratio_delta": hf_lf_after - hf_lf_before,
    }


def _procedural_wrinkle_texture(h: int, w: int, seed: int = 7) -> np.ndarray:
    rng = np.random.default_rng(seed)
    noise = rng.standard_normal((h, w)).astype(np.float32)

    tex_h = cv2.GaussianBlur(noise, (0, 0), sigmaX=6.0, sigmaY=1.1)
    tex_d = cv2.GaussianBlur(noise, (0, 0), sigmaX=3.2, sigmaY=2.2)
    texture = 0.68 * tex_h + 0.32 * tex_d
    texture = cv2.normalize(np.abs(texture), None, 0.0, 1.0, cv2.NORM_MINMAX)
    return texture


def _region_ids(name: str) -> list[int]:
    return REGION_INDICES.get(name, [])


class ProWarpManager:
    def __init__(self, kernel: str = _DEF_KERNEL):
        self.kernel = kernel

    @staticmethod
    def _safe_ids(indices: list[int], n: int) -> list[int]:
        return [i for i in indices if i < n]

    @staticmethod
    def _face_points(landmarks: list[tuple[int, int]]) -> np.ndarray:
        key = get_key_landmark_indices()
        jaw_ids = [i for i in key["jaw"] if i < len(landmarks)]
        if jaw_ids:
            return np.array([landmarks[i] for i in jaw_ids], dtype=np.float32)
        return np.array(landmarks, dtype=np.float32)

    def _rbf_warp(
        self,
        image_np: np.ndarray,
        src_points: np.ndarray,
        dst_points: np.ndarray,
        face_points: np.ndarray,
        smooth: float,
        kernel: str | None = None,
        epsilon: float | None = None,
        neighbors: int | None = None,
    ) -> np.ndarray:
        return _rbf_warp(
            image_np,
            src_points,
            dst_points,
            face_points,
            smoothing=float(np.clip(smooth, 0.8, 10.0)),
            kernel=kernel or self.kernel,
            epsilon=epsilon,
            neighbors=neighbors,
        )

    def plump_lips(self, image_np: np.ndarray, landmarks: list[tuple[int, int]], intensity: float = 0.6, smooth: float = 2.0) -> np.ndarray:
        h, w = image_np.shape[:2]
        n = len(landmarks)
        boosted_intensity = float(intensity) * 3.0

        lip_ids = self._safe_ids(REGION_INDICES["lips_all"], n)
        if len(lip_ids) < 8:
            return image_np.copy()

        operation = "lip_plump"
        print(f"[DEBUG] Moving region: {operation} with {len(lip_ids)} points.")

        src = np.array([landmarks[i] for i in lip_ids], dtype=np.float32)

        center_candidates = [i for i in [13, 14] if i < n]
        if len(center_candidates) == 2:
            center = np.mean(np.array([landmarks[13], landmarks[14]], dtype=np.float32), axis=0)
        else:
            center = np.mean(src, axis=0)

        dst = src.copy()
        # Radial volume expansion from lip center.
        for idx in range(len(dst)):
            p = dst[idx]
            v = p - center
            r = float(np.linalg.norm(v) + 1e-6)
            unit = v / r
            local_scale = 0.22 * boosted_intensity * (1.0 - np.clip(r / (0.24 * min(h, w)), 0.0, 0.7))
            dst[idx] = p + unit * (r * local_scale)

        # Add stronger vertical displacement for upper/lower lip volume.
        vertical_offset = min(h, w) * 0.016 * boosted_intensity
        upper_boost = -vertical_offset * 1.5
        lower_boost = vertical_offset * 1.5
        for i, lm_id in enumerate(lip_ids):
            if lm_id in {0, 37, 267}:
                dst[i, 1] += upper_boost
            if lm_id in {14, 17}:
                dst[i, 1] += lower_boost

        # Keep all non-lip landmarks fixed as anchors so brow/cheek areas do not drift.
        anchor_ids = [i for i in range(n) if i not in set(lip_ids)]
        face_points = np.array([landmarks[i] for i in anchor_ids], dtype=np.float32) if anchor_ids else src

        lip_box = np.array([src[:, 0].max() - src[:, 0].min(), src[:, 1].max() - src[:, 1].min()], dtype=np.float32)
        lip_scale = float(np.linalg.norm(lip_box) + 1e-6)
        local_epsilon = float(np.clip((lip_scale / 95.0) * 1.55, 0.9, 2.6))

        warped = self._rbf_warp(
            image_np,
            src,
            dst,
            face_points,
            smooth=smooth,
            kernel="gaussian",
            epsilon=local_epsilon,
            neighbors=96,
        )
        print("[WARP] Lip plumping applied with extreme displacement")
        return _texture_preserve_blend(image_np, warped, boosted_intensity, low=0.62, high=0.90, detail_weight=0.12)

    def slim_face(self, image_np: np.ndarray, landmarks: list[tuple[int, int]], intensity: float = 0.6, smooth: float = 3.0) -> np.ndarray:
        n = len(landmarks)
        jaw_ids = self._safe_ids(REGION_INDICES["jawline_outer"], n)
        cheek_ids = self._safe_ids(REGION_INDICES["cheeks_outer"], n)
        upper_cheek_ids = self._safe_ids(REGION_INDICES["upper_cheeks"], n)
        ear_anchor_ids = self._safe_ids(REGION_INDICES["ear_side_anchors"], n)

        if len(jaw_ids) < 8:
            return image_np.copy()

        pull_ids = [i for i in (jaw_ids + cheek_ids) if i not in set(upper_cheek_ids)]
        anchor_ids = upper_cheek_ids + ear_anchor_ids

        selected = pull_ids + anchor_ids
        src = np.array([landmarks[i] for i in selected], dtype=np.float32)

        center_candidates = [idx for idx in [168, 1, 2, 4] if idx < n]
        if center_candidates:
            cx = float(np.mean([landmarks[i][0] for i in center_candidates]))
        else:
            cx = float(np.mean([landmarks[i][0] for i in jaw_ids]))

        dst = src.copy()
        ys = np.array([landmarks[i][1] for i in jaw_ids], dtype=np.float32)
        y_min = float(np.min(ys))
        y_max = float(np.max(ys))
        y_span = max(1.0, y_max - y_min)

        pull_set = set(pull_ids)

        for i in range(len(dst)):
            x, y = dst[i]
            lm_id = selected[i]
            if lm_id not in pull_set:
                continue

            dx = cx - x
            y_ratio = np.clip((y - y_min) / y_span, 0.0, 1.0)

            # Stronger pull in lower jawline/cheek hollow, weaker around upper cheekbones.
            horiz_pull = (0.08 + 0.24 * y_ratio) * intensity
            dst[i, 0] = x + dx * horiz_pull

            # Slight lift in lower contour for V-shape effect.
            dst[i, 1] = y - abs(dx) * (0.010 + 0.012 * y_ratio) * intensity

        face_points = np.array([landmarks[i] for i in jaw_ids], dtype=np.float32)
        warped = self._rbf_warp(
            image_np,
            src,
            dst,
            face_points,
            smooth=smooth,
            kernel=_DEF_KERNEL,
            neighbors=128,
        )
        return _texture_preserve_blend(image_np, warped, intensity, low=0.40, high=0.66, detail_weight=0.16)

    def pro_smile_enhancement(
        self,
        image_np: np.ndarray,
        landmarks: list[tuple[int, int]],
        intensity: float = 0.6,
        smooth: float = 2.7,
    ) -> np.ndarray:
        n = len(landmarks)
        lips_outer = self._safe_ids(REGION_INDICES["lips_outer"], n)
        cheeks = self._safe_ids(REGION_INDICES["cheeks_outer"], n)
        eye_lower = self._safe_ids(REGION_INDICES["eye_lower"], n)
        jaw = self._safe_ids(REGION_INDICES["jawline_outer"], n)

        if len(lips_outer) < 6:
            return image_np.copy()

        src_ids = lips_outer + cheeks + eye_lower
        src = np.array([landmarks[i] for i in src_ids], dtype=np.float32)
        dst = src.copy()

        lip_center = np.mean(np.array([landmarks[i] for i in lips_outer], dtype=np.float32), axis=0)
        scale = float(min(image_np.shape[:2]))

        # Mouth corners up (main smile cue), with slight outward pull.
        corner_candidates = [61, 291]
        corner_offsets: dict[int, tuple[float, float]] = {}
        for cid in corner_candidates:
            if cid >= n:
                continue
            x, _ = landmarks[cid]
            outward = -1.0 if x < lip_center[0] else 1.0
            corner_offsets[cid] = (outward * scale * 0.014 * intensity, -scale * 0.022 * intensity)

        for i, lm_id in enumerate(src_ids):
            x, y = dst[i]
            dx = 0.0
            dy = 0.0

            if lm_id in corner_offsets:
                cdx, cdy = corner_offsets[lm_id]
                dx += cdx
                dy += cdy

            if lm_id in cheeks:
                outward = -1.0 if x < lip_center[0] else 1.0
                dx += outward * scale * 0.006 * intensity
                dy += -scale * 0.010 * intensity

            if lm_id in eye_lower:
                dy += -scale * 0.0038 * intensity

            dst[i, 0] = x + dx
            dst[i, 1] = y + dy

        face_points = np.array([landmarks[i] for i in jaw], dtype=np.float32) if jaw else self._face_points(landmarks)
        warped = self._rbf_warp(image_np, src, dst, face_points, smooth=smooth)
        return _blend(image_np, warped, intensity, low=0.42, high=0.76)

    def pro_brow_lift(
        self,
        image_np: np.ndarray,
        landmarks: list[tuple[int, int]],
        intensity: float = 0.6,
        smooth: float = 3.2,
    ) -> np.ndarray:
        n = len(landmarks)
        brow_left = self._safe_ids(REGION_INDICES["eyebrow_left_arc"], n)
        brow_right = self._safe_ids(REGION_INDICES["eyebrow_right_arc"], n)
        forehead_anchor_ids = self._safe_ids(REGION_INDICES["forehead_anchors"], n)

        brows = brow_left + brow_right
        if len(brows) < 6:
            return image_np.copy()

        operation = "brow_lift"
        print(f"[DEBUG] Moving region: {operation} with {len(brows)} points.")

        target_ids = brows
        anchor_ids = [i for i in forehead_anchor_ids if i not in target_ids]

        src = np.array([landmarks[i] for i in target_ids], dtype=np.float32)
        dst = src.copy()

        scale = float(min(image_np.shape[:2]))

        left_outer = {46, 53}
        right_outer = {276, 283}

        for i, lm_id in enumerate(target_ids):
            x, y = dst[i]
            dy = 0.0

            if lm_id in brows:
                dy += -scale * 0.018 * intensity
                if lm_id in left_outer or lm_id in right_outer:
                    dy += -scale * 0.007 * intensity

            dst[i, 1] = y + dy

        face_points = np.array([landmarks[i] for i in anchor_ids], dtype=np.float32) if anchor_ids else self._face_points(landmarks)
        warped = self._rbf_warp(image_np, src, dst, face_points, smooth=smooth)
        return _blend(image_np, warped, intensity, low=0.40, high=0.74)

    def aging_pro(
        self,
        image_np: np.ndarray,
        landmarks: list[tuple[int, int]] | None,
        intensity: float = 0.6,
    ) -> dict:
        intensity = float(np.clip(intensity, 0.0, 1.0))
        src = image_np.astype(np.float32)
        h, w = image_np.shape[:2]

        gray = cv2.cvtColor(image_np, cv2.COLOR_BGR2GRAY).astype(np.float32)
        fshift, mag_before = _fft_spectrum(gray)

        cy, cx = h // 2, w // 2
        yy, xx = np.ogrid[:h, :w]
        dist = np.sqrt((xx - cx) ** 2 + (yy - cy) ** 2)
        cut = min(h, w) * (0.16 + 0.04 * intensity)
        hf_mask = np.where(dist >= cut, 1.0 + 0.32 * intensity, 1.0).astype(np.float32)

        enhanced_shift = fshift * hf_mask
        enhanced_gray = np.real(np.fft.ifft2(np.fft.ifftshift(enhanced_shift))).astype(np.float32)
        enhanced_gray = np.clip(enhanced_gray, 0, 255)

        freq_boost = (enhanced_gray - gray)
        freq_boost = cv2.GaussianBlur(freq_boost, (0, 0), sigmaX=0.9, sigmaY=0.9)

        output = src.copy()
        for c in range(3):
            output[:, :, c] += freq_boost * (0.28 + 0.24 * intensity)

        # Build regional wrinkle masks: forehead, crow's feet, nasolabial.
        region_mask = np.zeros((h, w), dtype=np.float32)
        if landmarks:
            forehead_pts = _collect_points(landmarks, _region_ids("forehead_wrinkle"))
            crow_l_pts = _collect_points(landmarks, _region_ids("left_crow_feet"))
            crow_r_pts = _collect_points(landmarks, _region_ids("right_crow_feet"))
            naso_l_pts = _collect_points(landmarks, _region_ids("left_nasolabial"))
            naso_r_pts = _collect_points(landmarks, _region_ids("right_nasolabial"))

            region_mask += _polygon_mask(forehead_pts, h, w, blur=27, dilate_iter=1) * 0.85
            region_mask += _polygon_mask(crow_l_pts, h, w, blur=23, dilate_iter=1) * 1.00
            region_mask += _polygon_mask(crow_r_pts, h, w, blur=23, dilate_iter=1) * 1.00
            region_mask += _polygon_mask(naso_l_pts, h, w, blur=25, dilate_iter=1) * 0.92
            region_mask += _polygon_mask(naso_r_pts, h, w, blur=25, dilate_iter=1) * 0.92
            region_mask = np.clip(region_mask, 0.0, 1.0)
        else:
            region_mask[:] = 0.4

        wrinkle_tex = _procedural_wrinkle_texture(h, w, seed=11)
        wrinkle_strength = (0.22 + 0.40 * intensity) * region_mask

        for c in range(3):
            output[:, :, c] -= wrinkle_tex * wrinkle_strength * 82.0

        # Desaturate and tune regional contrast.
        hsv = cv2.cvtColor(np.clip(output, 0, 255).astype(np.uint8), cv2.COLOR_BGR2HSV).astype(np.float32)
        hsv[:, :, 1] *= (1.0 - 0.16 * intensity)
        aged = cv2.cvtColor(np.clip(hsv, 0, 255).astype(np.uint8), cv2.COLOR_HSV2BGR).astype(np.float32)

        gray_aged = cv2.cvtColor(aged.astype(np.uint8), cv2.COLOR_BGR2GRAY).astype(np.float32)
        contrast_map = 1.0 + region_mask * (0.18 + 0.12 * intensity)
        gray_centered = gray_aged - 128.0
        gray_adj = np.clip(gray_centered * contrast_map + 128.0, 0, 255)
        for c in range(3):
            aged[:, :, c] = 0.75 * aged[:, :, c] + 0.25 * gray_adj

        final = _texture_preserve_blend(image_np, np.clip(aged, 0, 255).astype(np.uint8), intensity, low=0.44, high=0.74, detail_weight=0.14)
        _, mag_after = _fft_spectrum(cv2.cvtColor(final, cv2.COLOR_BGR2GRAY).astype(np.float32))

        return {
            "result_image": final,
            "spectrum_before": _spectrum_vis(mag_before),
            "spectrum_after": _spectrum_vis(mag_after),
            "metrics": _compute_metrics(image_np, final),
        }

    def de_aging_pro(
        self,
        image_np: np.ndarray,
        landmarks: list[tuple[int, int]] | None,
        intensity: float = 0.6,
    ) -> dict:
        intensity = float(np.clip(intensity, 0.0, 1.0))
        h, w = image_np.shape[:2]
        src = image_np.copy()

        # Skin smoothing with edge preservation.
        bilateral = cv2.bilateralFilter(src, d=9, sigmaColor=55 + int(85 * intensity), sigmaSpace=45 + int(70 * intensity))

        # Preserve eyes and lips.
        preserve_mask = np.zeros((h, w), dtype=np.float32)
        if landmarks:
            eye_l = _collect_points(landmarks, _region_ids("eye_lower_left") + REGION_INDICES.get("eyebrow_left_arc", []))
            eye_r = _collect_points(landmarks, _region_ids("eye_lower_right") + REGION_INDICES.get("eyebrow_right_arc", []))
            lips = _collect_points(landmarks, _region_ids("lips_all"))

            preserve_mask += _polygon_mask(eye_l, h, w, blur=19, dilate_iter=1)
            preserve_mask += _polygon_mask(eye_r, h, w, blur=19, dilate_iter=1)
            preserve_mask += _polygon_mask(lips, h, w, blur=21, dilate_iter=1)
            preserve_mask = np.clip(preserve_mask, 0.0, 1.0)

        smooth_weight = (0.34 + 0.34 * intensity) * (1.0 - preserve_mask)
        smooth_weight3 = np.expand_dims(smooth_weight, axis=2)
        smoothed = src.astype(np.float32) * (1.0 - smooth_weight3) + bilateral.astype(np.float32) * smooth_weight3

        # Frequency-domain damping of high-frequency roughness.
        gray = cv2.cvtColor(smoothed.astype(np.uint8), cv2.COLOR_BGR2GRAY).astype(np.float32)
        fshift, mag_before = _fft_spectrum(gray)

        cy, cx = h // 2, w // 2
        yy, xx = np.ogrid[:h, :w]
        dist = np.sqrt((xx - cx) ** 2 + (yy - cy) ** 2)
        cutoff = min(h, w) * (0.24 - 0.06 * intensity)
        hf_atten = np.where(dist > cutoff, 1.0 - (0.52 + 0.22 * intensity), 1.0).astype(np.float32)
        hf_atten = np.clip(hf_atten, 0.18, 1.0)

        damped_shift = fshift * hf_atten
        damped_gray = np.real(np.fft.ifft2(np.fft.ifftshift(damped_shift))).astype(np.float32)
        damped_gray = np.clip(damped_gray, 0, 255)

        deaged = smoothed.astype(np.float32)
        gray_s = cv2.cvtColor(smoothed.astype(np.uint8), cv2.COLOR_BGR2GRAY).astype(np.float32)
        delta = damped_gray - gray_s
        for c in range(3):
            deaged[:, :, c] += delta * (0.34 + 0.20 * intensity)

        # Keep expression edges crisp.
        edges = cv2.Canny(cv2.cvtColor(src, cv2.COLOR_BGR2GRAY), 35, 95)
        edge_mask = cv2.GaussianBlur(edges, (7, 7), 0).astype(np.float32) / 255.0
        edge_mask = np.expand_dims(edge_mask, axis=2)
        deaged = deaged * (1.0 - edge_mask * 0.72) + src.astype(np.float32) * (edge_mask * 0.72)

        # Soft brightening and slight cool shift for youthful look.
        deaged[:, :, 0] *= (1.0 + 0.06 * intensity)
        deaged[:, :, 2] *= (1.0 - 0.04 * intensity)
        deaged *= (1.0 + 0.05 * intensity)

        final = _texture_preserve_blend(src, np.clip(deaged, 0, 255).astype(np.uint8), intensity, low=0.38, high=0.62, detail_weight=0.10)
        _, mag_after = _fft_spectrum(cv2.cvtColor(final, cv2.COLOR_BGR2GRAY).astype(np.float32))

        return {
            "result_image": final,
            "spectrum_before": _spectrum_vis(mag_before),
            "spectrum_after": _spectrum_vis(mag_after),
            "metrics": _compute_metrics(image_np, final),
        }


_PRO_WARP = ProWarpManager()


def plump_lips_pro(
    image_np: np.ndarray,
    landmarks: list[tuple[int, int]],
    intensity: float = 0.6,
    smooth: float = 2.2,
) -> np.ndarray:
    return _PRO_WARP.plump_lips(image_np, landmarks, intensity=intensity, smooth=smooth)


def slim_face_pro(
    image_np: np.ndarray,
    landmarks: list[tuple[int, int]],
    intensity: float = 0.6,
    smooth: float = 3.4,
) -> np.ndarray:
    return _PRO_WARP.slim_face(image_np, landmarks, intensity=intensity, smooth=smooth)


def smile_enhancement_pro(image_np: np.ndarray, landmarks: list[tuple[int, int]], intensity: float = 0.6, smooth: float = 2.7) -> np.ndarray:
    return _PRO_WARP.pro_smile_enhancement(image_np, landmarks, intensity=intensity, smooth=smooth)


def brow_lift_pro(image_np: np.ndarray, landmarks: list[tuple[int, int]], intensity: float = 0.6, smooth: float = 3.2) -> np.ndarray:
    return _PRO_WARP.pro_brow_lift(image_np, landmarks, intensity=intensity, smooth=smooth)


def aging_pro(
    image_np: np.ndarray,
    landmarks: list[tuple[int, int]] | None,
    intensity: float = 0.6,
) -> dict:
    return _PRO_WARP.aging_pro(image_np, landmarks, intensity=intensity)


def de_aging_pro(
    image_np: np.ndarray,
    landmarks: list[tuple[int, int]] | None,
    intensity: float = 0.6,
) -> dict:
    return _PRO_WARP.de_aging_pro(image_np, landmarks, intensity=intensity)


def quality_metrics(original: np.ndarray, processed: np.ndarray) -> dict:
    return _compute_metrics(original, processed)
