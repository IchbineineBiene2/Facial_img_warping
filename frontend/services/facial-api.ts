import { Platform } from 'react-native';

const API_BASE = (process.env.EXPO_PUBLIC_API_URL ?? 'http://localhost:3000').replace(/\/$/, '');

const BASE64_ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';
const BASE64_INVALID = 255;
const BASE64_LOOKUP = (() => {
  const lookup = new Uint8Array(256);
  lookup.fill(BASE64_INVALID);
  for (let i = 0; i < BASE64_ALPHABET.length; i++) {
    lookup[BASE64_ALPHABET.charCodeAt(i)] = i;
  }
  return lookup;
})();

function decodeBase64ToBytes(input: string): Uint8Array {
  const normalized = input.replace(/^data:.*;base64,/, '').replace(/\s+/g, '');
  if (normalized.length === 0) {
    return new Uint8Array(0);
  }
  if (normalized.length % 4 !== 0) {
    throw new Error('Invalid base64 string length.');
  }

  if (typeof globalThis.atob === 'function') {
    const binary = globalThis.atob(normalized);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) {
      bytes[i] = binary.charCodeAt(i);
    }
    return bytes;
  }

  const padding = normalized.endsWith('==') ? 2 : normalized.endsWith('=') ? 1 : 0;
  const outputLength = (normalized.length / 4) * 3 - padding;
  const bytes = new Uint8Array(outputLength);

  let out = 0;
  for (let i = 0; i < normalized.length; i += 4) {
    const c1 = normalized.charCodeAt(i);
    const c2 = normalized.charCodeAt(i + 1);
    const c3 = normalized.charCodeAt(i + 2);
    const c4 = normalized.charCodeAt(i + 3);

    const v1 = BASE64_LOOKUP[c1];
    const v2 = BASE64_LOOKUP[c2];
    const v3 = c3 === 61 ? 0 : BASE64_LOOKUP[c3];
    const v4 = c4 === 61 ? 0 : BASE64_LOOKUP[c4];

    if (
      v1 === BASE64_INVALID ||
      v2 === BASE64_INVALID ||
      (c3 !== 61 && v3 === BASE64_INVALID) ||
      (c4 !== 61 && v4 === BASE64_INVALID)
    ) {
      throw new Error('Invalid base64 character encountered.');
    }

    const triple = (v1 << 18) | (v2 << 12) | (v3 << 6) | v4;

    if (out < outputLength) bytes[out++] = (triple >> 16) & 0xff;
    if (out < outputLength) bytes[out++] = (triple >> 8) & 0xff;
    if (out < outputLength) bytes[out++] = triple & 0xff;
  }

  return bytes;
}

function base64ToBlob(b64: string, mimeType = 'image/png'): Blob {
  const bytes = decodeBase64ToBytes(b64);
  return new Blob([bytes], { type: mimeType });
}

async function requestJson(endpoint: string, body: FormData): Promise<any> {
  const response = await fetch(`${API_BASE}${endpoint}`, { method: 'POST', body });
  return response.json();
}

async function toImageFilePart(uri: string): Promise<Blob | { uri: string; name: string; type: string }> {
  if (Platform.OS === 'web') {
    const blobRes = await fetch(uri);
    return blobRes.blob();
  }

  const filename = uri.split('/').pop()?.split('?')[0] ?? 'image.jpg';
  const ext = filename.split('.').pop()?.toLowerCase() ?? 'jpg';
  const mimeType = ext === 'png' ? 'image/png' : 'image/jpeg';
  return { uri, name: filename, type: mimeType };
}

export async function preprocessFromUri(uri: string): Promise<any> {
  const formData = new FormData();
  const imagePart = await toImageFilePart(uri);

  if (Platform.OS === 'web') {
    const blob = imagePart as Blob;
    const ext = blob.type === 'image/png' ? 'png' : 'jpg';
    formData.append('image', blob, `image.${ext}`);
  } else {
    formData.append('image', imagePart as any);
  }

  return requestJson('/api/preprocess', formData);
}

export async function landmarksFromBase64(imageBase64: string): Promise<any> {
  const formData = new FormData();
  formData.append('image', base64ToBlob(imageBase64), 'image.png');
  return requestJson('/api/landmarks', formData);
}

export async function warpFromBase64(imageBase64: string, operation: string, intensity: number): Promise<any> {
  const formData = new FormData();
  formData.append('image', base64ToBlob(imageBase64), 'image.png');
  formData.append('operation', operation);
  formData.append('intensity', String(intensity));
  return requestJson('/api/warp', formData);
}

export async function frequencyFromBase64(imageBase64: string, mode: 'aging' | 'deaging', intensity: number): Promise<any> {
  const formData = new FormData();
  formData.append('image', base64ToBlob(imageBase64), 'image.png');
  formData.append('mode', mode);
  formData.append('intensity', String(intensity));
  return requestJson('/api/frequency', formData);
}

export type ProMetrics = {
  mse: number;
  psnr: number;
  ssim: number;
  hf_lf_ratio_before?: number;
  hf_lf_ratio_after?: number;
  hf_lf_ratio_delta?: number;
};

export type ProWarpOperation = 'smile_enhancement' | 'brow_lift' | 'lip_plump' | 'slim_face';

export async function exportEvaluationReportFromBase64(
  format: 'csv' | 'pdf',
  operation: string,
  originalImageBase64: string,
  transformedImageBase64: string,
  metrics: Pick<ProMetrics, 'mse' | 'psnr' | 'ssim'>
): Promise<any> {
  const formData = new FormData();
  formData.append('format', format);
  formData.append('operation', operation);
  formData.append('original_image_b64', originalImageBase64);
  formData.append('transformed_image_b64', transformedImageBase64);
  formData.append('metrics_json', JSON.stringify(metrics));
  return requestJson('/api/report/export', formData);
}

export async function warpProFromBase64(
  imageBase64: string,
  operation: ProWarpOperation,
  intensity: number,
  rbfSmooth: number,
  options?: {
    landmarkBackend?: 'mediapipe' | 'dlib' | 'hybrid';
    temporalSmoothing?: boolean;
    emaAlpha?: number;
    streamId?: string;
  }
): Promise<any> {
  const formData = new FormData();
  formData.append('image', base64ToBlob(imageBase64), 'image.png');
  formData.append('operation', operation);
  formData.append('intensity', String(intensity));
  formData.append('rbf_smooth', String(rbfSmooth));
  formData.append('landmark_backend', options?.landmarkBackend ?? 'hybrid');
  formData.append('temporal_smoothing', String(options?.temporalSmoothing ?? false));
  formData.append('ema_alpha', String(options?.emaAlpha ?? 0.62));
  formData.append('stream_id', options?.streamId ?? 'default');
  return requestJson('/api/warp/pro', formData);
}

export async function frequencyProFromBase64(
  imageBase64: string,
  mode: 'aging' | 'deaging',
  intensity: number,
  options?: {
    landmarkBackend?: 'mediapipe' | 'dlib' | 'hybrid';
    temporalSmoothing?: boolean;
    emaAlpha?: number;
    streamId?: string;
  }
): Promise<any> {
  const formData = new FormData();
  formData.append('image', base64ToBlob(imageBase64), 'image.png');
  formData.append('mode', mode);
  formData.append('intensity', String(intensity));
  formData.append('landmark_backend', options?.landmarkBackend ?? 'hybrid');
  formData.append('temporal_smoothing', String(options?.temporalSmoothing ?? false));
  formData.append('ema_alpha', String(options?.emaAlpha ?? 0.62));
  formData.append('stream_id', options?.streamId ?? 'default');
  return requestJson('/api/frequency/pro', formData);
}
