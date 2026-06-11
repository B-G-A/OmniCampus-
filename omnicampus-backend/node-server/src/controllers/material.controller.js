/**
 * Material controller.
 *
 * Upload, list, delete, ingestion status, and internal ingestion-complete callback.
 */

const fs = require('fs');
const path = require('path');
const { v4: uuidv4 } = require('uuid');
const Material = require('../models/Material');
const Subject = require('../models/Subject');
const Semester = require('../models/Semester');
const aiProxy = require('../services/aiProxy.service');
const env = require('../config/env');
const { AppError } = require('../middleware/errorHandler');

// ── Map extension to fileType enum value ────────────────────────────────────
const EXT_MAP = {
  '.pdf': 'pdf',
  '.pptx': 'pptx',
  '.docx': 'docx',
  '.txt': 'txt',
};

/**
 * POST /api/materials/upload
 * Accept file via multer, move to structured folder, create Material doc,
 * fire-and-forget AI ingestion.
 */
const uploadMaterial = async (req, res, next) => {
  try {
    if (!req.file) {
      throw new AppError('No file uploaded.', 400, 'NO_FILE');
    }

    const { title, description, subjectId, semesterId } = req.body;

    // Validate relationships
    const [subject, semester] = await Promise.all([
      Subject.findById(subjectId),
      Semester.findById(semesterId),
    ]);

    if (!subject) throw new AppError('Subject not found.', 404, 'NOT_FOUND');
    if (!semester) throw new AppError('Semester not found.', 404, 'NOT_FOUND');

    // ── Move file to structured path ────────────────────────────────
    const ext = path.extname(req.file.originalname);
    const newFileName = `${uuidv4()}${ext}`;
    const destDir = path.resolve(env.UPLOAD_DIR, 'materials', String(semesterId), String(subjectId));
    fs.mkdirSync(destDir, { recursive: true });

    const destPath = path.join(destDir, newFileName);
    fs.renameSync(req.file.path, destPath);

    // ── Create Material document ────────────────────────────────────
    const material = await Material.create({
      title: title || req.file.originalname,
      description: description || '',
      fileType: EXT_MAP[ext.toLowerCase()] || 'other',
      fileName: req.file.originalname,
      filePath: destPath,
      fileSize: req.file.size,
      subject: subjectId,
      semester: semesterId,
      uploadedBy: req.user.id,
    });

    // Add material ref to subject
    subject.materials.push(material._id);
    await subject.save();

    // ── Fire-and-forget AI ingestion ────────────────────────────────
    aiProxy
      .ingestDocument({
        filePath: destPath,
        fileType: material.fileType,
        materialId: material._id.toString(),
        subjectId: subjectId,
        semesterId: semesterId,
        collectionName: semester.vectorCollectionName,
      })
      .catch((err) => console.error('⚠️  AI ingestion failed:', err.message));

    res.status(201).json({ success: true, data: material });
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/materials?subjectId=...
 * Paginated materials list for a subject.
 */
const getMaterialsBySubject = async (req, res, next) => {
  try {
    const { subjectId } = req.query;
    if (!subjectId) {
      throw new AppError('subjectId query param is required.', 400, 'VALIDATION_ERROR');
    }

    const page = Math.max(parseInt(req.query.page, 10) || 1, 1);
    const limit = Math.min(Math.max(parseInt(req.query.limit, 10) || 20, 1), 100);
    const skip = (page - 1) * limit;

    const filter = { subject: subjectId };

    const [materials, total] = await Promise.all([
      Material.find(filter)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .populate('uploadedBy', 'name email'),
      Material.countDocuments(filter),
    ]);

    res.set('X-Total-Count', total);
    res.json({
      success: true,
      data: materials,
      pagination: { page, limit, total, pages: Math.ceil(total / limit) },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * DELETE /api/materials/:id
 * Delete file from disk, remove from vector DB, delete doc, pull from subject.
 */
const deleteMaterial = async (req, res, next) => {
  try {
    const material = await Material.findById(req.params.id);
    if (!material) {
      throw new AppError('Material not found.', 404, 'NOT_FOUND');
    }

    // Delete physical file
    if (material.filePath && fs.existsSync(material.filePath)) {
      fs.unlinkSync(material.filePath);
    }

    // Remove from vector DB (best-effort)
    const semester = await Semester.findById(material.semester);
    if (semester && semester.vectorCollectionName) {
      aiProxy
        .deleteDocuments(material._id.toString(), semester.vectorCollectionName)
        .catch((err) => console.error('⚠️  AI deleteDocuments failed:', err.message));
    }

    // Pull from subject's materials array
    await Subject.findByIdAndUpdate(material.subject, {
      $pull: { materials: material._id },
    });

    await Material.findByIdAndDelete(material._id);

    res.json({ success: true, message: 'Material deleted.' });
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/materials/:id/status
 * Return ingestion status for a material.
 */
const getIngestionStatus = async (req, res, next) => {
  try {
    const material = await Material.findById(req.params.id).select(
      'isIngested ingestedAt chunkCount title'
    );

    if (!material) {
      throw new AppError('Material not found.', 404, 'NOT_FOUND');
    }

    res.json({
      success: true,
      data: {
        materialId: material._id,
        title: material.title,
        isIngested: material.isIngested,
        ingestedAt: material.ingestedAt,
        chunkCount: material.chunkCount,
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * POST /api/materials/ingestion-complete
 * Internal callback from the AI service.
 * Validates X-Internal-Key header.
 */
const ingestionComplete = async (req, res, next) => {
  try {
    // Validate internal key
    const internalKey = req.headers['x-internal-key'];
    if (!internalKey || internalKey !== env.INTERNAL_SERVICE_KEY) {
      throw new AppError('Unauthorized internal request.', 401, 'UNAUTHORIZED');
    }

    const { materialId, chunkCount } = req.body;

    if (!materialId) {
      throw new AppError('materialId is required.', 400, 'VALIDATION_ERROR');
    }

    const material = await Material.findById(materialId);
    if (!material) {
      throw new AppError('Material not found.', 404, 'NOT_FOUND');
    }

    material.isIngested = true;
    material.ingestedAt = new Date();
    material.chunkCount = chunkCount || 0;
    await material.save();

    res.json({ success: true, message: 'Ingestion status updated.' });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  uploadMaterial,
  getMaterialsBySubject,
  deleteMaterial,
  getIngestionStatus,
  ingestionComplete,
};
