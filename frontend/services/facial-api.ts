const DEFAULT_BASE_URL = 'http://localhost:8000';

const getBaseUrl = () => {
  const configured = process.env.EXPO_PUBLIC_API_URL?.trim();
  return configured && configured.length > 0 ? configured : DEFAULT_BASE_URL;
};

const buildUrl = (path: string) => `${getBaseUrl()}${path}`;

async function requestJson<T>(path: string, options: RequestInit = {}): Promise<T> {
  const response = await fetch(buildUrl(path), {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(options.headers || {}),
    },
  });

  const data = await response.json().catch(() => null);
  if (!response.ok) {
    const message = data?.error || `HTTP ${response.status}`;
    throw new Error(message);
  }

  return data as T;
}

export type BackendLandmark = {
  id: string;
  left: `${number}%`;
  top: `${number}%`;
};

export type PreprocessResponse = {
  ok: true;
  source: string;
  options: {
    alignFaces: boolean;
    cropFaces: boolean;
    normalizationLevel: 'off' | 'low' | 'medium' | 'high';
    noiseReductionLevel: 'off' | 'low' | 'medium' | 'high';
  };
  upload: {
    id: number;
    fileName: string;
    imageUri: string;
    width: number;
    height: number;
  };
  preprocess: {
    id: number;
    faceDetected: boolean;
    cropped: boolean;
    normalized: boolean;
    grayscaleReady: boolean;
    width: number;
    height: number;
  };
  landmarks: BackendLandmark[];
  landmarkSetId: number;
  performance: {
    targetSec: number;
    elapsedSec: number;
  };
};

export type WarpResponse = {
  ok: true;
  source: string;
  uploadId: number;
  warpRunId: number;
  mode: 'smile' | 'eyebrow' | 'lip' | 'slim';
  ai: {
    model: 'MediaPipe' | 'Dlib' | 'DeepFace';
    transferEnabled: boolean;
  };
  params: {
    expressionIntensity: number;
    agingLevel: number;
    smoothingLevel: number;
  };
  transformedReady: boolean;
  preview: {
    sideBySide: boolean;
    zoomEnabled: boolean;
  };
};

export type FrequencyResponse = {
  ok: true;
  source: string;
  uploadId: number;
  frequencyRunId: number;
  analysis: {
    fourierReady: boolean;
    magnitudeSpectrumReady: boolean;
    highFrequencyEnergy: number;
    lowFrequencyEnergy: number;
  };
};

export type EvaluationResponse = {
  ok: true;
  source: string;
  uploadId: number;
  evaluationRunId: number;
  metrics: {
    mse: number;
    psnr: number;
    ssim: number;
  };
  thresholds: {
    psnrGoodAbove: number;
    ssimGoodAbove: number;
  };
  quality: {
    psnr: 'good' | 'needs-improvement';
    ssim: 'good' | 'needs-improvement';
  };
};

export type ExportResponse = {
  ok: true;
  source: string;
  uploadId: number;
  exportRunId: number;
  format: 'CSV' | 'PDF';
  target: string;
  fileName: string;
  message: string;
};

export type HealthResponse = {
  ok: true;
  source: string;
  service: string;
  port: number;
  database: string;
  modules: string[];
  counts: Record<string, number>;
};

export async function getHealth() {
  return requestJson<HealthResponse>('/api/health', { method: 'GET' });
}

export async function preprocessImage(payload: {
  fileName: string;
  imageUri: string;
  width: number;
  height: number;
  uploadId?: number;
  alignFaces: boolean;
  cropFaces: boolean;
  normalizationLevel: 'off' | 'low' | 'medium' | 'high';
  noiseReductionLevel: 'off' | 'low' | 'medium' | 'high';
}) {
  return requestJson<PreprocessResponse>('/api/preprocess', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export async function fetchLandmarks(payload: { uploadId?: number; imageUri?: string; fileName?: string }) {
  return requestJson<{ ok: true; source: string; uploadId: number; landmarkSetId: number; landmarks: BackendLandmark[] }>('/api/landmarks', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export async function runWarp(payload: {
  uploadId?: number;
  mode: 'smile' | 'eyebrow' | 'lip' | 'slim';
  expressionIntensity: number;
  agingLevel: number;
  smoothingLevel: number;
  aiModel: 'MediaPipe' | 'Dlib' | 'DeepFace';
  aiTransferEnabled: boolean;
}) {
  return requestJson<WarpResponse>('/api/warp', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export async function analyzeFrequency(payload: { uploadId?: number; agingLevel: number; smoothingLevel: number }) {
  return requestJson<FrequencyResponse>('/api/frequency', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export async function evaluateImage(payload: { uploadId?: number; expressionIntensity: number; agingLevel: number }) {
  return requestJson<EvaluationResponse>('/api/evaluation', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export async function exportResults(payload: { uploadId?: number; format: 'CSV' | 'PDF'; target: string }) {
  return requestJson<ExportResponse>('/api/export', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}
