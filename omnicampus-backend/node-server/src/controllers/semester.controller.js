const { getSupabaseAdmin } = require('../config/db');
const { AppError } = require('../middleware/errorHandler');

const db = () => getSupabaseAdmin();

const toSemester = (row) => ({
  _id: row.semester_id,
  id: row.semester_id,
  semesterNumber: row.semester_number,
  academicYear: row.academic_year,
  isActive: !!row.is_active,
  name: `Semester ${row.semester_number}`,
  year: row.academic_year
});

const getAllSemesters = async (req, res, next) => {
  try {
    const client = db();
    const { data, error } = await client.from('semesters').select('*').order('academic_year', { ascending: false }).order('semester_number', { ascending: true });
    if (error) throw error;
    res.json({ success: true, data: (data || []).map(toSemester) });
  } catch (error) {
    next(error);
  }
};

const getActiveSemester = async (req, res, next) => {
  try {
    const client = db();
    const { data, error } = await client.from('semesters').select('*').eq('is_active', true).limit(1).maybeSingle();
    if (error) throw error;
    if (!data) return res.json({ success: true, data: null });
    res.json({ success: true, data: toSemester(data) });
  } catch (error) {
    next(error);
  }
};

const createSemester = async (req, res, next) => {
  try {
    const { semesterNumber, academicYear } = req.body;
    if (!semesterNumber || !academicYear) {
      throw new AppError('semesterNumber and academicYear are required.', 400, 'VALIDATION_ERROR');
    }
    const client = db();
    const { data, error } = await client.from('semesters').insert({ semester_number: semesterNumber, academic_year: academicYear }).select('*').single();
    if (error) throw error;
    res.status(201).json({ success: true, data: toSemester(data) });
  } catch (error) {
    next(error);
  }
};

const activateSemester = async (req, res, next) => {
  try {
    const client = db();
    await client.from('semesters').update({ is_active: false }).neq('semester_id', req.params.id);
    const { data, error } = await client.from('semesters').update({ is_active: true }).eq('semester_id', req.params.id).select('*').single();
    if (error) throw error;
    res.json({ success: true, message: 'Semester activated', data: toSemester(data) });
  } catch (error) {
    next(error);
  }
};

const archiveSemester = async (req, res, next) => {
  try {
    const client = db();
    const { data, error } = await client.from('semesters').update({ is_active: false }).eq('semester_id', req.params.id).select('*').single();
    if (error) throw error;
    res.json({ success: true, message: 'Semester archived', data: toSemester(data) });
  } catch (error) {
    next(error);
  }
};

const deleteSemester = async (req, res, next) => {
  try {
    const { id } = req.params;
    const client = db();
    const { error } = await client.from('semesters').delete().eq('semester_id', id);
    if (error) throw error;
    res.json({ success: true, message: 'Semester deleted successfully' });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getAllSemesters,
  getActiveSemester,
  createSemester,
  activateSemester,
  archiveSemester,
  deleteSemester
};
