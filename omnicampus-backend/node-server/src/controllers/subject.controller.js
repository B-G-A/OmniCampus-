const { getSupabaseAdmin } = require('../config/db');
const { AppError } = require('../middleware/errorHandler');

const db = () => getSupabaseAdmin();

const toSubject = (row) => ({
  _id: row.subject_id,
  id: row.subject_id,
  name: row.subject_name,
  code: row.subject_code,
  credits: row.credits,
  description: row.description,
  bannerColor: row.banner_color,
  department: row.departments?.department_code || row.departments?.department_name || null,
  semester: row.semesters ? `Semester ${row.semesters.semester_number}` : null,
});

const getSubjects = async (req, res, next) => {
  try {
    const client = db();
    const { data, error } = await client
      .from('subjects')
      .select('subject_id, subject_name, subject_code, credits, description, banner_color, departments(department_name, department_code), semesters(semester_number)')
      .order('subject_name', { ascending: true });
    
    if (error) throw error;
    res.json({ success: true, data: (data || []).map(toSubject) });
  } catch (error) {
    next(error);
  }
};

const createSubject = async (req, res, next) => {
  try {
    const { name, code, description, credits, semesterId, departmentId, bannerColor, teacherId } = req.body;
    if (!name || !code) {
      throw new AppError('Name and code are required.', 400, 'VALIDATION_ERROR');
    }
    const client = db();
    
    let resolvedDeptId = departmentId;
    if (!resolvedDeptId) {
      const { data: defaultDept } = await client.from('departments').select('department_id').limit(1).single();
      resolvedDeptId = defaultDept ? defaultDept.department_id : null;
    }

    const { data, error } = await client.from('subjects').insert({
      subject_name: name,
      subject_code: code,
      description: description || null,
      credits: credits || 3,
      semester_id: semesterId || null,
      department_id: resolvedDeptId,
      banner_color: bannerColor || '#4F46E5'
    }).select('*, departments(department_name, department_code), semesters(semester_number)').single();
    
    if (error) throw error;

    // If teacherId was provided (usually user_id of the teacher), assign them to the new subject
    if (teacherId) {
      const { data: teacherRow } = await client.from('teachers').select('teacher_id').eq('user_id', teacherId).maybeSingle();
      const actualTeacherId = teacherRow ? teacherRow.teacher_id : teacherId;
      await client.from('teacher_subject_mappings').insert({
        teacher_id: actualTeacherId,
        subject_id: data.subject_id,
        academic_year: new Date().getFullYear().toString()
      });
    }

    res.status(201).json({ success: true, data: toSubject(data) });
  } catch (error) {
    next(error);
  }
};

const assignTeacher = async (req, res, next) => {
  try {
    const { teacherId } = req.body;
    const { id: subjectId } = req.params;
    
    if (!teacherId || !subjectId) {
      throw new AppError('teacherId and subjectId are required.', 400, 'VALIDATION_ERROR');
    }
    const client = db();
    
    // Convert generic user ID to teacher ID if necessary, but assume teacherId is actual teacher_id
    // Wait, frontend might pass user_id instead of teacher_id.
    // Let's check if the teacherId passed is user_id:
    const { data: teacherRow } = await client.from('teachers').select('teacher_id').eq('user_id', teacherId).maybeSingle();
    const actualTeacherId = teacherRow ? teacherRow.teacher_id : teacherId;

    const { error } = await client.from('teacher_subject_mappings').insert({
      teacher_id: actualTeacherId,
      subject_id: subjectId,
      academic_year: new Date().getFullYear().toString()
    });
    
    if (error) throw error;
    res.json({ success: true, message: 'Teacher assigned successfully' });
  } catch (error) {
    next(error);
  }
};

const getSubjectById = async (req, res, next) => {
  try {
    const client = db();
    const { data, error } = await client.from('subjects').select('*, departments(department_name, department_code), semesters(semester_number)').eq('subject_id', req.params.id).maybeSingle();
    if (error) throw error;
    if (!data) return res.status(404).json({ success: false, message: 'Not found' });
    res.json({ success: true, data: toSubject(data) });
  } catch (error) { next(error); }
};

const enrollStudent = async (req, res, next) => {
  try {
    const client = db();
    const { data: studentRow } = await client.from('students').select('student_id').eq('user_id', req.user.id).maybeSingle();
    const studentId = studentRow ? studentRow.student_id : req.user.id;
    await client.from('student_enrollments').insert({ student_id: studentId, subject_id: req.params.id, status: 'enrolled' });
    res.json({ success: true, message: 'Enrolled successfully' });
  } catch (error) { next(error); }
};

const unenrollStudent = async (req, res, next) => {
  try {
    const client = db();
    const { data: studentRow } = await client.from('students').select('student_id').eq('user_id', req.user.id).maybeSingle();
    const studentId = studentRow ? studentRow.student_id : req.user.id;
    await client.from('student_enrollments').delete().eq('student_id', studentId).eq('subject_id', req.params.id);
    res.json({ success: true, message: 'Unenrolled successfully' });
  } catch (error) { next(error); }
};

const updateSubject = async (req, res, next) => {
  try {
    const client = db();
    const { name, code, description, credits, bannerColor } = req.body;
    const updatePayload = {};
    if (name) updatePayload.subject_name = name;
    if (code) updatePayload.subject_code = code;
    if (description !== undefined) updatePayload.description = description;
    if (credits) updatePayload.credits = credits;
    if (bannerColor) updatePayload.banner_color = bannerColor;

    const { data, error } = await client.from('subjects').update(updatePayload).eq('subject_id', req.params.id).select('*, departments(department_name, department_code), semesters(semester_number)').maybeSingle();
    if (error) throw error;
    res.json({ success: true, data: toSubject(data) });
  } catch (error) { next(error); }
};

const deleteSubject = async (req, res, next) => {
  try {
    const client = db();
    await client.from('subjects').delete().eq('subject_id', req.params.id);
    res.json({ success: true, message: 'Subject deleted' });
  } catch (error) { next(error); }
};

const getEnrolledStudents = async (req, res, next) => {
  try {
    const client = db();
    const { data, error } = await client.from('student_enrollments').select('students(student_id, roll_number, users(name, email))').eq('subject_id', req.params.id);
    if (error) throw error;
    res.json({ success: true, data: (data || []).map(r => {
      const student = r.students;
      return {
        _id: student.student_id,
        id: student.student_id,
        rollNumber: student.roll_number,
        name: student.users?.name,
        email: student.users?.email
      };
    }) });
  } catch (error) { next(error); }
};

module.exports = {
  getSubjects,
  getSubjectById,
  createSubject,
  updateSubject,
  deleteSubject,
  enrollStudent,
  unenrollStudent,
  getEnrolledStudents,
  assignTeacher
};
