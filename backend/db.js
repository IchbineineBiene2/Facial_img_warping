require('dotenv').config();
const { Pool } = require('pg');

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

const nowIso = () => new Date().toISOString();

const createOrUpdateUpload = async ({ id, fileName, imageUri, width, height }) => {
  const now = nowIso();
  if (id) {
    const { rows } = await pool.query(
      `UPDATE uploads
         SET file_name=$1, image_uri=$2, width=$3, height=$4, updated_at=$5
       WHERE id=$6
       RETURNING *`,
      [fileName, imageUri, width, height, now, id]
    );
    return rows[0] || null;
  }
  const { rows } = await pool.query(
    `INSERT INTO uploads (file_name, image_uri, width, height, created_at, updated_at)
     VALUES ($1, $2, $3, $4, $5, $5)
     RETURNING *`,
    [fileName, imageUri, width, height, now]
  );
  return rows[0];
};

const resolveUpload = async ({ uploadId } = {}) => {
  if (uploadId) {
    const { rows } = await pool.query('SELECT * FROM uploads WHERE id=$1', [Number(uploadId)]);
    return rows[0] || null;
  }
  const { rows } = await pool.query('SELECT * FROM uploads ORDER BY id DESC LIMIT 1');
  return rows[0] || null;
};

const createPreprocessRun = async ({ uploadId, faceDetected, cropped, normalized, grayscaleReady, width, height }) => {
  const { rows } = await pool.query(
    `INSERT INTO preprocess_runs
       (upload_id, face_detected, cropped, normalized, grayscale_ready, width, height, created_at)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8)
     RETURNING *`,
    [uploadId, faceDetected, cropped, normalized, grayscaleReady, width, height, nowIso()]
  );
  return rows[0];
};

const createLandmarkSet = async ({ uploadId, source, landmarks }) => {
  const { rows } = await pool.query(
    `INSERT INTO landmark_sets (upload_id, source, count, landmarks_json, created_at)
     VALUES ($1,$2,$3,$4,$5)
     RETURNING *`,
    [uploadId, source, landmarks.length, JSON.stringify(landmarks), nowIso()]
  );
  return rows[0];
};

const createWarpRun = async ({ uploadId, mode, aiModel, aiTransferEnabled, expressionIntensity, agingLevel, smoothingLevel }) => {
  const { rows } = await pool.query(
    `INSERT INTO warp_runs
       (upload_id, mode, ai_model, ai_transfer_enabled, expression_intensity,
        aging_level, smoothing_level, transformed_ready, created_at)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)
     RETURNING *`,
    [uploadId, mode, aiModel, aiTransferEnabled, expressionIntensity, agingLevel, smoothingLevel, true, nowIso()]
  );
  return rows[0];
};

const createFrequencyRun = async ({ uploadId, highFrequencyEnergy, lowFrequencyEnergy }) => {
  const { rows } = await pool.query(
    `INSERT INTO frequency_runs
       (upload_id, high_frequency_energy, low_frequency_energy,
        fourier_ready, magnitude_spectrum_ready, created_at)
     VALUES ($1,$2,$3,$4,$5,$6)
     RETURNING *`,
    [uploadId, highFrequencyEnergy, lowFrequencyEnergy, true, true, nowIso()]
  );
  return rows[0];
};

const createEvaluationRun = async ({ uploadId, mse, psnr, ssim }) => {
  const { rows } = await pool.query(
    `INSERT INTO evaluation_runs (upload_id, mse, psnr, ssim, created_at)
     VALUES ($1,$2,$3,$4,$5)
     RETURNING *`,
    [uploadId, mse, psnr, ssim, nowIso()]
  );
  return rows[0];
};

const createExportRun = async ({ uploadId, format, target, fileName }) => {
  const { rows } = await pool.query(
    `INSERT INTO export_runs (upload_id, format, target, file_name, created_at)
     VALUES ($1,$2,$3,$4,$5)
     RETURNING *`,
    [uploadId, format, target, fileName, nowIso()]
  );
  return rows[0];
};

const getCounts = async () => {
  const tables = [
    'uploads',
    'preprocess_runs',
    'landmark_sets',
    'warp_runs',
    'frequency_runs',
    'evaluation_runs',
    'export_runs',
  ];
  const results = await Promise.all(
    tables.map((t) => pool.query(`SELECT COUNT(*) AS count FROM ${t}`))
  );
  return {
    uploads:        Number(results[0].rows[0].count),
    preprocessRuns: Number(results[1].rows[0].count),
    landmarkSets:   Number(results[2].rows[0].count),
    warpRuns:       Number(results[3].rows[0].count),
    frequencyRuns:  Number(results[4].rows[0].count),
    evaluationRuns: Number(results[5].rows[0].count),
    exportRuns:     Number(results[6].rows[0].count),
  };
};

module.exports = {
  pool,
  nowIso,
  resolveUpload,
  createOrUpdateUpload,
  createPreprocessRun,
  createLandmarkSet,
  createWarpRun,
  createFrequencyRun,
  createEvaluationRun,
  createExportRun,
  getCounts,
};
