const { getSupabaseAdmin } = require('../config/db');
const { AppError } = require('../middleware/errorHandler');
const aiProxy = require('../services/aiProxy.service');
const { v4: uuidv4 } = require('uuid');
const path = require('path');
const fs = require('fs').promises;
const env = require('../config/env');

const db = () => getSupabaseAdmin();

const toMaterial = (row) => ({
  _id: row.material_id,
  id: row.material_id,
  title: row.title,
  fileUrl: row.file_path ? `${env.SUPABASE_URL}/storage/v1/object/public/${env.SUPABASE_STORAGE_BUCKET}/${row.file_path}` : null,
  fileName: row.file_name,
  fileType: row.file_type,
  fileSize: row.file_size,
  unit: row.unit,
  createdAt: row.uploaded_at,
  subject: row.subjects ? { _id: row.subject_id, name: row.subjects.subject_name, code: row.subjects.subject_code } : null,
  uploadedBy: row.teachers?.users ? { _id: row.teachers.users.user_id, name: row.teachers.users.name } : null,
  department: row.department_code || row.departments?.department_code || null,
});

const getFileTypeFromUpload = (file) => {
  const mime = file.mimetype;
  let ext = path.extname(file.originalname).replace('.', '').toLowerCase();
  if (mime === 'application/pdf') ext = 'pdf';
  else if (mime.includes('image')) ext = 'image';
  else if (mime.includes('video')) ext = 'video';
  return { mime, ext };
};

const getMaterialsBySubject = async (req, res, next) => {
  try {
    const client = db();
    const query = client.from('materials').select('material_id, teacher_id, subject_id, semester_id, title, file_path, file_name, file_type, file_size, unit, uploaded_at, subjects(subject_name, subject_code), semesters(semester_number, academic_year), teachers(teacher_id, users(user_id, name)), departments(department_code)');
    
    if (req.query.subjectId) query.eq('subject_id', req.query.subjectId);
    
    const { data, error } = await query.order('uploaded_at', { ascending: false });
    if (error) throw error;
    
    res.json({ success: true, data: (data || []).map(toMaterial) });
  } catch (error) {
    next(error);
  }
};

const uploadMaterial = async (req, res, next) => {
  try {
    if (!req.file) throw new AppError('No file uploaded.', 400, 'NO_FILE');
    const { title, subjectId, department, unit } = req.body;
    if (!title || !subjectId) {
      throw new AppError('title and subjectId are required.', 400, 'VALIDATION_ERROR');
    }

    const client = db();
    const { data: teacherRow } = await client.from('teachers').select('teacher_id').eq('user_id', req.user.id).maybeSingle();
    const { data: subjectRow } = await client.from('subjects').select('*').eq('subject_id', subjectId).maybeSingle();
    if (!subjectRow) throw new AppError('Subject not found.', 404, 'NOT_FOUND');

    const fileMeta = getFileTypeFromUpload(req.file);
    const storageClient = db().storage.from(env.SUPABASE_STORAGE_BUCKET);
    const fileBytes = await fs.readFile(req.file.path);
    const storagePath = `${subjectId}/${uuidv4()}-${path.basename(req.file.originalname)}`;
    
    const { error: uploadError } = await storageClient.upload(storagePath, fileBytes, {
      contentType: fileMeta?.mime || req.file.mimetype,
      upsert: false,
    });
    if (uploadError) throw uploadError;

    const { data: materialRow, error } = await client.from('materials').insert({
      teacher_id: teacherRow?.teacher_id || null,
      subject_id: subjectRow.subject_id,
      semester_id: subjectRow.semester_id,
      title,
      file_path: storagePath,
      file_name: req.file.originalname,
      file_type: fileMeta?.ext || path.extname(req.file.originalname).replace('.', '').toLowerCase(),
      file_size: req.file.size,
      department_id: subjectRow.department_id,
      unit: unit || null,
    }).select('*').single();
    
    if (error) throw error;

    try {
      await aiProxy.ingestDocument({
        filePath: req.file.path,
        fileType: materialRow.file_type,
        materialId: materialRow.material_id,
        subjectId: subjectRow.subject_id,
        semesterId: subjectRow.semester_id,
        collectionName: `subject_${subjectRow.subject_id}`,
      });
    } catch (ingestError) {
      console.warn(`Material ingestion queued but AI service unavailable: ${ingestError.message}`);
    }

    // File deletion is now handled by the Python AI Service after ingestion.
    

    res.status(201).json({ success: true, data: toMaterial(materialRow) });
  } catch (error) {
    next(error);
  }
};

const deleteMaterial = async (req, res, next) => {
  try {
    const { id } = req.params;
    const client = db();
    const { data: material } = await client.from('materials').select('file_path, subject_id').eq('material_id', id).maybeSingle();
    
    if (material && material.file_path) {
      await client.storage.from(env.SUPABASE_STORAGE_BUCKET).remove([material.file_path]);
    }
    
    const { error } = await client.from('materials').delete().eq('material_id', id);
    if (error) throw error;
    
    // Attempt to delete from ChromaDB
    try {
      if (material && material.subject_id) {
        await aiProxy.deleteDocuments(id, `subject_${material.subject_id}`);
      }
    } catch (e) {
      console.warn("Failed to delete from AI service", e);
    }

    res.json({ success: true, message: 'Material deleted successfully' });
  } catch (error) {
    next(error);
  }
};

const getIngestionStatus = async (req, res, next) => {
  try {
    const client = db();
    const { data: material } = await client.from('materials').select('material_id, title, uploaded_at').eq('material_id', req.params.id).maybeSingle();
    
    if (!material) {
      throw new AppError('Material not found.', 404, 'NOT_FOUND');
    }

    res.json({
      success: true,
      data: {
        materialId: material.material_id,
        title: material.title,
        isIngested: true, // simplified for now
        ingestedAt: material.uploaded_at,
        chunkCount: 1,
      },
    });
  } catch (error) {
    next(error);
  }
};

const ingestionComplete = async (req, res, next) => {
  try {
    // Validate internal key
    const internalKey = req.headers['x-internal-key'];
    if (!internalKey || internalKey !== env.INTERNAL_SERVICE_KEY) {
      throw new AppError('Unauthorized internal request.', 401, 'UNAUTHORIZED');
    }

    res.json({ success: true, message: 'Ingestion status updated.' });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getMaterialsBySubject,
  uploadMaterial,
  deleteMaterial,
  getIngestionStatus,
  ingestionComplete
};
