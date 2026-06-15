const { getSupabaseAdmin } = require('../config/db');
const { AppError } = require('../middleware/errorHandler');
const { v4: uuidv4 } = require('uuid');
const path = require('path');
const fs = require('fs').promises;
const env = require('../config/env');

const db = () => getSupabaseAdmin();

const toAssignment = (row, extras = {}) => ({
  _id: row.assignment_id,
  id: row.assignment_id,
  title: row.title,
  description: row.description,
  dueDate: row.due_date,
  attachmentPath: row.attachment_path ? `${env.SUPABASE_URL}/storage/v1/object/public/${env.SUPABASE_STORAGE_BUCKET}/${row.attachment_path}` : null,
  attachmentName: row.attachment_name,
  subject: row.subjects ? { _id: row.subject_id, name: row.subjects.subject_name, code: row.subjects.subject_code } : null,
  ...extras
});

const toSubmission = (row, extras = {}) => ({
  _id: row.submission_id,
  id: row.submission_id,
  assignment: row.assignment_id,
  student: row.student_id,
  filePath: row.file_path ? `${env.SUPABASE_URL}/storage/v1/object/public/${env.SUPABASE_STORAGE_BUCKET}/${row.file_path}` : null,
  fileName: row.file_name,
  marks: row.marks,
  feedback: row.feedback,
  status: row.status,
  submittedAt: row.submitted_at,
  ...extras
});

const getTeacherAssignments = async (req, res, next) => {
  try {
    const client = db();
    const { data: teacherRow } = await client.from('teachers').select('teacher_id').eq('user_id', req.user.id).maybeSingle();
    
    const { data, error } = await client.from('assignments')
      .select('assignment_id, teacher_id, subject_id, title, description, due_date, attachment_path, attachment_name, subjects(subject_name, subject_code)')
      .eq('teacher_id', teacherRow?.teacher_id || null)
      .order('due_date', { ascending: true });
      
    if (error) throw error;

    const result = [];
    for (const row of data || []) {
      const { count } = await client.from('assignment_submissions').select('submission_id', { count: 'exact', head: true }).eq('assignment_id', row.assignment_id);
      result.push(toAssignment(row, { submissionCount: count || 0 }));
    }
    res.json({ success: true, data: result });
  } catch (error) {
    next(error);
  }
};

const getStudentAssignments = async (req, res, next) => {
  try {
    const client = db();
    const { data: studentRow } = await client.from('students').select('student_id').eq('user_id', req.user.id).maybeSingle();
    const studentId = studentRow?.student_id;
    if (!studentId) return res.json({ success: true, data: [] });

    const { data: enrollments } = await client.from('student_enrollments').select('subject_id').eq('student_id', studentId);
    const subjectIds = (enrollments || []).map((row) => row.subject_id);
    
    if (!subjectIds.length) {
      return res.json({ success: true, data: [] });
    }
    
    const { data, error } = await client.from('assignments')
      .select('assignment_id, teacher_id, subject_id, title, description, due_date, attachment_path, attachment_name, subjects(subject_name, subject_code)')
      .in('subject_id', subjectIds)
      .order('due_date', { ascending: true });
      
    if (error) throw error;

    const result = [];
    for (const row of data || []) {
      const { data: submission } = await client.from('assignment_submissions').select('*').eq('assignment_id', row.assignment_id).eq('student_id', studentId).maybeSingle();
      result.push(toAssignment(row, submission ? { status: submission.status, submittedAt: submission.submitted_at, marks: submission.marks, feedback: submission.feedback } : {}));
    }
    res.json({ success: true, data: result });
  } catch (error) {
    next(error);
  }
};

const createAssignment = async (req, res, next) => {
  try {
    const { title, description, dueDate, subjectId } = req.body;
    if (!title || !description || !dueDate || !subjectId) {
      throw new AppError('Missing required fields.', 400, 'VALIDATION_ERROR');
    }

    const client = db();
    const { data: teacherRow } = await client.from('teachers').select('teacher_id').eq('user_id', req.user.id).maybeSingle();
    
    let attachmentPath = null;
    let attachmentName = null;

    if (req.file) {
      const fileBytes = await fs.readFile(req.file.path);
      const storagePath = `${subjectId}/assignments/${uuidv4()}-${path.basename(req.file.originalname)}`;
      const { error: uploadError } = await db().storage.from(env.SUPABASE_STORAGE_BUCKET).upload(storagePath, fileBytes, {
        contentType: req.file.mimetype,
        upsert: false,
      });
      if (uploadError) throw uploadError;
      attachmentPath = storagePath;
      attachmentName = req.file.originalname;
      await fs.unlink(req.file.path).catch(() => {});
    }

    const { data, error } = await client.from('assignments').insert({
      teacher_id: teacherRow?.teacher_id || null,
      subject_id: subjectId,
      title,
      description,
      due_date: dueDate,
      attachment_path: attachmentPath,
      attachment_name: attachmentName,
    }).select('*').single();
    
    if (error) throw error;
    res.status(201).json({ success: true, data: toAssignment(data) });
  } catch (error) {
    next(error);
  }
};

const getSubmissions = async (req, res, next) => {
  try {
    const client = db();
    const { data, error } = await client.from('assignment_submissions')
      .select('submission_id, assignment_id, student_id, file_path, file_name, marks, feedback, status, submitted_at, students(users(name))')
      .eq('assignment_id', req.params.assignmentId)
      .order('submitted_at', { ascending: false });
      
    if (error) throw error;
    res.json({ success: true, data: (data || []).map((row) => toSubmission(row, { studentName: row.students?.users?.name || null })) });
  } catch (error) {
    next(error);
  }
};

const gradeSubmission = async (req, res, next) => {
  try {
    const { grade, feedback } = req.body;
    const client = db();
    const { data, error } = await client.from('assignment_submissions').update({ 
      marks: Number(grade) || 0, 
      feedback: feedback || null, 
      status: 'graded' 
    }).eq('submission_id', req.params.submissionId).select('*').single();
    
    if (error) throw error;
    res.json({ success: true, data: toSubmission(data) });
  } catch (error) {
    next(error);
  }
};

const submitAssignment = async (req, res, next) => {
  try {
    if (!req.file) throw new AppError('No file uploaded.', 400, 'NO_FILE');
    const client = db();
    const { data: studentRow } = await client.from('students').select('student_id').eq('user_id', req.user.id).maybeSingle();
    const studentId = studentRow?.student_id;
    if (!studentId) throw new AppError('Student profile not found', 404, 'NOT_FOUND');
    
    const fileBytes = await fs.readFile(req.file.path);
    const storagePath = `${req.params.assignmentId}/${studentId}/${uuidv4()}-${path.basename(req.file.originalname)}`;
    const { error: uploadError } = await db().storage.from(env.SUPABASE_STORAGE_BUCKET).upload(storagePath, fileBytes, { contentType: req.file.mimetype, upsert: false });
    
    if (uploadError) throw uploadError;
    // Keep for Python

    const { data, error } = await client.from('assignment_submissions').upsert({
      assignment_id: req.params.assignmentId,
      student_id: studentId,
      file_path: storagePath,
      file_name: req.file.originalname,
      marks: null,
      feedback: null,
      status: 'submitted',
    }, { onConflict: 'assignment_id,student_id' }).select('*').single();
    
    if (error) throw error;
    res.json({ success: true, data: toSubmission(data) });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getTeacherAssignments,
  getStudentAssignments,
  createAssignment,
  getSubmissions,
  gradeSubmission,
  submitAssignment
};
