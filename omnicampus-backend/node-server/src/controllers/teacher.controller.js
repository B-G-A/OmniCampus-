const { getSupabaseAdmin } = require('../config/db');
const { AppError } = require('../middleware/errorHandler');

const db = () => getSupabaseAdmin();

const getDashboard = async (req, res, next) => {
  try {
    const client = db();
    const { data: teacherRow } = await client.from('teachers').select('teacher_id').eq('user_id', req.user.id).maybeSingle();
    const teacherId = teacherRow?.teacher_id;
    if (!teacherId) throw new AppError('Teacher profile not found.', 404, 'NOT_FOUND');

    const { data: mappings } = await client.from('teacher_subject_mappings').select('subjects(subject_id, subject_name, subject_code, semesters(semester_number))').eq('teacher_id', teacherId);
    
    const subjectIds = (mappings || []).map(m => m.subjects?.subject_id).filter(Boolean);
    
    let recentAssignments = [];
    let recentUploads = [];
    let totalMaterials = 0;
    let totalStudents = 0;

    if (subjectIds.length > 0) {
      const { data: assignments } = await client.from('assignments').select('title, due_date, subjects(subject_name)').in('subject_id', subjectIds).order('created_at', { ascending: false }).limit(5);
      recentAssignments = assignments || [];

      const { data: materials, count: materialCount } = await client.from('materials').select('title, file_type, uploaded_at, subjects(subject_name)', { count: 'exact' }).in('subject_id', subjectIds).order('uploaded_at', { ascending: false }).limit(5);
      recentUploads = materials || [];
      totalMaterials = materialCount || 0;

      const { data: enrollments } = await client.from('student_enrollments').select('student_id').in('subject_id', subjectIds);
      const uniqueStudents = new Set((enrollments || []).map(e => e.student_id));
      totalStudents = uniqueStudents.size;
    }

    res.json({
      success: true,
      data: {
        subjects: (mappings || []).map(m => ({
          ...m.subjects,
          _id: m.subjects?.subject_id,
          name: m.subjects?.subject_name,
          code: m.subjects?.subject_code
        })),
        subjectCount: subjectIds.length,
        totalStudents,
        totalMaterials,
        recentAssignments,
        recentUploads
      }
    });
  } catch (error) {
    next(error);
  }
};

const getTeacherSubjects = async (req, res, next) => {
  try {
    const client = db();
    const { data: teacherRow } = await client.from('teachers').select('teacher_id').eq('user_id', req.user.id).maybeSingle();
    const teacherId = teacherRow?.teacher_id;
    if (!teacherId) return res.json({ success: true, data: [] });

    const { data, error } = await client
      .from('teacher_subject_mappings')
      .select('subjects(subject_id, subject_name, subject_code, credits, description, semesters(semester_number, academic_year), departments(department_name))')
      .eq('teacher_id', teacherId);

    if (error) throw error;
    res.json({ 
      success: true, 
      data: (data || []).map(m => ({
        ...m.subjects,
        _id: m.subjects?.subject_id,
        name: m.subjects?.subject_name,
        code: m.subjects?.subject_code
      })) 
    });
  } catch (error) {
    next(error);
  }
};

const getTeacherStudents = async (req, res, next) => {
  try {
    const client = db();
    const { data: teacherRow } = await client.from('teachers').select('teacher_id').eq('user_id', req.user.id).maybeSingle();
    const teacherId = teacherRow?.teacher_id;
    if (!teacherId) return res.json({ success: true, data: [] });

    const { data: mappings } = await client.from('teacher_subject_mappings').select('subject_id').eq('teacher_id', teacherId);
    const subjectIds = (mappings || []).map(row => row.subject_id);
    if (!subjectIds.length) return res.json({ success: true, data: [] });

    const { data, error } = await client
      .from('student_enrollments')
      .select('students(student_id, roll_number, section, cgpa, active_backlogs, users(user_id, name, email, role, status), departments(department_name), semesters(semester_number))')
      .in('subject_id', subjectIds);
      
    if (error) throw error;

    const students = new Map();
    (data || []).forEach(row => {
      const s = row.students;
      if (s) {
        students.set(s.student_id, {
          _id: s.student_id,
          id: s.student_id,
          name: s.users?.name,
          email: s.users?.email,
          rollNumber: s.roll_number,
          section: s.section,
          cgpa: s.cgpa,
          department: s.departments?.department_name,
          semester: s.semesters?.semester_number,
        });
      }
    });

    res.json({ success: true, data: Array.from(students.values()) });
  } catch (error) {
    next(error);
  }
};

const getActivity = async (req, res, next) => {
  try {
    const client = db();
    const { data: teacherRow } = await client.from('teachers').select('teacher_id').eq('user_id', req.user.id).maybeSingle();
    const teacherId = teacherRow?.teacher_id;
    if (!teacherId) return res.json({ success: true, data: [] });

    const { data: mappings } = await client.from('teacher_subject_mappings').select('subject_id').eq('teacher_id', teacherId);
    const subjectIds = (mappings || []).map(row => row.subject_id);

    let activity = [];
    if (subjectIds.length > 0) {
      const { data: attendance } = await client.from('attendance').select('date, created_at, subjects(subject_name)').in('subject_id', subjectIds).order('created_at', { ascending: false }).limit(5);
      const { data: marks } = await client.from('marks').select('updated_at, subjects(subject_name)').in('subject_id', subjectIds).order('updated_at', { ascending: false }).limit(5);

      (attendance || []).forEach(a => activity.push({ type: 'attendance', subject: a.subjects?.subject_name, date: a.created_at }));
      (marks || []).forEach(m => activity.push({ type: 'marks', subject: m.subjects?.subject_name, date: m.updated_at }));
      
      activity.sort((a, b) => new Date(b.date) - new Date(a.date));
      activity = activity.slice(0, 10);
    }

    res.json({ success: true, data: activity });
  } catch (error) {
    next(error);
  }
};

const postNotice = async (req, res, next) => {
  try {
    const { title, message, subjectId } = req.body;
    if (!title || !message) throw new AppError('Title and message are required', 400, 'VALIDATION_ERROR');

    const client = db();
    const { data: teacherRow } = await client.from('teachers').select('teacher_id').eq('user_id', req.user.id).maybeSingle();
    const teacherId = teacherRow?.teacher_id;
    if (!teacherId) throw new AppError('Teacher profile not found', 404, 'NOT_FOUND');

    let targetSubjectIds = [];
    if (subjectId) {
      targetSubjectIds.push(subjectId);
    } else {
      const { data: mappings } = await client.from('teacher_subject_mappings').select('subject_id').eq('teacher_id', teacherId);
      targetSubjectIds = (mappings || []).map(row => row.subject_id);
    }

    if (targetSubjectIds.length > 0) {
      const { data: enrollments } = await client.from('student_enrollments').select('students(user_id)').in('subject_id', targetSubjectIds);
      const userIds = new Set();
      (enrollments || []).forEach(e => {
        if (e.students?.user_id) userIds.add(e.students.user_id);
      });

      if (userIds.size > 0) {
        const notifications = Array.from(userIds).map(uid => ({
          user_id: uid,
          title,
          message,
          type: 'academic'
        }));
        await client.from('notifications').insert(notifications);
      }
    }

    res.status(201).json({ success: true, message: 'Notice posted successfully' });
  } catch (error) {
    next(error);
  }
};

const saveAttendance = async (req, res, next) => {
  try {
    const { records, date } = req.body;
    if (!records || !Array.isArray(records) || records.length === 0) {
      throw new AppError('Records array is required.', 400, 'VALIDATION_ERROR');
    }
    const client = db();
    
    // Convert to upsert format: student_id, subject_id, date, status
    const rows = records.map(r => ({
      student_id: r.student || r.studentId,
      subject_id: subjectId || r.subjectId,
      date: date || new Date().toISOString().split('T')[0],
      status: r.status.toLowerCase(), // present, absent
    }));

    const { error } = await client.from('attendance').upsert(rows, { onConflict: 'student_id,subject_id,date' });
    if (error) throw error;

    res.json({ success: true, message: 'Attendance saved successfully.' });
  } catch (error) {
    next(error);
  }
};

const saveMarks = async (req, res, next) => {
  try {
    const { records } = req.body;
    if (!records || !Array.isArray(records) || records.length === 0) {
      throw new AppError('Records array is required.', 400, 'VALIDATION_ERROR');
    }
    const client = db();

    const rows = records.map(r => ({
      student_id: r.studentId,
      subject_id: r.subjectId,
      internal_marks: Number(r.internalMarks) || 0,
      assignment_marks: Number(r.assignmentMarks) || 0,
      lab_marks: Number(r.labMarks) || 0,
      mid_exam_marks: Number(r.midExamMarks) || 0,
      total: Number(r.total) || 0,
      grade: r.grade || 'F',
    }));

    const { error } = await client.from('marks').upsert(rows, { onConflict: 'student_id,subject_id' });
    if (error) throw error;

    res.json({ success: true, message: 'Marks saved successfully.' });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getDashboard,
  getTeacherSubjects,
  getTeacherStudents,
  getActivity,
  postNotice,
  saveAttendance,
  saveMarks
};
