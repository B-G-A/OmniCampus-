const { getSupabaseAdmin } = require('../config/db');
const { AppError } = require('../middleware/errorHandler');

const db = () => getSupabaseAdmin();

const getStudentId = async (client, userId) => {
  const { data } = await client.from('students').select('student_id').eq('user_id', userId).maybeSingle();
  if (!data) throw new AppError('Student profile not found', 404, 'NOT_FOUND');
  return data.student_id;
};

const getDashboard = async (req, res, next) => {
  try {
    const client = db();
    const studentId = await getStudentId(client, req.user.id);

    const { data: enrollments, error: enrollError } = await client
      .from('student_enrollments')
      .select('subjects(subject_id, subject_name, subject_code, semesters(semester_number, academic_year), departments(department_name))')
      .eq('student_id', studentId);

    if (enrollError) throw enrollError;

    const { data: activeSemester } = await client
      .from('semesters')
      .select('*')
      .eq('is_active', true)
      .limit(1)
      .maybeSingle();

    const subjectIds = (enrollments || []).map(e => e.subjects?.subject_id).filter(Boolean);

    let recentMaterials = [];
    if (subjectIds.length > 0) {
      const { data: materials } = await client
        .from('materials')
        .select('title, file_type, uploaded_at, file_path, subjects(subject_name, subject_code)')
        .in('subject_id', subjectIds)
        .order('uploaded_at', { ascending: false })
        .limit(10);
      recentMaterials = materials || [];
    }

    res.json({
      success: true,
      data: {
        enrolledSubjects: (enrollments || []).map(e => ({
          ...e.subjects,
          _id: e.subjects?.subject_id,
          name: e.subjects?.subject_name,
          code: e.subjects?.subject_code
        })),
        activeSemester: activeSemester || null,
        recentMaterials,
      },
    });
  } catch (error) {
    next(error);
  }
};

const getStudentSubjects = async (req, res, next) => {
  try {
    const client = db();
    const studentId = await getStudentId(client, req.user.id);
    const { data, error } = await client
      .from('student_enrollments')
      .select('subjects(subject_id, subject_name, subject_code, credits, description, banner_color, semesters(semester_number, academic_year), departments(department_name))')
      .eq('student_id', studentId);

    if (error) throw error;
    res.json({ 
      success: true, 
      data: (data || []).map(e => ({
        ...e.subjects,
        _id: e.subjects?.subject_id,
        name: e.subjects?.subject_name,
        code: e.subjects?.subject_code
      })) 
    });
  } catch (error) {
    next(error);
  }
};

const getAttendance = async (req, res, next) => {
  try {
    const client = db();
    const studentId = await getStudentId(client, req.user.id);
    const { data, error } = await client
      .from('attendance')
      .select('attendance_id, date, status, subjects(subject_name, subject_code)')
      .eq('student_id', studentId)
      .order('date', { ascending: false });

    if (error) throw error;

    const totalClasses = data ? data.length : 0;
    const presentClasses = data ? data.filter(a => a.status === 'present').length : 0;
    const overallPercentage = totalClasses > 0 ? Math.round((presentClasses / totalClasses) * 100) : 0;
    const status = overallPercentage >= 75 ? 'Safe' : 'Warning';

    res.json({
      success: true,
      data: {
        records: data || [],
        stats: {
          totalClasses,
          presentClasses,
          overallPercentage,
          requiredAttendance: 75,
          status
        }
      }
    });
  } catch (error) {
    next(error);
  }
};

const getMarks = async (req, res, next) => {
  try {
    const client = db();
    const studentId = await getStudentId(client, req.user.id);
    const { data, error } = await client
      .from('marks')
      .select('mark_id, internal_marks, assignment_marks, lab_marks, mid_exam_marks, total, grade, subjects(subject_name, subject_code, credits)')
      .eq('student_id', studentId);

    if (error) throw error;

    let totalScore = 0;
    let maxPossible = 0;
    let passedSubjects = 0;
    let failedSubjects = 0;

    const formattedRecords = (data || []).map(mark => {
      totalScore += Number(mark.total || 0);
      maxPossible += 100;
      if (['F', 'FAIL'].includes(mark.grade)) {
        failedSubjects++;
      } else {
        passedSubjects++;
      }
      return {
        ...mark,
        internal1: mark.internal_marks,
        internal2: mark.mid_exam_marks,
        practical: mark.lab_marks,
        assignment: mark.assignment_marks
      };
    });

    res.json({
      success: true,
      data: {
        records: formattedRecords,
        stats: {
          totalSubjects: data ? data.length : 0,
          totalScore,
          maxPossible,
          overallPercentage: maxPossible > 0 ? Math.round((totalScore / maxPossible) * 100) : 0,
          passedSubjects,
          failedSubjects
        }
      }
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getDashboard,
  getStudentSubjects,
  getAttendance,
  getMarks
};
