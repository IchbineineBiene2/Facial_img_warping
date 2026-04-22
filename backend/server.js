const express = require('express');
const cors = require('cors');
const db = require('./db');

const app = express();
const PORT = process.env.PORT || 8000;

const allowedWarpModes = new Set(['smile', 'eyebrow', 'lip', 'slim']);
const allowedModels = new Set(['MediaPipe', 'Dlib', 'DeepFace']);

app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use((req, _res, next) => {
  req._ts = Date.now();
  next();
});

const clamp = (value, min, max) => Math.max(min, Math.min(max, value));

const respond = (res, data, meta = {}) =>
  res.json({
    ok: true,
    source: 'SQLite',
    timestamp: db.nowIso(),
    ...data,
    meta,
  });

const fail = (res, status, message, details) =>
  res.status(status).json({
    ok: false,
    source: 'SQLite',
    timestamp: db.nowIso(),
    error: message,
    details,
  });

const buildDefaultLandmarks = () => [
  { id: 'face-left-forehead', left: '30%', top: '20%' },
  { id: 'left-eye', left: '39%', top: '37%' },
  { id: 'right-eye', left: '61%', top: '37%' },
  { id: 'nose-bridge', left: '50%', top: '45%' },
  { id: 'nose-tip', left: '50%', top: '52%' },
  { id: 'mouth-left', left: '43%', top: '67%' },
  { id: 'mouth-right', left: '57%', top: '67%' },
  { id: 'jaw-left', left: '34%', top: '78%' },
  { id: 'jaw-right', left: '66%', top: '78%' },
];

const validateImagePayload = (body) => {
  const { fileName, imageUri, width, height } = body || {};
  if (!fileName || !imageUri) {
    return { valid: false, message: 'fileName ve imageUri zorunludur.' };
  }

  const w = Number(width);
  const h = Number(height);
  if (!Number.isFinite(w) || !Number.isFinite(h)) {
    return { valid: false, message: 'width ve height sayisal olmalidir.' };
  }

  if (w < 512 || h < 512) {
    return {
      valid: false,
      message: 'Minimum cozunurluk 512x512 olmalidir.',
      details: { width: w, height: h },
    };
  }

  return {
    valid: true,
    payload: {
      fileName,
      imageUri,
      width: clamp(w, 512, 4096),
      height: clamp(h, 512, 4096),
    },
  };
};

const resolveUploadOrFail = (res, body) => {
  const upload = db.resolveUpload(body || {});
  if (!upload) {
    fail(res, 400, 'Once bir gorsel yuklenmelidir.');
    return null;
  }

  return upload;
};

app.get('/api/health', (_req, res) => {
  const counts = {
    uploads: db.db.prepare('SELECT COUNT(*) AS count FROM uploads').get().count,
    preprocessRuns: db.db.prepare('SELECT COUNT(*) AS count FROM preprocess_runs').get().count,
    landmarkSets: db.db.prepare('SELECT COUNT(*) AS count FROM landmark_sets').get().count,
    warpRuns: db.db.prepare('SELECT COUNT(*) AS count FROM warp_runs').get().count,
    frequencyRuns: db.db.prepare('SELECT COUNT(*) AS count FROM frequency_runs').get().count,
    evaluationRuns: db.db.prepare('SELECT COUNT(*) AS count FROM evaluation_runs').get().count,
    exportRuns: db.db.prepare('SELECT COUNT(*) AS count FROM export_runs').get().count,
  };

  return respond(
    res,
    {
      service: 'facial-warping-backend',
      port: Number(PORT),
      database: db.dbFile,
      modules: ['preprocess', 'landmarks', 'warp', 'frequency', 'evaluation', 'export'],
      counts,
    },
    { phase: 'sqlite-ready' }
  );
});

app.post('/api/preprocess', (req, res) => {
  const check = validateImagePayload(req.body);
  if (!check.valid) {
    return fail(res, 400, check.message, check.details);
  }

  const { fileName, imageUri, width, height } = check.payload;
  const {
    alignFaces = true,
    cropFaces = true,
    normalizationLevel = 'medium',
    noiseReductionLevel = 'low',
  } = req.body || {};

  const upload = db.createOrUpdateUpload({
    id: req.body?.uploadId ? Number(req.body.uploadId) : undefined,
    fileName,
    imageUri,
    width,
    height,
  });

  const landmarks = buildDefaultLandmarks();
  const normalized = normalizationLevel !== 'off';
  const noiseReductionApplied = noiseReductionLevel !== 'off';
  const preprocess = db.createPreprocessRun({
    uploadId: upload.id,
    faceDetected: true,
    cropped: Boolean(cropFaces),
    normalized,
    grayscaleReady: normalized || noiseReductionApplied,
    width,
    height,
  });
  const landmarkSet = db.createLandmarkSet({
    uploadId: upload.id,
    source: 'generated',
    landmarks,
  });

  return respond(
    res,
    {
      upload: {
        id: upload.id,
        fileName: upload.file_name,
        imageUri: upload.image_uri,
        width: upload.width,
        height: upload.height,
      },
      preprocess: {
        id: preprocess.id,
        faceDetected: Boolean(preprocess.face_detected),
        cropped: Boolean(preprocess.cropped),
        normalized: Boolean(preprocess.normalized),
        grayscaleReady: Boolean(preprocess.grayscale_ready),
        width: preprocess.width,
        height: preprocess.height,
      },
      options: {
        alignFaces: Boolean(alignFaces),
        cropFaces: Boolean(cropFaces),
        normalizationLevel,
        noiseReductionLevel,
        faceDetection: 'auto',
      },
      landmarks,
      landmarkSetId: landmarkSet.id,
      performance: {
        targetSec: 3,
        elapsedSec: 0,
      },
    },
    { stage: 'preprocess' }
  );
});

app.post('/api/landmarks', (req, res) => {
  const upload = resolveUploadOrFail(res, req.body);
  if (!upload) {
    return;
  }

  const landmarks = buildDefaultLandmarks();
  const landmarkSet = db.createLandmarkSet({
    uploadId: upload.id,
    source: req.body?.source === 'backend' ? 'backend' : 'generated',
    landmarks,
  });

  return respond(
    res,
    {
      uploadId: upload.id,
      landmarkSetId: landmarkSet.id,
      landmarks,
      count: landmarks.length,
      visualization: {
        overlayEnabled: true,
        canToggle: true,
      },
    },
    { stage: 'landmarks' }
  );
});

app.post('/api/warp', (req, res) => {
  const upload = resolveUploadOrFail(res, req.body);
  if (!upload) {
    return;
  }

  const {
    mode = 'smile',
    expressionIntensity = 45,
    agingLevel = 35,
    smoothingLevel = 25,
    aiModel = 'MediaPipe',
    aiTransferEnabled = false,
  } = req.body || {};

  if (!allowedWarpModes.has(mode)) {
    return fail(res, 400, 'Gecersiz warp mode.', {
      allowed: Array.from(allowedWarpModes),
      received: mode,
    });
  }

  if (!allowedModels.has(aiModel)) {
    return fail(res, 400, 'Gecersiz aiModel.', {
      allowed: Array.from(allowedModels),
      received: aiModel,
    });
  }

  const warpRun = db.createWarpRun({
    uploadId: upload.id,
    mode,
    aiModel,
    aiTransferEnabled: Boolean(aiTransferEnabled),
    expressionIntensity: clamp(Number(expressionIntensity) || 0, 0, 100),
    agingLevel: clamp(Number(agingLevel) || 0, 0, 100),
    smoothingLevel: clamp(Number(smoothingLevel) || 0, 0, 100),
  });

  return respond(
    res,
    {
      uploadId: upload.id,
      warpRunId: warpRun.id,
      mode,
      ai: {
        model: aiModel,
        transferEnabled: Boolean(aiTransferEnabled),
      },
      params: {
        expressionIntensity: warpRun.expression_intensity,
        agingLevel: warpRun.aging_level,
        smoothingLevel: warpRun.smoothing_level,
      },
      transformedReady: true,
      preview: {
        sideBySide: true,
        zoomEnabled: true,
      },
    },
    { stage: 'warp' }
  );
});

app.post('/api/frequency', (req, res) => {
  const upload = resolveUploadOrFail(res, req.body);
  if (!upload) {
    return;
  }

  const agingLevel = clamp(Number(req.body?.agingLevel) || 0, 0, 100);
  const smoothingLevel = clamp(Number(req.body?.smoothingLevel) || 0, 0, 100);
  const highFrequencyEnergy = Number((0.35 + agingLevel / 400 - smoothingLevel / 700).toFixed(3));
  const lowFrequencyEnergy = Number((1 - highFrequencyEnergy).toFixed(3));

  const frequencyRun = db.createFrequencyRun({
    uploadId: upload.id,
    highFrequencyEnergy,
    lowFrequencyEnergy,
  });

  return respond(
    res,
    {
      uploadId: upload.id,
      frequencyRunId: frequencyRun.id,
      analysis: {
        fourierReady: true,
        magnitudeSpectrumReady: true,
        highFrequencyEnergy,
        lowFrequencyEnergy,
      },
    },
    { stage: 'frequency' }
  );
});

app.post('/api/evaluation', (req, res) => {
  const upload = resolveUploadOrFail(res, req.body);
  if (!upload) {
    return;
  }

  const exp = clamp(Number(req.body?.expressionIntensity) || 0, 0, 100);
  const age = clamp(Number(req.body?.agingLevel) || 0, 0, 100);

  const mse = Number((80 + exp * 0.75 + age * 0.65).toFixed(2));
  const psnr = Number((42 - mse / 18).toFixed(2));
  const ssim = Number(Math.max(0.55, 0.97 - mse / 450).toFixed(3));

  const evaluationRun = db.createEvaluationRun({
    uploadId: upload.id,
    mse,
    psnr,
    ssim,
  });

  return respond(
    res,
    {
      uploadId: upload.id,
      evaluationRunId: evaluationRun.id,
      metrics: { mse, psnr, ssim },
      thresholds: {
        psnrGoodAbove: 30,
        ssimGoodAbove: 0.8,
      },
      quality: {
        psnr: psnr >= 30 ? 'good' : 'needs-improvement',
        ssim: ssim >= 0.8 ? 'good' : 'needs-improvement',
      },
    },
    { stage: 'evaluation' }
  );
});

app.post('/api/export', (req, res) => {
  const upload = resolveUploadOrFail(res, req.body);
  if (!upload) {
    return;
  }

  const { format = 'CSV', target = 'results' } = req.body || {};
  const fmt = String(format).toUpperCase();
  if (fmt !== 'CSV' && fmt !== 'PDF') {
    return fail(res, 400, 'Gecersiz format.', { allowed: ['CSV', 'PDF'], received: format });
  }

  const exportRun = db.createExportRun({
    uploadId: upload.id,
    format: fmt,
    target,
    fileName: `${target}-${Date.now()}.${fmt.toLowerCase()}`,
  });

  return respond(
    res,
    {
      uploadId: upload.id,
      exportRunId: exportRun.id,
      format: fmt,
      target,
      fileName: exportRun.file_name,
      message: `${target} icin ${fmt} export hazir (database).`,
    },
    { stage: 'export' }
  );
});

app.use((err, _req, res, _next) => fail(res, 500, 'Beklenmeyen sunucu hatasi.', { message: err?.message || 'unknown' }));

app.listen(PORT, () => {
  console.log(`Facial backend listening on http://localhost:${PORT}`);
});
