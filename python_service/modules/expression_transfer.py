import cv2
import numpy as np

from modules.region_map import REGION_INDICES
from modules.warping import apply_delaunay_warp


_STABLE_IDS = [33, 133, 362, 263, 1, 4, 6, 168, 10, 152]
_EXPRESSION_GROUPS: list[tuple[str, float]] = [
    ("lips_all", 1.0),
    ("eyebrow_left_arc", 0.78),
    ("eyebrow_right_arc", 0.78),
    ("left_nasolabial", 0.42),
    ("right_nasolabial", 0.42),
    ("eye_lower_left", 0.22),
    ("eye_lower_right", 0.22),
    ("left_crow_feet", 0.18),
    ("right_crow_feet", 0.18),
]


def _safe_points(landmarks: list[tuple[int, int]], ids: list[int]) -> np.ndarray:
    points = [landmarks[i] for i in ids if i < len(landmarks)]
    if not points:
        return np.empty((0, 2), dtype=np.float32)
    return np.array(points, dtype=np.float32)


def _align_reference_landmarks(
    target_landmarks: list[tuple[int, int]],
    reference_landmarks: list[tuple[int, int]],
) -> np.ndarray:
    target_points = _safe_points(target_landmarks, _STABLE_IDS)
    reference_points = _safe_points(reference_landmarks, _STABLE_IDS)

    if len(target_points) < 3 or len(reference_points) < 3:
        return np.array(reference_landmarks, dtype=np.float32)

    matrix, _ = cv2.estimateAffinePartial2D(reference_points, target_points, method=cv2.LMEDS)
    reference_array = np.array(reference_landmarks, dtype=np.float32).reshape(-1, 1, 2)

    if matrix is None:
        return reference_array.reshape(-1, 2)

    aligned = cv2.transform(reference_array, matrix)
    return aligned.reshape(-1, 2)


def _build_destination_landmarks(
    target_landmarks: list[tuple[int, int]],
    aligned_reference_landmarks: np.ndarray,
    intensity: float,
) -> list[tuple[int, int]]:
    intensity_eff = float(np.clip(intensity, 0.0, 1.0))
    target_array = np.array(target_landmarks, dtype=np.float32)
    destination = target_array.copy()

    for group_name, group_weight in _EXPRESSION_GROUPS:
        region_ids = [i for i in REGION_INDICES.get(group_name, []) if i < len(target_landmarks)]
        if not region_ids:
            continue

        for idx in region_ids:
            delta = aligned_reference_landmarks[idx] - target_array[idx]
            local_strength = intensity_eff * group_weight
            destination[idx] = target_array[idx] + delta * local_strength

    return [(int(round(x)), int(round(y))) for x, y in destination]


def transfer_expression(
    target_image: np.ndarray,
    target_landmarks: list[tuple[int, int]],
    reference_landmarks: list[tuple[int, int]],
    intensity: float = 0.7,
) -> dict:
    aligned_reference_landmarks = _align_reference_landmarks(target_landmarks, reference_landmarks)
    destination_landmarks = _build_destination_landmarks(target_landmarks, aligned_reference_landmarks, intensity)

    result_image = apply_delaunay_warp(target_image, target_landmarks, destination_landmarks)

    return {
        "result_image": result_image,
        "destination_landmarks": destination_landmarks,
        "aligned_reference_landmarks": [(int(round(x)), int(round(y))) for x, y in aligned_reference_landmarks],
    }