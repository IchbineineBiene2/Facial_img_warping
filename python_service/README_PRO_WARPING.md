# Pro Facial Warping Starter (MediaPipe + SciPy + Optional Dlib)

Bu baslangic yapisi, mevcut servisini bozmadan daha pürüzsüz deformasyon icin ek bir pipeline sunar.

## Eklenen Moduller

- `modules/landmark_fusion.py`
  - `mediapipe`, `dlib` veya `hybrid` backend secimi.
  - Dlib yoksa otomatik olarak MediaPipe fallback.
  - Stream bazli EMA ile temporal smoothing (titreme azaltma).
- `modules/pro_warping.py`
  - SciPy `RBFInterpolator` (thin-plate-spline kernel) ile dense ve pürüzsüz warp.
  - `plump_lips_pro` ve `slim_face_pro` operasyonlari.
- `modules/region_map.py`
  - Lips, eyebrows, jawline ve cheeks icin kritik control point ID gruplari.

## Yeni Endpoint

- `POST /warp/pro`
  - Form alanlari:
    - `image`: dosya
    - `operation`: `lip_plump` | `slim_face`
    - `intensity`: `0.0 - 1.0`
    - `landmark_backend`: `mediapipe` | `dlib` | `hybrid`
    - `temporal_smoothing`: `true/false`
    - `ema_alpha`: `0.05 - 0.95` (dusuk deger = daha fazla yumusatma)
    - `stream_id`: ayni video/akisi temsil eden kimlik

- `POST /frequency/pro`
  - Form alanlari:
    - `image`: dosya
    - `mode`: `aging` | `deaging`
    - `intensity`: `0.0 - 1.0`
    - `landmark_backend`: `mediapipe` | `dlib` | `hybrid`
    - `temporal_smoothing`: `true/false`
    - `ema_alpha`: `0.05 - 0.95`
    - `stream_id`: ayni video/akisi temsil eden kimlik
  - Donen alanlar:
    - `result_image_b64`
    - `spectrum_before_b64`, `spectrum_after_b64`
    - `metrics.mse`, `metrics.psnr`, `metrics.ssim`
    - `metrics.hf_lf_ratio_before`, `metrics.hf_lf_ratio_after`, `metrics.hf_lf_ratio_delta`

## Dlib Modeli

Dlib landmark backend kullanacaksan su dosyayi ekle:

- `python_service/models/shape_predictor_68_face_landmarks.dat`

`dlib` kurulumunda sorun yasarsan proje yine calisir, sadece `mediapipe` backend kullanir.

## Performans Ipuclari

- Production’da `--reload` kapat.
- Yuz ROI disina warp uygulama (mask ile sinirla).
- Landmark smoothing: ardisk frame’lerde EMA uygula.
- Ayni yuzde yeniden tespit yerine tracking/kalman hibriti kullan.
