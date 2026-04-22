import cv2
import numpy as np
from scipy.spatial import Delaunay

from modules.landmark import get_key_landmark_indices


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
        roi[mask == 255] = warped_patch[mask == 255]

    return output


def simulate_smile(image_np: np.ndarray, landmarks: list, intensity: float = 0.5) -> np.ndarray:
    h, w = image_np.shape[:2]
    shift = min(h, w) * intensity
    dst = list(landmarks)

    # Mouth corners outward + upward
    lx, ly = dst[61]; dst[61] = (int(lx - shift * 0.20), int(ly - shift * 0.08))
    rx, ry = dst[291]; dst[291] = (int(rx + shift * 0.20), int(ry - shift * 0.08))
    lx2, ly2 = dst[78]; dst[78] = (int(lx2 - shift * 0.12), int(ly2 - shift * 0.04))
    rx2, ry2 = dst[308]; dst[308] = (int(rx2 + shift * 0.12), int(ry2 - shift * 0.04))
    # Upper/lower lip open slightly
    ux, uy = dst[13]; dst[13] = (ux, int(uy - shift * 0.05))
    bx, by = dst[14]; dst[14] = (bx, int(by + shift * 0.05))
    # Cheeks puff slightly outward
    cx, cy = dst[50]; dst[50] = (int(cx - shift * 0.04), cy)
    cx2, cy2 = dst[280]; dst[280] = (int(cx2 + shift * 0.04), cy2)

    return apply_delaunay_warp(image_np, landmarks, dst)


def raise_eyebrows(image_np: np.ndarray, landmarks: list, intensity: float = 0.5) -> np.ndarray:
    h, w = image_np.shape[:2]
    brow_shift = int(min(h, w) * 0.15 * intensity)
    lid_shift = int(min(h, w) * 0.05 * intensity)
    key = get_key_landmark_indices()
    dst = list(landmarks)

    for i in key["left_brow"] + key["right_brow"]:
        x, y = dst[i]; dst[i] = (x, y - brow_shift)

    # Upper eyelid landmarks follow slightly
    upper_lids = [159, 160, 161, 386, 385, 384]
    for i in upper_lids:
        if i < len(dst):
            x, y = dst[i]; dst[i] = (x, y - lid_shift)

    return apply_delaunay_warp(image_np, landmarks, dst)


def widen_lips(image_np: np.ndarray, landmarks: list, intensity: float = 0.5) -> np.ndarray:
    h, w = image_np.shape[:2]
    shift = min(h, w) * 0.18 * intensity
    dst = list(landmarks)

    lx, ly = dst[61]; dst[61] = (int(lx - shift), ly)
    rx, ry = dst[291]; dst[291] = (int(rx + shift), ry)
    lx2, ly2 = dst[78]; dst[78] = (int(lx2 - shift * 0.65), ly2)
    rx2, ry2 = dst[308]; dst[308] = (int(rx2 + shift * 0.65), ry2)

    # Inner lip corners scale outward too
    inner_left = [80, 81, 82]
    inner_right = [310, 311, 312]
    cx = w // 2
    for i in inner_left:
        if i < len(dst):
            x, y = dst[i]; dst[i] = (int(x - abs(x - cx) * 0.15 * intensity), y)
    for i in inner_right:
        if i < len(dst):
            x, y = dst[i]; dst[i] = (int(x + abs(x - cx) * 0.15 * intensity), y)

    return apply_delaunay_warp(image_np, landmarks, dst)


def slim_face(image_np: np.ndarray, landmarks: list, intensity: float = 0.5) -> np.ndarray:
    h, w = image_np.shape[:2]
    inward = min(h, w) * 0.14 * intensity
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
            dst[i] = (int(x + dx / dist * inward), int(y + dy / dist * inward * 0.3))

    for i in cheek_indices:
        if i < len(dst):
            x, y = dst[i]
            dx = nose_tip[0] - x
            dy = nose_tip[1] - y
            dist = max(1.0, (dx ** 2 + dy ** 2) ** 0.5)
            dst[i] = (int(x + dx / dist * inward * 0.6), int(y + dy / dist * inward * 0.2))

    return apply_delaunay_warp(image_np, landmarks, dst)
