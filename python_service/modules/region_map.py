import numpy as np

# 468-point MediaPipe Face Mesh control regions.
# IDs are selected for stable geometric edits and smooth falloff construction.

LIPS_OUTER = [
    61, 146, 91, 181, 84, 17, 314, 405, 321, 375,
    291, 308, 324, 318, 402, 317, 14, 87, 178, 88,
    95, 78, 191, 80, 81, 82, 13, 312, 311, 310,
    415, 308,
]

LIPS_INNER = [
    0, 37, 267, 13, 14,
]

LIPS_CUPIDS_BOW = [0, 37, 267]
LIPS_LOWER_CENTER = [14, 17]

# Eyebrow arc points used for vertical lifting.
EYEBROW_LEFT_ARC = [70, 63, 105, 66, 107]
EYEBROW_RIGHT_ARC = [336, 296, 334, 293, 300]

# Stable references for eyebrow lift direction and strength normalization.
EYEBROW_LEFT_REFERENCE = [33, 133, 168, 10]
EYEBROW_RIGHT_REFERENCE = [362, 263, 168, 10]

# Lower eye contour points for subtle Duchenne smile lift.
EYE_LOWER_LEFT = [33, 7, 163, 144, 145, 153, 154, 155, 133]
EYE_LOWER_RIGHT = [362, 382, 381, 380, 374, 373, 390, 249, 263]

# Forehead points used as anchors to keep skull shape stable during brow lift.
FOREHEAD_ANCHORS = [10, 9, 151, 337, 299, 333, 298, 109, 67, 103]

# Aging wrinkle regions.
FOREHEAD_WRINKLE = [10, 338, 297, 332, 284, 251, 389, 356, 454, 323, 361, 288, 397, 365, 379, 378, 400, 377, 152, 148, 176, 149, 150, 136, 172, 58, 132, 93, 234, 127, 162, 21, 54, 103, 67, 109]
LEFT_CROW_FEET = [33, 246, 161, 160, 159, 158, 157, 173, 133, 155, 154, 153, 145, 144, 163, 7]
RIGHT_CROW_FEET = [263, 466, 388, 387, 386, 385, 384, 398, 362, 382, 381, 380, 374, 373, 390, 249]
LEFT_NASOLABIAL = [61, 40, 92, 165, 203, 205, 50, 187, 147]
RIGHT_NASOLABIAL = [291, 270, 322, 391, 423, 425, 280, 411, 376]

# Outer frame points for slimming pulls.
JAWLINE_OUTER = [
    172, 136, 150, 149, 176, 148, 152, 377, 400,
    378, 379, 365, 397, 288, 361, 323, 454,
]

CHEEKS_OUTER = [234, 93, 132, 58, 454, 323, 361, 288, 227, 447, 205, 425]

# Upper cheekbone points kept stable during V-shape contouring.
UPPER_CHEEKS = [117, 118, 50, 280, 347, 346, 205, 425]

# Ear-adjacent side anchors to preserve head width while slimming soft tissue.
EAR_SIDE_ANCHORS = [127, 234, 356, 454, 162, 389]

FACE_SLIM_PULL = JAWLINE_OUTER + CHEEKS_OUTER


REGION_INDICES = {
    "lips_outer": LIPS_OUTER,
    "lips_inner": LIPS_INNER,
    "lips_all": LIPS_OUTER + LIPS_INNER,
    "lips_cupids_bow": LIPS_CUPIDS_BOW,
    "lips_lower_center": LIPS_LOWER_CENTER,
    "eyebrow_left_arc": EYEBROW_LEFT_ARC,
    "eyebrow_right_arc": EYEBROW_RIGHT_ARC,
    "eyebrow_left_reference": EYEBROW_LEFT_REFERENCE,
    "eyebrow_right_reference": EYEBROW_RIGHT_REFERENCE,
    "eye_lower_left": EYE_LOWER_LEFT,
    "eye_lower_right": EYE_LOWER_RIGHT,
    "eye_lower": EYE_LOWER_LEFT + EYE_LOWER_RIGHT,
    "forehead_anchors": FOREHEAD_ANCHORS,
    "forehead_wrinkle": FOREHEAD_WRINKLE,
    "left_crow_feet": LEFT_CROW_FEET,
    "right_crow_feet": RIGHT_CROW_FEET,
    "crow_feet": LEFT_CROW_FEET + RIGHT_CROW_FEET,
    "left_nasolabial": LEFT_NASOLABIAL,
    "right_nasolabial": RIGHT_NASOLABIAL,
    "nasolabial": LEFT_NASOLABIAL + RIGHT_NASOLABIAL,
    "jawline_outer": JAWLINE_OUTER,
    "cheeks_outer": CHEEKS_OUTER,
    "upper_cheeks": UPPER_CHEEKS,
    "ear_side_anchors": EAR_SIDE_ANCHORS,
    "face_slim_pull": FACE_SLIM_PULL,
}


def _pick_points(landmarks: list[tuple[int, int]], indices: list[int]) -> np.ndarray:
    pts = [landmarks[i] for i in indices if i < len(landmarks)]
    if not pts:
        return np.empty((0, 2), dtype=np.float32)
    return np.array(pts, dtype=np.float32)


def get_region_indices() -> dict[str, list[int]]:
    return {k: list(v) for k, v in REGION_INDICES.items()}


def build_control_points(landmarks: list[tuple[int, int]]) -> dict[str, np.ndarray]:
    return {
        "lips_outer": _pick_points(landmarks, LIPS_OUTER),
        "lips_inner": _pick_points(landmarks, LIPS_INNER),
        "lips_all": _pick_points(landmarks, LIPS_OUTER + LIPS_INNER),
        "lips_cupids_bow": _pick_points(landmarks, LIPS_CUPIDS_BOW),
        "lips_lower_center": _pick_points(landmarks, LIPS_LOWER_CENTER),
        "eyebrow_left_arc": _pick_points(landmarks, EYEBROW_LEFT_ARC),
        "eyebrow_right_arc": _pick_points(landmarks, EYEBROW_RIGHT_ARC),
        "eyebrow_left_reference": _pick_points(landmarks, EYEBROW_LEFT_REFERENCE),
        "eyebrow_right_reference": _pick_points(landmarks, EYEBROW_RIGHT_REFERENCE),
        "eye_lower_left": _pick_points(landmarks, EYE_LOWER_LEFT),
        "eye_lower_right": _pick_points(landmarks, EYE_LOWER_RIGHT),
        "eye_lower": _pick_points(landmarks, EYE_LOWER_LEFT + EYE_LOWER_RIGHT),
        "forehead_anchors": _pick_points(landmarks, FOREHEAD_ANCHORS),
        "forehead_wrinkle": _pick_points(landmarks, FOREHEAD_WRINKLE),
        "left_crow_feet": _pick_points(landmarks, LEFT_CROW_FEET),
        "right_crow_feet": _pick_points(landmarks, RIGHT_CROW_FEET),
        "crow_feet": _pick_points(landmarks, LEFT_CROW_FEET + RIGHT_CROW_FEET),
        "left_nasolabial": _pick_points(landmarks, LEFT_NASOLABIAL),
        "right_nasolabial": _pick_points(landmarks, RIGHT_NASOLABIAL),
        "nasolabial": _pick_points(landmarks, LEFT_NASOLABIAL + RIGHT_NASOLABIAL),
        "jawline_outer": _pick_points(landmarks, JAWLINE_OUTER),
        "cheeks_outer": _pick_points(landmarks, CHEEKS_OUTER),
        "upper_cheeks": _pick_points(landmarks, UPPER_CHEEKS),
        "ear_side_anchors": _pick_points(landmarks, EAR_SIDE_ANCHORS),
        "face_slim_pull": _pick_points(landmarks, FACE_SLIM_PULL),
    }
