import cv2
import numpy as np
from scipy.spatial import Delaunay

from modules.landmark import get_key_landmark_indices


def _clip_points(points: list, w: int, h: int) -> list:
    clipped = []
    for x, y in points:
        clipped.append((int(np.clip(x, 0, w - 1)), int(np.clip(y, 0, h - 1))))
    return clipped


def _blend_output(src: np.ndarray, warped: np.ndarray, intensity: float, min_alpha: float = 0.35, max_alpha: float = 0.85) -> np.ndarray:
    alpha = float(np.clip(min_alpha + intensity * (max_alpha - min_alpha), 0.0, 1.0))
    return cv2.addWeighted(src.astype(np.float32), 1.0 - alpha, warped.astype(np.float32), alpha, 0).astype(np.uint8)


def _add_gaussian_flow(flow_x: np.ndarray, flow_y: np.ndarray, center: tuple, shift: tuple, sigma: float) -> None:
    h, w = flow_x.shape
    cx, cy = float(center[0]), float(center[1])
    sigma = max(1.0, float(sigma))
    radius = int(3.0 * sigma)

    x1 = max(0, int(cx) - radius)
    y1 = max(0, int(cy) - radius)
    x2 = min(w, int(cx) + radius + 1)
    y2 = min(h, int(cy) + radius + 1)
    if x2 <= x1 or y2 <= y1:
        return

    yy, xx = np.mgrid[y1:y2, x1:x2].astype(np.float32)
    weight = np.exp(-((xx - cx) ** 2 + (yy - cy) ** 2) / (2.0 * sigma * sigma)).astype(np.float32)

    flow_x[y1:y2, x1:x2] += float(shift[0]) * weight
    flow_y[y1:y2, x1:x2] += float(shift[1]) * weight


def _apply_flow_warp(image_np: np.ndarray, flow_x: np.ndarray, flow_y: np.ndarray) -> np.ndarray:
    h, w = image_np.shape[:2]
    grid_x, grid_y = np.meshgrid(np.arange(w, dtype=np.float32), np.arange(h, dtype=np.float32))

    # Backward mapping for cv2.remap: sample source from the inverse of desired displacement.
    map_x = np.clip(grid_x - flow_x, 0, w - 1).astype(np.float32)
    map_y = np.clip(grid_y - flow_y, 0, h - 1).astype(np.float32)

    return cv2.remap(
        image_np,
        map_x,
        map_y,
        interpolation=cv2.INTER_LINEAR,
        borderMode=cv2.BORDER_REFLECT_101,
    )


def _region_mask(points: list, h: int, w: int, blur: int = 31, dilate_iter: int = 2) -> np.ndarray:
    if not points:
        return np.zeros((h, w), dtype=np.float32)
    poly = np.array(points, dtype=np.int32)
    hull = cv2.convexHull(poly)
    mask = np.zeros((h, w), dtype=np.uint8)
    cv2.fillConvexPoly(mask, hull, 255)
    if dilate_iter > 0:
        mask = cv2.dilate(mask, np.ones((5, 5), np.uint8), iterations=dilate_iter)
    blur = blur | 1
    mask = cv2.GaussianBlur(mask, (blur, blur), 0)
    return (mask.astype(np.float32) / 255.0)


def apply_delaunay_warp(src_image: np.ndarray, src_pts: list, dst_pts: list) -> np.ndarray:
    h, w = src_image.shape[:2]
    src_arr = np.array(src_pts, dtype=np.float32)
    dst_arr = np.array(dst_pts, dtype=np.float32)

    if np.allclose(src_arr, dst_arr):
        return src_image.copy()

    # Boundary anchors so regions outside the face hull don't deform
    boundary = np.array([
        [0, 0], [w // 2, 0], [w - 1, 0],
        [0, h // 2], [w - 1, h // 2],
        [0, h - 1], [w // 2, h - 1], [w - 1, h - 1],
    ], dtype=np.float32)

    src_full = np.vstack([src_arr, boundary])
    dst_full = np.vstack([dst_arr, boundary])

    tri = Delaunay(src_full)
    output = src_image.copy()

    for simplex in tri.simplices:
        src_tri = src_full[simplex].astype(np.float32)
        dst_tri = dst_full[simplex].astype(np.float32)

        # Bounding rect of dst triangle (output region)
        rx, ry, rw, rh = cv2.boundingRect(dst_tri)
        rx = max(0, rx); ry = max(0, ry)
        rx2 = min(w, rx + rw); ry2 = min(h, ry + rh)
        rw = rx2 - rx; rh = ry2 - ry
        if rw <= 0 or rh <= 0:
            continue

        # Bounding rect of src triangle (source region)
        sx, sy, srw, srh = cv2.boundingRect(src_tri)
        sx = max(0, sx); sy = max(0, sy)
        sx2 = min(w, sx + srw); sy2 = min(h, sy + srh)
        srw = sx2 - sx; srh = sy2 - sy
        if srw <= 0 or srh <= 0:
            continue

        src_tri_local = src_tri - np.array([sx, sy], dtype=np.float32)
        dst_tri_local = dst_tri - np.array([rx, ry], dtype=np.float32)

        M = cv2.getAffineTransform(src_tri_local, dst_tri_local)
        src_roi = src_image[sy:sy2, sx:sx2]
        warped_patch = cv2.warpAffine(
            src_roi, M, (rw, rh),
            flags=cv2.INTER_LINEAR,
            borderMode=cv2.BORDER_REFLECT_101,
        )

        mask = np.zeros((rh, rw), dtype=np.uint8)
        cv2.fillConvexPoly(mask, dst_tri_local.astype(np.int32), 255)

        roi = output[ry:ry2, rx:rx2]
        mask_f = (mask.astype(np.float32) / 255.0)
        mask_f = cv2.GaussianBlur(mask_f, (5, 5), 0)
        mask_f = np.expand_dims(mask_f, axis=2)

        roi_f = roi.astype(np.float32)
        warped_f = warped_patch.astype(np.float32)
        blended = roi_f * (1.0 - mask_f) + warped_f * mask_f
        output[ry:ry2, rx:rx2] = np.clip(blended, 0, 255).astype(np.uint8)

    return output


def simulate_smile(image_np: np.ndarray, landmarks: list, intensity: float = 0.5) -> np.ndarray:
    h, w = image_np.shape[:2]
    shift = min(h, w) * intensity
    dst = list(landmarks)

    # Softer smile: corners move outward/upward while lip center lifts a little.
    lx, ly = dst[61]; dst[61] = (int(lx - shift * 0.09), int(ly - shift * 0.05))
    rx, ry = dst[291]; dst[291] = (int(rx + shift * 0.09), int(ry - shift * 0.05))
    lx2, ly2 = dst[78]; dst[78] = (int(lx2 - shift * 0.06), int(ly2 - shift * 0.03))
    rx2, ry2 = dst[308]; dst[308] = (int(rx2 + shift * 0.06), int(ry2 - shift * 0.03))

    upper_ring = [37, 0, 267, 39, 269]
    lower_ring = [84, 17, 314, 181, 405]
    for i in upper_ring:
        if i < len(dst):
            x, y = dst[i]
            dst[i] = (x, int(y - shift * 0.02))
    for i in lower_ring:
        if i < len(dst):
            x, y = dst[i]
            dst[i] = (x, int(y + shift * 0.02))

    cx, cy = dst[50]; dst[50] = (int(cx - shift * 0.025), cy)
    cx2, cy2 = dst[280]; dst[280] = (int(cx2 + shift * 0.025), cy2)

    dst = _clip_points(dst, w, h)
    warped = apply_delaunay_warp(image_np, landmarks, dst)
    return _blend_output(image_np, warped, intensity, min_alpha=0.45, max_alpha=0.82)


def raise_eyebrows(image_np: np.ndarray, landmarks: list, intensity: float = 0.5) -> np.ndarray:
    h, w = image_np.shape[:2]
    intensity_eff = float(np.clip(intensity ** 0.85, 0.0, 1.0))
    scale = float(min(h, w))
    brow_shift = -scale * 0.042 * intensity_eff
    lid_shift = -scale * 0.016 * intensity_eff
    key = get_key_landmark_indices()

    flow_x = np.zeros((h, w), dtype=np.float32)
    flow_y = np.zeros((h, w), dtype=np.float32)

    brow_sigma = scale * 0.055
    lid_sigma = scale * 0.045
    brow_ids = [i for i in key["left_brow"] + key["right_brow"] if i < len(landmarks)]
    for i in brow_ids:
        if i < len(landmarks):
            _add_gaussian_flow(flow_x, flow_y, landmarks[i], (0.0, brow_shift), brow_sigma)

    upper_lids = [159, 160, 161, 386, 385, 384]
    for i in upper_lids:
        if i < len(landmarks):
            _add_gaussian_flow(flow_x, flow_y, landmarks[i], (0.0, lid_shift), lid_sigma)

    # Move forehead area slightly to avoid stretched "double eyebrow" artifacts.
    forehead = [10, 67, 109, 338, 297]
    for i in forehead:
        if i < len(landmarks):
            _add_gaussian_flow(flow_x, flow_y, landmarks[i], (0.0, brow_shift * 0.25), scale * 0.07)

    left_zone = [landmarks[i] for i in brow_ids if landmarks[i][0] < w // 2]
    right_zone = [landmarks[i] for i in brow_ids if landmarks[i][0] >= w // 2]
    for i in [33, 133, 159, 160, 161, 10, 67, 109]:
        if i < len(landmarks):
            left_zone.append(landmarks[i])
    for i in [362, 263, 386, 385, 384, 10, 338, 297]:
        if i < len(landmarks):
            right_zone.append(landmarks[i])

    mask_left = _region_mask(left_zone, h, w, blur=39, dilate_iter=2)
    mask_right = _region_mask(right_zone, h, w, blur=39, dilate_iter=2)
    zone_mask = np.clip(mask_left + mask_right, 0.0, 1.0)
    flow_x *= zone_mask
    flow_y *= zone_mask

    warped = _apply_flow_warp(image_np, flow_x, flow_y)
    return _blend_output(image_np, warped, intensity_eff, min_alpha=0.38, max_alpha=0.70)


def widen_lips(image_np: np.ndarray, landmarks: list, intensity: float = 0.5) -> np.ndarray:
    h, w = image_np.shape[:2]
    intensity_eff = float(np.clip(intensity ** 0.85, 0.0, 1.0))
    scale = float(min(h, w))
    key = get_key_landmark_indices()

    flow_x = np.zeros((h, w), dtype=np.float32)
    flow_y = np.zeros((h, w), dtype=np.float32)

    mouth_outer = [i for i in key["mouth_outer"] if i < len(landmarks)]
    mouth_inner = [i for i in key["mouth_inner"] if i < len(landmarks)]
    if not mouth_outer:
        return image_np.copy()

    cx = float(np.mean([landmarks[i][0] for i in mouth_outer]))

    sigma_outer = scale * 0.045
    sigma_inner = scale * 0.040
    base_shift = scale * 0.024 * intensity_eff

    for i in mouth_outer:
        x, y = landmarks[i]
        dir_x = np.sign(x - cx)
        _add_gaussian_flow(flow_x, flow_y, (x, y), (dir_x * base_shift, 0.0), sigma_outer)

    for i in mouth_inner:
        x, y = landmarks[i]
        dir_x = np.sign(x - cx)
        _add_gaussian_flow(flow_x, flow_y, (x, y), (dir_x * base_shift * 0.35, 0.0), sigma_inner)

    # Lift upper lip and lower lower-lip slightly to keep mouth natural while widening.
    upper_lip = [13, 0, 37, 267]
    lower_lip = [14, 17, 84, 314]
    for i in upper_lip:
        if i < len(landmarks):
            _add_gaussian_flow(flow_x, flow_y, landmarks[i], (0.0, -scale * 0.004 * intensity_eff), scale * 0.032)
    for i in lower_lip:
        if i < len(landmarks):
            _add_gaussian_flow(flow_x, flow_y, landmarks[i], (0.0, scale * 0.004 * intensity_eff), scale * 0.032)

    mouth_zone = [landmarks[i] for i in mouth_outer]
    mouth_mask = _region_mask(mouth_zone, h, w, blur=35, dilate_iter=2)
    flow_x *= mouth_mask
    flow_y *= mouth_mask

    warped = _apply_flow_warp(image_np, flow_x, flow_y)
    return _blend_output(image_np, warped, intensity_eff, min_alpha=0.36, max_alpha=0.68)


def slim_face(image_np: np.ndarray, landmarks: list, intensity: float = 0.5) -> np.ndarray:
    h, w = image_np.shape[:2]
    intensity_eff = float(np.clip(intensity ** 0.90, 0.0, 1.0))
    inward = min(h, w) * 0.14 * intensity_eff
    nose_tip = landmarks[1]
    dst = list(landmarks)

    jaw_indices = [172, 136, 150, 149, 176, 148, 152, 377, 400, 378, 379, 365, 397, 288, 361, 323, 454]
    cheek_indices = [234, 454, 132, 361, 227, 447]

    for i in jaw_indices:
        if i < len(dst):
            x, y = dst[i]
            # Direction toward nose tip
            dx = nose_tip[0] - x
            dy = nose_tip[1] - y
            dist = max(1.0, (dx ** 2 + dy ** 2) ** 0.5)
            dst[i] = (int(x + dx / dist * inward), int(y + dy / dist * inward * 0.30))

    for i in cheek_indices:
        if i < len(dst):
            x, y = dst[i]
            dx = nose_tip[0] - x
            dy = nose_tip[1] - y
            dist = max(1.0, (dx ** 2 + dy ** 2) ** 0.5)
            dst[i] = (int(x + dx / dist * inward * 0.65), int(y + dy / dist * inward * 0.22))

    dst = _clip_points(dst, w, h)
    warped = apply_delaunay_warp(image_np, landmarks, dst)
    return _blend_output(image_np, warped, intensity_eff, min_alpha=0.48, max_alpha=0.86)
