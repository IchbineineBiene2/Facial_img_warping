const fs = require('fs');
const path = require('path');
const Database = require('better-sqlite3');

const dataDir = path.join(__dirname, 'data');
const dbFile = path.join(dataDir, 'app.db');

fs.mkdirSync(dataDir, { recursive: true });

const db = new Database(dbFile);
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

db.exec(`
  CREATE TABLE IF NOT EXISTS uploads (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    file_name TEXT NOT NULL,
    image_uri TEXT NOT NULL,
    width INTEGER NOT NULL,
    height INTEGER NOT NULL,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS preprocess_runs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    upload_id INTEGER NOT NULL,
    face_detected INTEGER NOT NULL,
    cropped INTEGER NOT NULL,
    normalized INTEGER NOT NULL,
    grayscale_ready INTEGER NOT NULL,
    width INTEGER NOT NULL,
    height INTEGER NOT NULL,
    created_at TEXT NOT NULL,
    FOREIGN KEY (upload_id) REFERENCES uploads(id) ON DELETE CASCADE
  );

  CREATE TABLE IF NOT EXISTS landmark_sets (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    upload_id INTEGER NOT NULL,
    source TEXT NOT NULL,
    count INTEGER NOT NULL,
    landmarks_json TEXT NOT NULL,
    created_at TEXT NOT NULL,
    FOREIGN KEY (upload_id) REFERENCES uploads(id) ON DELETE CASCADE
  );

  CREATE TABLE IF NOT EXISTS warp_runs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    upload_id INTEGER NOT NULL,
    mode TEXT NOT NULL,
    ai_model TEXT NOT NULL,
    ai_transfer_enabled INTEGER NOT NULL,
    expression_intensity INTEGER NOT NULL,
    aging_level INTEGER NOT NULL,
    smoothing_level INTEGER NOT NULL,
    transformed_ready INTEGER NOT NULL,
    created_at TEXT NOT NULL,
    FOREIGN KEY (upload_id) REFERENCES uploads(id) ON DELETE CASCADE
  );

  CREATE TABLE IF NOT EXISTS frequency_runs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    upload_id INTEGER NOT NULL,
    high_frequency_energy REAL NOT NULL,
    low_frequency_energy REAL NOT NULL,
    fourier_ready INTEGER NOT NULL,
    magnitude_spectrum_ready INTEGER NOT NULL,
    created_at TEXT NOT NULL,
    FOREIGN KEY (upload_id) REFERENCES uploads(id) ON DELETE CASCADE
  );

  CREATE TABLE IF NOT EXISTS evaluation_runs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    upload_id INTEGER NOT NULL,
    mse REAL NOT NULL,
    psnr REAL NOT NULL,
    ssim REAL NOT NULL,
    created_at TEXT NOT NULL,
    FOREIGN KEY (upload_id) REFERENCES uploads(id) ON DELETE CASCADE
  );

  CREATE TABLE IF NOT EXISTS export_runs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    upload_id INTEGER NOT NULL,
    format TEXT NOT NULL,
    target TEXT NOT NULL,
    file_name TEXT NOT NULL,
    created_at TEXT NOT NULL,
    FOREIGN KEY (upload_id) REFERENCES uploads(id) ON DELETE CASCADE
  );
`);

const insertUpload = db.prepare(`
  INSERT INTO uploads (file_name, image_uri, width, height, created_at, updated_at)
  VALUES (@file_name, @image_uri, @width, @height, @created_at, @updated_at)
`);

const updateUpload = db.prepare(`
  UPDATE uploads
  SET file_name = @file_name,
      image_uri = @image_uri,
      width = @width,
      height = @height,
      updated_at = @updated_at
  WHERE id = @id
`);

const getUploadById = db.prepare('SELECT * FROM uploads WHERE id = ?');
const getLatestUpload = db.prepare('SELECT * FROM uploads ORDER BY id DESC LIMIT 1');

const insertPreprocess = db.prepare(`
  INSERT INTO preprocess_runs (
    upload_id, face_detected, cropped, normalized, grayscale_ready, width, height, created_at
  ) VALUES (
    @upload_id, @face_detected, @cropped, @normalized, @grayscale_ready, @width, @height, @created_at
  )
`);

const insertLandmarks = db.prepare(`
  INSERT INTO landmark_sets (upload_id, source, count, landmarks_json, created_at)
  VALUES (@upload_id, @source, @count, @landmarks_json, @created_at)
`);

const insertWarp = db.prepare(`
  INSERT INTO warp_runs (
    upload_id, mode, ai_model, ai_transfer_enabled, expression_intensity, aging_level, smoothing_level,
    transformed_ready, created_at
  ) VALUES (
    @upload_id, @mode, @ai_model, @ai_transfer_enabled, @expression_intensity, @aging_level, @smoothing_level,
    @transformed_ready, @created_at
  )
`);

const insertFrequency = db.prepare(`
  INSERT INTO frequency_runs (
    upload_id, high_frequency_energy, low_frequency_energy, fourier_ready, magnitude_spectrum_ready, created_at
  ) VALUES (
    @upload_id, @high_frequency_energy, @low_frequency_energy, @fourier_ready, @magnitude_spectrum_ready, @created_at
  )
`);

const insertEvaluation = db.prepare(`
  INSERT INTO evaluation_runs (upload_id, mse, psnr, ssim, created_at)
  VALUES (@upload_id, @mse, @psnr, @ssim, @created_at)
`);

const insertExport = db.prepare(`
  INSERT INTO export_runs (upload_id, format, target, file_name, created_at)
  VALUES (@upload_id, @format, @target, @file_name, @created_at)
`);

const nowIso = () => new Date().toISOString();

const createOrUpdateUpload = ({ id, fileName, imageUri, width, height }) => {
  const payload = {
    file_name: fileName,
    image_uri: imageUri,
    width,
    height,
    created_at: nowIso(),
    updated_at: nowIso(),
  };

  if (id) {
    updateUpload.run({ ...payload, id });
    return getUploadById.get(id);
  }

  const info = insertUpload.run(payload);
  return getUploadById.get(info.lastInsertRowid);
};

const resolveUpload = ({ uploadId } = {}) => {
  if (uploadId) {
    return getUploadById.get(Number(uploadId)) || null;
  }

  return getLatestUpload.get() || null;
};

const createPreprocessRun = ({ uploadId, faceDetected, cropped, normalized, grayscaleReady, width, height }) => {
  const info = insertPreprocess.run({
    upload_id: uploadId,
    face_detected: faceDetected ? 1 : 0,
    cropped: cropped ? 1 : 0,
    normalized: normalized ? 1 : 0,
    grayscale_ready: grayscaleReady ? 1 : 0,
    width,
    height,
    created_at: nowIso(),
  });

  return db.prepare('SELECT * FROM preprocess_runs WHERE id = ?').get(info.lastInsertRowid);
};

const createLandmarkSet = ({ uploadId, source, landmarks }) => {
  const info = insertLandmarks.run({
    upload_id: uploadId,
    source,
    count: landmarks.length,
    landmarks_json: JSON.stringify(landmarks),
    created_at: nowIso(),
  });

  return db.prepare('SELECT * FROM landmark_sets WHERE id = ?').get(info.lastInsertRowid);
};

const createWarpRun = ({ uploadId, mode, aiModel, aiTransferEnabled, expressionIntensity, agingLevel, smoothingLevel }) => {
  const info = insertWarp.run({
    upload_id: uploadId,
    mode,
    ai_model: aiModel,
    ai_transfer_enabled: aiTransferEnabled ? 1 : 0,
    expression_intensity: expressionIntensity,
    aging_level: agingLevel,
    smoothing_level: smoothingLevel,
    transformed_ready: 1,
    created_at: nowIso(),
  });

  return db.prepare('SELECT * FROM warp_runs WHERE id = ?').get(info.lastInsertRowid);
};

const createFrequencyRun = ({ uploadId, highFrequencyEnergy, lowFrequencyEnergy }) => {
  const info = insertFrequency.run({
    upload_id: uploadId,
    high_frequency_energy: highFrequencyEnergy,
    low_frequency_energy: lowFrequencyEnergy,
    fourier_ready: 1,
    magnitude_spectrum_ready: 1,
    created_at: nowIso(),
  });

  return db.prepare('SELECT * FROM frequency_runs WHERE id = ?').get(info.lastInsertRowid);
};

const createEvaluationRun = ({ uploadId, mse, psnr, ssim }) => {
  const info = insertEvaluation.run({
    upload_id: uploadId,
    mse,
    psnr,
    ssim,
    created_at: nowIso(),
  });

  return db.prepare('SELECT * FROM evaluation_runs WHERE id = ?').get(info.lastInsertRowid);
};

const createExportRun = ({ uploadId, format, target, fileName }) => {
  const info = insertExport.run({
    upload_id: uploadId,
    format,
    target,
    file_name: fileName,
    created_at: nowIso(),
  });

  return db.prepare('SELECT * FROM export_runs WHERE id = ?').get(info.lastInsertRowid);
};

module.exports = {
  db,
  dbFile,
  nowIso,
  resolveUpload,
  createOrUpdateUpload,
  createPreprocessRun,
  createLandmarkSet,
  createWarpRun,
  createFrequencyRun,
  createEvaluationRun,
  createExportRun,
};
