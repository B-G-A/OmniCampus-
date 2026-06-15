const { getSupabaseAdmin } = require('../config/db');
const { AppError } = require('../middleware/errorHandler');
const bcrypt = require('bcryptjs');

const db = () => getSupabaseAdmin();

const toUser = (row) => ({
  _id: row.user_id,
  id: row.user_id,
  name: row.name,
  email: row.email,
  role: row.role,
  status: row.status,
  createdAt: row.created_at,
});

const getAnalytics = async (req, res, next) => {
  try {
    const client = db();
    const [
      { count: totalUsers },
      { count: students },
      { count: teachers },
      { count: activeSessions },
      { count: materials },
      { count: companies },
      { data: placedResults },
      { count: eventsCount }
    ] = await Promise.all([
      client.from('users').select('*', { count: 'exact', head: true }),
      client.from('users').select('*', { count: 'exact', head: true }).eq('role', 'student'),
      client.from('users').select('*', { count: 'exact', head: true }).eq('role', 'teacher'),
      client.from('chat_sessions').select('*', { count: 'exact', head: true }),
      client.from('materials').select('*', { count: 'exact', head: true }),
      client.from('companies').select('*', { count: 'exact', head: true }),
      client.from('placement_results').select('result_id').eq('result', 'selected'),
      client.from('events').select('*', { count: 'exact', head: true })
    ]);

    const placementRate = students ? Number(((placedResults?.length || 0) / students) * 100).toFixed(1) : 0;

    res.json({
      success: true,
      data: {
        totalUsers: totalUsers || 0,
        distribution: {
          students: students || 0,
          teachers: teachers || 0,
        },
        engagement: {
          materials: materials || 0,
          companies: companies || 0,
          placements: placedResults?.length || 0,
          activeSessions: activeSessions || 0,
          eventsThisMonth: eventsCount || 0,
        },
        placementRate
      }
    });
  } catch (error) {
    next(error);
  }
};

const listUsers = async (req, res, next) => {
  try {
    const client = db();
    const { data, error } = await client.from('users').select('user_id, name, email, role, status, created_at').order('created_at', { ascending: false });
    if (error) throw error;
    res.json({ success: true, data: (data || []).map(toUser) });
  } catch (error) {
    next(error);
  }
};

const createUser = async (req, res, next) => {
  try {
    const { name, email, password, role, semesterId } = req.body;
    if (!name || !email || !password || !role) {
      throw new AppError('Missing required fields.', 400, 'VALIDATION_ERROR');
    }
    const client = db();
    const passwordHash = await bcrypt.hash(password, 12);
    
    const { data, error } = await client.from('users').insert({
      name,
      email: email.toLowerCase(),
      password_hash: passwordHash,
      role,
      status: 'active'
    }).select('user_id, name, email, role, status, created_at').single();
    
    if (error) throw error;
    
    if (role === 'student' || role === 'teacher') {
      const { data: defaultDept } = await client.from('departments').select('department_id').limit(1).single();
      const defaultDeptId = defaultDept ? defaultDept.department_id : null;
      
      let defaultSemId = semesterId;
      if (role === 'student' && !defaultSemId) {
        const { data: defaultSem } = await client.from('semesters').select('semester_id').order('semester_number', { ascending: true }).limit(1).single();
        defaultSemId = defaultSem ? defaultSem.semester_id : null;
      }

      if (role === 'student') {
        const { data: student, error: stdErr } = await client.from('students').insert({
          user_id: data.user_id,
          department_id: req.body.departmentId || defaultDeptId,
          semester_id: defaultSemId,
          roll_number: req.body.rollNumber || `ROLL-${data.user_id.slice(0, 8).toUpperCase()}`,
          section: req.body.section || 'A'
        }).select('student_id').single();
        
        if (stdErr) throw stdErr;

        if (defaultSemId && student) {
          const { data: subjects } = await client.from('subjects').select('subject_id').eq('semester_id', defaultSemId);
          if (subjects && subjects.length > 0) {
            const enrollments = subjects.map(s => ({ student_id: student.student_id, subject_id: s.subject_id }));
            await client.from('student_enrollments').insert(enrollments);
          }
        }
      } else if (role === 'teacher') {
        const { error: tchrErr } = await client.from('teachers').insert({
          user_id: data.user_id,
          department_id: req.body.departmentId || defaultDeptId,
          employee_id: req.body.employeeId || `EMP-${data.user_id.slice(0, 8).toUpperCase()}`
        });
        if (tchrErr) throw tchrErr;
      }
    }

    res.status(201).json({ success: true, data: toUser(data) });
  } catch (error) {
    next(error);
  }
};

const updateUser = async (req, res, next) => {
  try {
    const { name, email, role, departmentId, semesterId } = req.body;
    const client = db();
    const { data: user, error } = await client.from('users').update({ name, email, role }).eq('user_id', req.params.id).select('*').single();
    if (error) throw error;

    if (role === 'student') {
      await client.from('students').update({ department_id: departmentId, semester_id: semesterId }).eq('user_id', user.user_id);
    } else if (role === 'teacher') {
      await client.from('teachers').update({ department_id: departmentId }).eq('user_id', user.user_id);
    }

    res.json({ success: true, data: toUser(user) });
  } catch (error) {
    next(error);
  }
};

const toggleUserStatus = async (req, res, next) => {
  try {
    const { status } = req.body;
    const client = db();
    const { data, error } = await client.from('users').update({ status }).eq('user_id', req.params.id).select('*').single();
    if (error) throw error;
    res.json({ success: true, data: toUser(data) });
  } catch (error) {
    next(error);
  }
};

const deleteUser = async (req, res, next) => {
  try {
    const client = db();
    const { error } = await client.from('users').delete().eq('user_id', req.params.id);
    if (error) throw error;
    res.json({ success: true, message: 'User deleted successfully.' });
  } catch (error) {
    next(error);
  }
};

const listDepartments = async (req, res, next) => {
  try {
    const client = db();
    const { data, error } = await client.from('departments').select('*').order('department_name');
    if (error) throw error;
    res.json({ success: true, data });
  } catch (error) {
    next(error);
  }
};

const createDepartment = async (req, res, next) => {
  try {
    const { name, code } = req.body;
    const client = db();
    const { data, error } = await client.from('departments').insert({ department_name: name, department_code: code }).select('*').single();
    if (error) throw error;
    res.status(201).json({ success: true, data });
  } catch (error) {
    next(error);
  }
};

const deleteDepartment = async (req, res, next) => {
  try {
    const client = db();
    const { error } = await client.from('departments').delete().eq('department_id', req.params.id);
    if (error) throw error;
    res.json({ success: true, message: 'Department deleted successfully' });
  } catch (error) {
    next(error);
  }
};

const assignTeacherToSubject = async (req, res, next) => {
  try {
    const { userId, subjectId } = req.body;
    const client = db();
    const { data: teacher } = await client.from('teachers').select('teacher_id').eq('user_id', userId).maybeSingle();
    if (!teacher) throw new AppError('Teacher not found', 404, 'NOT_FOUND');

    const { error } = await client.from('teacher_subject_mappings').insert({ teacher_id: teacher.teacher_id, subject_id: subjectId });
    if (error) throw error;
    res.json({ success: true, message: 'Teacher assigned successfully' });
  } catch (error) {
    next(error);
  }
};

const enrollStudentInSemester = async (req, res, next) => {
  try {
    const { userId, semesterId } = req.body;
    const client = db();
    const { data: student } = await client.from('students').select('student_id').eq('user_id', userId).maybeSingle();
    if (!student) throw new AppError('Student not found', 404, 'NOT_FOUND');

    await client.from('students').update({ semester_id: semesterId }).eq('student_id', student.student_id);

    const { data: subjects } = await client.from('subjects').select('subject_id').eq('semester_id', semesterId);
    if (subjects && subjects.length > 0) {
      const enrollments = subjects.map(s => ({ student_id: student.student_id, subject_id: s.subject_id }));
      await client.from('student_enrollments').upsert(enrollments, { onConflict: 'student_id,subject_id' });
    }

    res.json({ success: true, message: 'Student enrolled in semester successfully' });
  } catch (error) {
    next(error);
  }
};

const getAuditLogs = async (req, res, next) => {
  try {
    const client = db();
    const { data, error } = await client.from('audit_logs').select('*, users(name, email)').order('created_at', { ascending: false }).limit(100);
    if (error) throw error;
    res.json({ success: true, data });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getAnalytics,
  listUsers,
  createUser,
  updateUser,
  toggleUserStatus,
  deleteUser,
  listDepartments,
  createDepartment,
  deleteDepartment,
  assignTeacherToSubject,
  enrollStudentInSemester,
  getAuditLogs
};
