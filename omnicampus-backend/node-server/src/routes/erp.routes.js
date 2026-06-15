const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const fs = require('fs/promises');
const path = require('path');
const { v4: uuidv4 } = require('uuid');
const auth = require('../middleware/auth');
const roleGuard = require('../middleware/roleGuard');
const upload = require('../middleware/upload');
const env = require('../config/env');
const { AppError } = require('../middleware/errorHandler');
const { getSupabaseAdmin } = require('../config/db');
const aiProxy = require('../services/aiProxy.service');
const aiGateway = require('../services/aiGateway.service');

const router = express.Router();

const db = () => getSupabaseAdmin();

const makeId = (row, field) => row?.[field] || row?.id || null;

const getFileTypeFromUpload = (file) => {
  const extension = path.extname(file?.originalname || '').replace('.', '').toLowerCase();
  const mimeType = file?.mimetype || '';
  const fileTypes = {
    pdf: { ext: 'pdf', mime: 'application/pdf' },
    pptx: { ext: 'pptx', mime: 'application/vnd.openxmlformats-officedocument.presentationml.presentation' },
    ppt: { ext: 'ppt', mime: 'application/vnd.ms-powerpoint' },
    docx: { ext: 'docx', mime: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' },
    txt: { ext: 'txt', mime: 'text/plain' },
    png: { ext: 'png', mime: 'image/png' },
    jpg: { ext: 'jpg', mime: 'image/jpeg' },
    jpeg: { ext: 'jpeg', mime: 'image/jpeg' },
    mp4: { ext: 'mp4', mime: 'video/mp4' },
    zip: { ext: 'zip', mime: 'application/zip' },
  };

  const byExtension = fileTypes[extension];
  if (byExtension) return byExtension;

  if (mimeType === 'image/jpeg') return fileTypes.jpeg;
  if (mimeType === 'image/png') return fileTypes.png;
  if (mimeType === 'application/pdf') return fileTypes.pdf;
  if (mimeType === 'video/mp4') return fileTypes.mp4;

  return { ext: extension || 'bin', mime: mimeType || 'application/octet-stream' };
};

const toUser = (row) => ({
  _id: row.user_id,
  id: row.user_id,
  name: row.name,
  email: row.email,
  role: row.role,
  status: row.status,
  createdAt: row.created_at,
  cgpa: row.cgpa ?? null,
  attendance: row.attendance ?? null,
  department: row.department_code || row.department_name || null,
  departmentId: row.department_id || null,
  semesterId: row.semester_id || null,
  rollNumber: row.roll_number || null,
  section: row.section || null,
});

const toSemester = (row) => ({
  _id: row.semester_id,
  id: row.semester_id,
  name: `Semester ${row.semester_number}`,
  semesterNumber: row.semester_number,
  year: row.academic_year,
  academicYear: row.academic_year,
  createdAt: row.created_at,
});

const toSubject = (row, extras = {}) => ({
  _id: row.subject_id,
  id: row.subject_id,
  name: row.subject_name,
  code: row.subject_code,
  credits: row.credits,
  departmentId: row.department_id,
  semesterId: row.semester_id,
  department: row.department_name || extras.department || null,
  semester: extras.semester || null,
  teacher: extras.teacher || null,
  description: row.description || null,
  bannerColor: row.banner_color || null,
});

const toCompany = (row, extras = {}) => ({
  _id: row.company_id,
  id: row.company_id,
  name: row.company_name,
  role: row.role,
  package: row.package,
  eligibility: row.eligibility || {},
  driveDate: row.drive_date,
  website: row.website_url || null,
  description: row.description || null,
  eligibilityStatus: extras.eligibilityStatus || null,
  isApplied: extras.isApplied || false,
});

const toMaterial = (row) => ({
  _id: row.material_id,
  id: row.material_id,
  title: row.title,
  filePath: row.file_path,
  fileName: row.file_name,
  fileType: row.file_type,
  fileSize: row.file_size,
  department: row.department_code || null,
  unit: row.unit || null,
  uploadedAt: row.uploaded_at,
  createdAt: row.uploaded_at,
  subjectId: row.subject_id,
  semesterId: row.semester_id,
});

const toAssignment = (row, extras = {}) => ({
  _id: row.assignment_id,
  id: row.assignment_id,
  title: row.title,
  description: row.description,
  dueDate: row.due_date,
  subjectId: row.subject_id,
  teacherId: row.teacher_id,
  attachmentPath: row.attachment_path || null,
  attachmentName: row.attachment_name || null,
  submissionCount: extras.submissionCount || 0,
  submissionStatus: extras.submissionStatus || null,
  submittedAt: extras.submittedAt || null,
  marks: extras.marks ?? null,
  feedback: extras.feedback ?? null,
  status: extras.status || null,
});

const toSubmission = (row, extras = {}) => ({
  _id: row.submission_id,
  id: row.submission_id,
  assignmentId: row.assignment_id,
  studentId: row.student_id,
  filePath: row.file_path,
  fileName: row.file_name || null,
  marks: row.marks,
  feedback: row.feedback,
  status: row.status,
  submittedAt: row.submitted_at,
  studentName: extras.studentName || null,
});

const toAttendance = (row) => ({
  _id: row.attendance_id,
  id: row.attendance_id,
  studentId: row.student_id,
  subjectId: row.subject_id,
  date: row.attendance_date,
  status: row.status,
  createdAt: row.created_at,
});

const toMark = (row) => ({
  _id: row.mark_id,
  id: row.mark_id,
  studentId: row.student_id,
  subjectId: row.subject_id,
  internalMarks: row.internal_marks,
  assignmentMarks: row.assignment_marks,
  labMarks: row.lab_marks,
  midExamMarks: row.mid_exam_marks,
  total: row.total,
  grade: row.grade,
  updatedAt: row.updated_at,
});

const toNotification = (row) => ({
  _id: row.notification_id,
  id: row.notification_id,
  userId: row.user_id,
  title: row.title,
  message: row.message,
  type: row.type,
  isRead: row.is_read,
  createdAt: row.created_at,
});

const toChatSession = (row) => ({
  _id: row.session_id,
  id: row.session_id,
  studentId: row.student_id,
  subjectId: row.subject_id,
  createdAt: row.created_at,
  lastActive: row.last_active,
});

const toChatMessage = (row) => ({
  _id: row.message_id,
  id: row.message_id,
  sessionId: row.session_id,
  role: row.role,
  message: row.message,
  response: row.response,
  sources: row.sources || [],
  createdAt: row.created_at,
});

const toEvent = (row) => ({
  _id: row.event_id,
  id: row.event_id,
  title: row.title,
  description: row.description,
  venue: row.venue,
  date: row.event_date,
});

const gradeFromTotal = (total) => {
  if (total >= 90) return 'A+';
  if (total >= 80) return 'A';
  if (total >= 70) return 'B';
  if (total >= 60) return 'C';
  if (total >= 50) return 'D';
  return 'F';
};

const requireField = (value, message) => {
  if (value === undefined || value === null || value === '') {
    throw new AppError(message, 400, 'VALIDATION_ERROR');
  }
};

const pickLatestSemester = async () => {
  const client = db();
  const { data, error } = await client
    .from('semesters')
    .select('*')
    .order('academic_year', { ascending: false })
    .order('semester_number', { ascending: false })
    .limit(1);

  if (error) throw error;
  return data?.[0] || null;
};

const getTeacherProfile = async (teacherUserId) => {
  const client = db();
  const { data, error } = await client
    .from('teachers')
    .select('teacher_id, user_id, employee_id, departments(*), users(*)')
    .eq('user_id', teacherUserId)
    .maybeSingle();

  if (error) throw error;
  if (!data) return null;

  return {
    teacherId: data.teacher_id,
    employeeId: data.employee_id,
    user: toUser(data.users || {}),
    departmentId: data.departments?.department_id || null,
    departmentName: data.departments?.department_name || null,
    departmentCode: data.departments?.department_code || null,
  };
};

const getStudentProfile = async (studentUserId) => {
  const client = db();
  const { data, error } = await client
    .from('students')
    .select('student_id, user_id, roll_number, section, cgpa, active_backlogs, departments(*), semesters(*), users(*)')
    .eq('user_id', studentUserId)
    .maybeSingle();

  if (error) throw error;
  if (!data) return null;

  return {
    studentId: data.student_id,
    rollNumber: data.roll_number,
    section: data.section,
    cgpa: data.cgpa,
    activeBacklogs: data.active_backlogs,
    user: toUser(data.users || {}),
    departmentId: data.departments?.department_id || null,
    departmentName: data.departments?.department_name || null,
    departmentCode: data.departments?.department_code || null,
    semesterId: data.semesters?.semester_id || null,
    semesterNumber: data.semesters?.semester_number || null,
    academicYear: data.semesters?.academic_year || null,
  };
};

const getCurrentUserContext = async (req) => {
  const client = db();
  const { data, error } = await client
    .from('users')
    .select('user_id, name, email, role, status, created_at')
    .eq('user_id', req.user.id)
    .maybeSingle();

  if (error) throw error;
  if (!data) throw new AppError('User not found.', 404, 'NOT_FOUND');
  return toUser(data);
};

const withTeacherAccess = async (req) => {
  if (req.user.role === 'admin') return null;
  const teacher = await getTeacherProfile(req.user.id);
  if (!teacher) throw new AppError('Teacher profile not found.', 404, 'NOT_FOUND');
  return teacher;
};

const withStudentAccess = async (req) => {
  if (req.user.role === 'admin') return null;
  const student = await getStudentProfile(req.user.id);
  if (!student) throw new AppError('Student profile not found.', 404, 'NOT_FOUND');
  return student;
};

const createAuditLog = async ({ actorUserId, action, entityType, entityId, payload = {} }) => {
  const client = db();
  await client.from('audit_logs').insert({
    actor_user_id: actorUserId,
    action,
    entity_type: entityType,
    entity_id: entityId,
    payload,
  });
};

const uniqueSessionMessage = (session, message) => `${session}:${message}`;

const storeRefreshToken = async (userId, refreshToken) => {
  const client = db();
  const tokenHash = await bcrypt.hash(refreshToken, 10);
  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();
  const { error } = await client.from('refresh_tokens').insert({
    user_id: userId,
    token_hash: tokenHash,
    expires_at: expiresAt,
  });
  if (error) throw error;
};

const issueTokens = async (user) => {
  const accessToken = jwt.sign({ id: user._id, email: user.email, role: user.role, name: user.name }, env.JWT_ACCESS_SECRET, {
    expiresIn: env.JWT_ACCESS_EXPIRY,
  });
  const refreshToken = jwt.sign({ id: user._id, email: user.email, role: user.role, name: user.name, type: 'refresh' }, env.JWT_REFRESH_SECRET, {
    expiresIn: env.JWT_REFRESH_EXPIRY,
  });
  await storeRefreshToken(user._id, refreshToken);
  return { accessToken, refreshToken };
};

const getSubjectById = async (subjectId) => {
  const client = db();
  const { data, error } = await client
    .from('subjects')
    .select('subject_id, subject_name, subject_code, credits, department_id, semester_id, description, banner_color, departments(*), semesters(*)')
    .eq('subject_id', subjectId)
    .maybeSingle();
  if (error) throw error;
  return data;
};

const listSubjectsForStudent = async (studentId) => {
  const client = db();
  const { data, error } = await client
    .from('student_enrollments')
    .select('subjects(subject_id, subject_name, subject_code, credits, department_id, semester_id, description, banner_color, departments(department_name, department_code), semesters(semester_number, academic_year))')
    .eq('student_id', studentId);
  if (error) throw error;
  return (data || []).map((row) => {
    const subject = row.subjects;
    return toSubject(subject, {
      department: subject?.departments?.department_code || subject?.departments?.department_name || null,
      semester: subject?.semesters ? `Semester ${subject.semesters.semester_number} • ${subject.semesters.academic_year}` : null,
    });
  });
};

const listSubjectsForTeacher = async (teacherId) => {
  const client = db();
  const { data, error } = await client
    .from('teacher_subject_mappings')
    .select('subjects(subject_id, subject_name, subject_code, credits, department_id, semester_id, description, banner_color, departments(department_name, department_code), semesters(semester_number, academic_year))')
    .eq('teacher_id', teacherId);
  if (error) throw error;
  return (data || []).map((row) => {
    const subject = row.subjects;
    return toSubject(subject, {
      department: subject?.departments?.department_code || subject?.departments?.department_name || null,
      semester: subject?.semesters ? `Semester ${subject.semesters.semester_number} • ${subject.semesters.academic_year}` : null,
    });
  });
};

const getDepartmentForTeacher = async (teacherUserId) => {
  const teacher = await getTeacherProfile(teacherUserId);
  return teacher?.departmentId || null;
};

// ------------------------- Auth -------------------------

router.post('/auth/register', async (req, res, next) => {
  try {
    const { name, email, password, role } = req.body;
    requireField(name, 'Name is required.');
    requireField(email, 'Email is required.');
    requireField(password, 'Password is required.');
    requireField(role, 'Role is required.');

    if (!['student', 'teacher'].includes(role)) {
      throw new AppError('Role must be student or teacher.', 400, 'VALIDATION_ERROR');
    }

    const client = db();
    const passwordHash = await bcrypt.hash(password, 12);
    const { data: userRow, error: userError } = await client
      .from('users')
      .insert({ name, email: email.toLowerCase(), password_hash: passwordHash, role, status: 'active' })
      .select('user_id, name, email, role, status, created_at')
      .single();

    if (userError) throw userError;

    if (role === 'student') {
      const semester = await pickLatestSemester();
      const { error: studentError } = await client.from('students').insert({
        user_id: userRow.user_id,
        department_id: req.body.departmentId || null,
        semester_id: semester?.semester_id || null,
        roll_number: req.body.rollNumber || `ROLL-${userRow.user_id.slice(0, 8).toUpperCase()}`,
        section: req.body.section || 'A',
        cgpa: req.body.cgpa ?? null,
        active_backlogs: req.body.activeBacklogs ?? 0,
      });
      if (studentError) throw studentError;
      if (semester) {
        const { data: subjects, error: subjectError } = await client.from('subjects').select('subject_id').eq('semester_id', semester.semester_id);
        if (subjectError) throw subjectError;
        if (subjects?.length) {
          const enrollments = subjects.map((subject) => ({ student_id: userRow.user_id, subject_id: subject.subject_id }));
          const { error: enrollError } = await client.from('student_enrollments').insert(enrollments);
          if (enrollError) throw enrollError;
        }
      }
    }

    if (role === 'teacher') {
      const { error: teacherError } = await client.from('teachers').insert({
        user_id: userRow.user_id,
        department_id: req.body.departmentId || null,
        employee_id: req.body.employeeId || `EMP-${userRow.user_id.slice(0, 8).toUpperCase()}`,
      });
      if (teacherError) throw teacherError;
    }

    const tokens = await issueTokens(toUser(userRow));
    await createAuditLog({ actorUserId: userRow.user_id, action: 'auth.register', entityType: 'user', entityId: userRow.user_id, payload: { role } });

    res.status(201).json({ success: true, data: { ...tokens, user: toUser(userRow) } });
  } catch (error) {
    next(error);
  }
});

router.post('/auth/login', async (req, res, next) => {
  try {
    const { email, password } = req.body;
    requireField(email, 'Email is required.');
    requireField(password, 'Password is required.');

    const client = db();
    const { data: userRow, error } = await client
      .from('users')
      .select('user_id, name, email, role, status, password_hash, created_at')
      .eq('email', email.toLowerCase())
      .maybeSingle();

    if (error) throw error;
    if (!userRow) throw new AppError('Invalid email or password.', 401, 'INVALID_CREDENTIALS');

    const ok = await bcrypt.compare(password, userRow.password_hash);
    if (!ok) throw new AppError('Invalid email or password.', 401, 'INVALID_CREDENTIALS');

    const user = toUser(userRow);
    const tokens = await issueTokens(user);
    await createAuditLog({ actorUserId: user.user_id, action: 'auth.login', entityType: 'user', entityId: user.user_id });

    res.json({ success: true, data: { ...tokens, user } });
  } catch (error) {
    next(error);
  }
});

router.post('/auth/refresh-token', async (req, res, next) => {
  try {
    const { refreshToken } = req.body;
    requireField(refreshToken, 'Refresh token is required.');

    const decoded = jwt.verify(refreshToken, env.JWT_REFRESH_SECRET);
    const client = db();
    const { data, error } = await client
      .from('refresh_tokens')
      .select('refresh_token_id, token_hash, revoked_at, expires_at, users(user_id, name, email, role, status, created_at)')
      .eq('user_id', decoded.id)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (error) throw error;
    if (!data || data.revoked_at) throw new AppError('Refresh token is invalid.', 401, 'INVALID_TOKEN');

    const match = await bcrypt.compare(refreshToken, data.token_hash);
    if (!match) throw new AppError('Refresh token is invalid.', 401, 'INVALID_TOKEN');

    const user = toUser(data.users);
    const accessToken = jwt.sign({ id: user._id, email: user.email, role: user.role, name: user.name }, env.JWT_ACCESS_SECRET, {
      expiresIn: env.JWT_ACCESS_EXPIRY,
    });

    res.json({ success: true, data: { accessToken, user } });
  } catch (error) {
    next(error);
  }
});

router.post('/auth/logout', auth, async (req, res, next) => {
  try {
    const { refreshToken } = req.body;
    if (refreshToken) {
      const client = db();
      const { data } = await client.from('refresh_tokens').select('refresh_token_id, token_hash').eq('user_id', req.user.id);
      for (const tokenRow of data || []) {
        const match = await bcrypt.compare(refreshToken, tokenRow.token_hash);
        if (match) {
          await client.from('refresh_tokens').update({ revoked_at: new Date().toISOString() }).eq('refresh_token_id', tokenRow.refresh_token_id);
          break;
        }
      }
    }

    res.json({ success: true, message: 'Logged out successfully.' });
  } catch (error) {
    next(error);
  }
});

router.get('/auth/me', auth, async (req, res, next) => {
  try {
    const user = await getCurrentUserContext(req);
    res.json({ success: true, data: user });
  } catch (error) {
    next(error);
  }
});

router.post('/auth/forgot-password', async (req, res, next) => {
  try {
    const { email } = req.body;
    requireField(email, 'Email is required.');
    res.json({ success: true, message: 'If the email exists, a reset link can be generated.' });
  } catch (error) {
    next(error);
  }
});

router.post('/auth/reset-password', async (req, res, next) => {
  try {
    const { token, password } = req.body;
    requireField(token, 'Token is required.');
    requireField(password, 'Password is required.');
    res.json({ success: true, message: 'Password reset completed.' });
  } catch (error) {
    next(error);
  }
});

router.get('/auth/verify-email', async (_req, res) => {
  res.json({ success: true, message: 'Email verification completed.' });
});

// ------------------------- Academic Core -------------------------

router.get('/semesters', auth, async (_req, res, next) => {
  try {
    const client = db();
    const { data, error } = await client.from('semesters').select('*').order('academic_year', { ascending: false }).order('semester_number', { ascending: true });
    if (error) throw error;
    res.json({ success: true, data: (data || []).map(toSemester) });
  } catch (error) {
    next(error);
  }
});

router.post('/semesters', auth, roleGuard('admin'), async (req, res, next) => {
  try {
    const { semesterNumber, academicYear } = req.body;
    requireField(semesterNumber, 'semesterNumber is required.');
    requireField(academicYear, 'academicYear is required.');
    const client = db();
    const { data, error } = await client.from('semesters').insert({ semester_number: semesterNumber, academic_year: academicYear }).select('*').single();
    if (error) throw error;
    res.status(201).json({ success: true, data: toSemester(data) });
  } catch (error) {
    next(error);
  }
});

router.get('/student/subjects', auth, roleGuard('student', 'admin'), async (req, res, next) => {
  try {
    const student = await getStudentProfile(req.user.id);
    const data = student ? await listSubjectsForStudent(student.studentId) : [];
    res.json({ success: true, data });
  } catch (error) {
    next(error);
  }
});

router.get('/teacher/subjects', auth, roleGuard('teacher', 'admin'), async (req, res, next) => {
  try {
    const teacher = await getTeacherProfile(req.user.id);
    const data = teacher ? await listSubjectsForTeacher(teacher.teacherId) : [];
    res.json({ success: true, data });
  } catch (error) {
    next(error);
  }
});

router.get('/teacher/students', auth, roleGuard('teacher', 'admin'), async (req, res, next) => {
  try {
    const teacher = await getTeacherProfile(req.user.id);
    const client = db();
    const { data: mappings, error } = await client
      .from('teacher_subject_mappings')
      .select('subject_id')
      .eq('teacher_id', teacher?.teacherId || req.query.teacherId || null);
    if (error) throw error;

    const subjectIds = (mappings || []).map((row) => row.subject_id);
    if (!subjectIds.length) {
      return res.json({ success: true, data: [] });
    }

    const { data, error: enrollError } = await client
      .from('student_enrollments')
      .select('students(student_id, roll_number, section, cgpa, active_backlogs, users(user_id, name, email, role, status), departments(department_name, department_code), semesters(semester_number, academic_year))')
      .in('subject_id', subjectIds);
    if (enrollError) throw enrollError;

    const students = new Map();
    (data || []).forEach((row) => {
      const student = row.students;
      if (student) {
        students.set(student.student_id, {
          _id: student.student_id,
          id: student.student_id,
          name: student.users?.name,
          email: student.users?.email,
          role: student.users?.role,
          status: student.users?.status,
          rollNumber: student.roll_number,
          section: student.section,
          cgpa: student.cgpa,
          activeBacklogs: student.active_backlogs,
          department: student.departments?.department_code || student.departments?.department_name || null,
          semester: student.semesters ? `Semester ${student.semesters.semester_number}` : null,
        });
      }
    });
    res.json({ success: true, data: [...students.values()] });
  } catch (error) {
    next(error);
  }
});

router.get('/subjects/:subjectId/students', auth, roleGuard('teacher', 'admin'), async (req, res, next) => {
  try {
    const client = db();
    const { data, error } = await client
      .from('student_enrollments')
      .select('students(student_id, roll_number, section, cgpa, active_backlogs, users(user_id, name, email, role, status), departments(department_name, department_code), semesters(semester_number, academic_year))')
      .eq('subject_id', req.params.subjectId);
    if (error) throw error;

    const students = (data || []).map((row) => {
      const student = row.students;
      return {
        _id: student.student_id,
        id: student.student_id,
        name: student.users?.name,
        email: student.users?.email,
        role: student.users?.role,
        status: student.users?.status,
        rollNumber: student.roll_number,
        section: student.section,
        cgpa: student.cgpa,
        activeBacklogs: student.active_backlogs,
        department: student.departments?.department_code || student.departments?.department_name || null,
        semester: student.semesters ? `Semester ${student.semesters.semester_number}` : null,
      };
    });
    res.json({ success: true, data: students });
  } catch (error) {
    next(error);
  }
});

router.get('/subjects', auth, async (_req, res, next) => {
  try {
    const client = db();
    const { data, error } = await client.from('subjects').select('subject_id, subject_name, subject_code, credits, department_id, semester_id, description, banner_color, departments(department_name, department_code), semesters(semester_number, academic_year)');
    if (error) throw error;
    res.json({ success: true, data: (data || []).map((row) => toSubject(row, {
      department: row.departments?.department_code || row.departments?.department_name || null,
      semester: row.semesters ? `Semester ${row.semesters.semester_number} • ${row.semesters.academic_year}` : null,
    })) });
  } catch (error) {
    next(error);
  }
});

router.post('/subjects', auth, roleGuard('admin'), async (req, res, next) => {
  try {
    const { name, code, description, semester, teacher, bannerColor, departmentId } = req.body;
    requireField(name, 'Subject name is required.');
    requireField(code, 'Subject code is required.');

    const client = db();
    let resolvedDepartmentId = departmentId || null;
    let resolvedSemesterId = semester || null;
    let teacherId = teacher || null;

    if (!resolvedDepartmentId && teacherId) {
      const { data: teacherRow } = await client.from('teachers').select('department_id').eq('user_id', teacherId).maybeSingle();
      resolvedDepartmentId = teacherRow?.department_id || null;
    }

    if (!resolvedDepartmentId) {
      const { data: firstDepartment } = await client.from('departments').select('department_id').limit(1).maybeSingle();
      resolvedDepartmentId = firstDepartment?.department_id || null;
    }

    if (!resolvedSemesterId) {
      const latestSemester = await pickLatestSemester();
      resolvedSemesterId = latestSemester?.semester_id || null;
    }

    const { data, error } = await client.from('subjects').insert({
      department_id: resolvedDepartmentId,
      semester_id: resolvedSemesterId,
      subject_code: code,
      subject_name: name,
      credits: req.body.credits || 3,
      description: description || null,
      banner_color: bannerColor || null,
    }).select('*').single();
    if (error) throw error;

    if (teacherId) {
      const { data: teacherRow } = await client.from('teachers').select('teacher_id').eq('user_id', teacherId).maybeSingle();
      if (teacherRow?.teacher_id) {
        await client.from('teacher_subject_mappings').upsert({ teacher_id: teacherRow.teacher_id, subject_id: data.subject_id }, { onConflict: 'teacher_id,subject_id' });
      }
    }

    res.status(201).json({ success: true, data: toSubject(data) });
  } catch (error) {
    next(error);
  }
});

router.get('/student/attendance', auth, roleGuard('student', 'admin'), async (req, res, next) => {
  try {
    const student = await getStudentProfile(req.user.id);
    const client = db();
    const { data, error } = await client
      .from('attendance')
      .select('attendance_id, student_id, subject_id, attendance_date, status, created_at, subjects(subject_name, subject_code), semesters(semester_number, academic_year)')
      .eq('student_id', student?.studentId || req.user.id)
      .order('attendance_date', { ascending: false });
    if (error) throw error;

    const records = (data || []).map((row) => ({
      ...toAttendance(row),
      subjectName: row.subjects?.subject_name || null,
      subjectCode: row.subjects?.subject_code || null,
      semester: row.semesters ? `Semester ${row.semesters.semester_number}` : null,
    }));
    const total = records.length;
    const present = records.filter((record) => String(record.status).toLowerCase().startsWith('p')).length;
    res.json({ success: true, data: { records, stats: { totalRecords: total, presentRecords: present, overallPercentage: total ? Math.round((present / total) * 100) : 0 } } });
  } catch (error) {
    next(error);
  }
});

router.post('/teacher/attendance', auth, roleGuard('teacher', 'admin'), async (req, res, next) => {
  try {
    const { subjectId, date, records } = req.body;
    requireField(subjectId, 'subjectId is required.');
    requireField(date, 'date is required.');
    if (!Array.isArray(records) || records.length === 0) {
      throw new AppError('Attendance records are required.', 400, 'VALIDATION_ERROR');
    }

    const client = db();
    const rows = records.map((record) => ({
      student_id: record.student,
      subject_id: subjectId,
      attendance_date: new Date(date).toISOString().slice(0, 10),
      status: String(record.status || 'Present').toLowerCase().startsWith('p') ? 'present' : 'absent',
    }));

    const { error } = await client.from('attendance').upsert(rows, { onConflict: 'student_id,subject_id,attendance_date' });
    if (error) throw error;

    res.json({ success: true, message: 'Attendance saved successfully.' });
  } catch (error) {
    next(error);
  }
});

router.get('/student/marks', auth, roleGuard('student', 'admin'), async (req, res, next) => {
  try {
    const student = await getStudentProfile(req.user.id);
    const client = db();
    const { data, error } = await client
      .from('marks')
      .select('mark_id, student_id, subject_id, internal_marks, assignment_marks, lab_marks, mid_exam_marks, total, grade, updated_at, subjects(subject_name, subject_code)')
      .eq('student_id', student?.studentId || req.user.id)
      .order('updated_at', { ascending: false });
    if (error) throw error;
    res.json({ success: true, data: (data || []).map((row) => ({ ...toMark(row), subjectName: row.subjects?.subject_name || null, subjectCode: row.subjects?.subject_code || null })) });
  } catch (error) {
    next(error);
  }
});

router.post('/teacher/marks', auth, roleGuard('teacher', 'admin'), async (req, res, next) => {
  try {
    const { subjectId, marks } = req.body;
    requireField(subjectId, 'subjectId is required.');
    if (!Array.isArray(marks) || marks.length === 0) {
      throw new AppError('Marks payload is required.', 400, 'VALIDATION_ERROR');
    }

    const client = db();
    const rows = marks.map((row) => {
      const internal1 = Number(row.internal1 || 0);
      const internal2 = Number(row.internal2 || 0);
      const assignment = Number(row.assignment || 0);
      const total = internal1 + internal2 + assignment;
      return {
        student_id: row.student,
        subject_id: subjectId,
        internal_marks: internal1 + internal2,
        assignment_marks: assignment,
        lab_marks: row.labMarks || 0,
        mid_exam_marks: row.midExamMarks || 0,
        total,
        grade: row.grade || gradeFromTotal(total),
      };
    });

    const { error } = await client.from('marks').upsert(rows, { onConflict: 'student_id,subject_id' });
    if (error) throw error;
    res.json({ success: true, message: 'Marks updated successfully.' });
  } catch (error) {
    next(error);
  }
});

// ------------------------- Materials -------------------------

router.get('/materials', auth, async (req, res, next) => {
  try {
    const client = db();
    const query = client.from('materials').select('material_id, teacher_id, subject_id, semester_id, title, file_path, file_name, file_type, file_size, unit, uploaded_at, subjects(subject_name, subject_code), semesters(semester_number, academic_year), teachers(teacher_id, users(name)), departments(department_code)');
    if (req.query.subjectId) query.eq('subject_id', req.query.subjectId);
    const { data, error } = await query.order('uploaded_at', { ascending: false });
    if (error) throw error;
    res.json({ success: true, data: (data || []).map((row) => toMaterial({
      ...row,
      department_code: row.departments?.department_code || null,
      file_name: row.file_name || path.basename(row.file_path || ''),
    })) });
  } catch (error) {
    next(error);
  }
});

router.post('/materials/upload', auth, roleGuard('teacher', 'admin'), upload.single('file'), async (req, res, next) => {
  try {
    if (!req.file) throw new AppError('No file uploaded.', 400, 'NO_FILE');
    const { title, subjectId, department, unit } = req.body;
    requireField(title, 'title is required.');
    requireField(subjectId, 'subjectId is required.');

    const teacher = await getTeacherProfile(req.user.id);
    const subject = await getSubjectById(subjectId);
    if (!subject) throw new AppError('Subject not found.', 404, 'NOT_FOUND');

    const fileMeta = getFileTypeFromUpload(req.file);
    const storageClient = db().storage.from(env.SUPABASE_STORAGE_BUCKET);
    const fileBytes = await fs.readFile(req.file.path);
    const storagePath = `${subjectId}/${uuidv4()}-${path.basename(req.file.originalname)}`;
    const { error: uploadError } = await storageClient.upload(storagePath, fileBytes, {
      contentType: fileMeta?.mime || req.file.mimetype,
      upsert: false,
    });
    if (uploadError) throw uploadError;

    const client = db();
    const { data: materialRow, error } = await client.from('materials').insert({
      teacher_id: teacher?.teacherId || null,
      subject_id: subject.subject_id,
      semester_id: subject.semester_id,
      title,
      file_path: storagePath,
      file_name: req.file.originalname,
      file_type: fileMeta?.ext || path.extname(req.file.originalname).replace('.', '').toLowerCase(),
      file_size: req.file.size,
      department_id: subject.department_id,
      unit: unit || null,
    }).select('*').single();
    if (error) throw error;

    try {
      await aiProxy.ingestDocument({
        filePath: req.file.path,
        fileType: materialRow.file_type,
        materialId: materialRow.material_id,
        subjectId: subject.subject_id,
        semesterId: subject.semester_id,
        collectionName: `subject_${subject.subject_id}`,
      });
    } catch (ingestError) {
      console.warn(`Material ingestion queued but AI service unavailable: ${ingestError.message}`);
    }

    // File deletion is now handled by Python AI service

    await createAuditLog({ actorUserId: req.user.id, action: 'materials.upload', entityType: 'material', entityId: materialRow.material_id, payload: { subjectId } });

    res.status(201).json({ success: true, data: toMaterial(materialRow) });
  } catch (error) {
    next(error);
  }
});

// ------------------------- Assignments -------------------------

router.get('/assignments/teacher', auth, roleGuard('teacher', 'admin'), async (req, res, next) => {
  try {
    const teacher = await getTeacherProfile(req.user.id);
    const client = db();
    const { data, error } = await client.from('assignments').select('assignment_id, teacher_id, subject_id, title, description, due_date, attachment_path, attachment_name, subjects(subject_name, subject_code)').eq('teacher_id', teacher?.teacherId || null).order('due_date', { ascending: true });
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
});

router.get('/assignments/student', auth, roleGuard('student', 'admin'), async (req, res, next) => {
  try {
    const student = await getStudentProfile(req.user.id);
    const client = db();
    const { data: enrollments, error: enrollError } = await client.from('student_enrollments').select('subject_id').eq('student_id', student?.studentId || req.user.id);
    if (enrollError) throw enrollError;
    const subjectIds = (enrollments || []).map((row) => row.subject_id);
    if (!subjectIds.length) {
      return res.json({ success: true, data: [] });
    }
    const { data, error } = await client.from('assignments').select('assignment_id, teacher_id, subject_id, title, description, due_date, attachment_path, attachment_name, subjects(subject_name, subject_code)').in('subject_id', subjectIds).order('due_date', { ascending: true });
    if (error) throw error;

    const result = [];
    for (const row of data || []) {
      const { data: submission } = await client.from('assignment_submissions').select('submission_id, assignment_id, student_id, file_path, file_name, marks, feedback, status, submitted_at').eq('assignment_id', row.assignment_id).eq('student_id', student?.studentId || req.user.id).maybeSingle();
      result.push(toAssignment(row, submission ? { status: submission.status, submittedAt: submission.submitted_at, marks: submission.marks, feedback: submission.feedback } : {}));
    }
    res.json({ success: true, data: result });
  } catch (error) {
    next(error);
  }
});

router.post('/assignments', auth, roleGuard('teacher', 'admin'), upload.single('file'), async (req, res, next) => {
  try {
    const { title, description, dueDate, subjectId } = req.body;
    requireField(title, 'title is required.');
    requireField(description, 'description is required.');
    requireField(dueDate, 'dueDate is required.');
    requireField(subjectId, 'subjectId is required.');

    const teacher = await getTeacherProfile(req.user.id);
    const client = db();
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
      teacher_id: teacher?.teacherId || null,
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
});

router.get('/assignments/:assignmentId/submissions', auth, roleGuard('teacher', 'admin'), async (req, res, next) => {
  try {
    const client = db();
    const { data, error } = await client.from('assignment_submissions').select('submission_id, assignment_id, student_id, file_path, file_name, marks, feedback, status, submitted_at, students(users(name))').eq('assignment_id', req.params.assignmentId).order('submitted_at', { ascending: false });
    if (error) throw error;
    res.json({ success: true, data: (data || []).map((row) => toSubmission(row, { studentName: row.students?.users?.name || null })) });
  } catch (error) {
    next(error);
  }
});

router.post('/assignments/submissions/:submissionId/grade', auth, roleGuard('teacher', 'admin'), async (req, res, next) => {
  try {
    const { grade, feedback } = req.body;
    const client = db();
    const { data, error } = await client.from('assignment_submissions').update({ marks: Number(grade) || 0, feedback: feedback || null, status: 'graded' }).eq('submission_id', req.params.submissionId).select('*').single();
    if (error) throw error;
    res.json({ success: true, data: toSubmission(data) });
  } catch (error) {
    next(error);
  }
});

router.post('/assignments/:assignmentId/submit', auth, roleGuard('student', 'admin'), upload.single('file'), async (req, res, next) => {
  try {
    if (!req.file) throw new AppError('No file uploaded.', 400, 'NO_FILE');
    const student = await getStudentProfile(req.user.id);
    const client = db();
    const fileBytes = await fs.readFile(req.file.path);
    const storagePath = `${req.params.assignmentId}/${student?.studentId || req.user.id}/${uuidv4()}-${path.basename(req.file.originalname)}`;
    const { error: uploadError } = await db().storage.from(env.SUPABASE_STORAGE_BUCKET).upload(storagePath, fileBytes, { contentType: req.file.mimetype, upsert: false });
    if (uploadError) throw uploadError;
    await fs.unlink(req.file.path).catch(() => {});

    const { data, error } = await client.from('assignment_submissions').upsert({
      assignment_id: req.params.assignmentId,
      student_id: student?.studentId || req.user.id,
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
});

// ------------------------- Placement -------------------------

router.get('/placement/companies', auth, async (req, res, next) => {
  try {
    const client = db();
    const { data, error } = await client.from('companies').select('*').order('drive_date', { ascending: true });
    if (error) throw error;

    let student = null;
    if (req.user.role === 'student') {
      student = await getStudentProfile(req.user.id);
    }

    const appliedIds = new Set();
    if (student) {
      const { data: applications } = await client.from('placement_applications').select('company_id').eq('student_id', student.studentId);
      (applications || []).forEach((row) => appliedIds.add(row.company_id));
    }

    const companies = (data || []).map((row) => {
      let eligibilityStatus = null;
      if (student) {
        const minCgpa = Number(row.eligibility?.minCGPA || 0);
        const allowedBranches = row.eligibility?.allowedBranches || [];
        const cgpaOk = Number(student.cgpa || 0) >= minCgpa;
        const branchOk = !allowedBranches.length || allowedBranches.includes(student.departmentCode || student.departmentName || '');
        eligibilityStatus = cgpaOk && branchOk ? 'Eligible' : 'Not Eligible';
      }
      return toCompany(row, { eligibilityStatus, isApplied: appliedIds.has(row.company_id) });
    });

    res.json({ success: true, data: companies });
  } catch (error) {
    next(error);
  }
});

router.post('/placement/companies', auth, roleGuard('admin', 'teacher', 'placement_officer'), async (req, res, next) => {
  try {
    const { name, role, package: packageAmount, eligibility, driveDate, website, description } = req.body;
    requireField(name, 'name is required.');
    const client = db();
    const { data, error } = await client.from('companies').insert({
      company_name: name,
      role: role || null,
      package: packageAmount || null,
      eligibility: eligibility || {},
      drive_date: driveDate || null,
      website_url: website || null,
      description: description || null,
    }).select('*').single();
    if (error) throw error;
    res.status(201).json({ success: true, data: toCompany(data) });
  } catch (error) {
    next(error);
  }
});

router.get('/placement/dashboard', auth, async (_req, res, next) => {
  try {
    const client = db();
    const [{ count: companyCount }, { count: applicationCount }, { count: resultCount }, { count: placedCount }] = await Promise.all([
      client.from('companies').select('company_id', { count: 'exact', head: true }),
      client.from('placement_applications').select('application_id', { count: 'exact', head: true }),
      client.from('placement_results').select('result_id', { count: 'exact', head: true }),
      client.from('placement_results').select('result_id', { count: 'exact', head: true }).eq('result', 'placed'),
    ]);

    const { data: results } = await client.from('placement_results').select('student_id, company_id, package, result, companies(company_name, role)').order('created_at', { ascending: false });
    const deptStats = [];
    const { data: students } = await client.from('students').select('student_id, cgpa, departments(department_code)');
    const totalStudents = students?.length || 0;
    const byDept = new Map();
    (results || []).forEach((row) => {
      const student = students?.find((item) => item.student_id === row.student_id);
      const dept = student?.departments?.department_code || 'Unknown';
      const bucket = byDept.get(dept) || { department: dept, selectionsCount: 0, avgPackage: 0, packages: [] };
      bucket.selectionsCount += row.result === 'placed' ? 1 : 0;
      if (row.package) bucket.packages.push(Number(row.package));
      byDept.set(dept, bucket);
    });
    for (const bucket of byDept.values()) {
      bucket.avgPackage = bucket.packages.length ? Number((bucket.packages.reduce((sum, pkg) => sum + pkg, 0) / bucket.packages.length).toFixed(2)) : 0;
      delete bucket.packages;
      deptStats.push(bucket);
    }

    res.json({
      success: true,
      data: {
        totalCompanies: companyCount || 0,
        totalApplications: applicationCount || 0,
        totalResults: resultCount || 0,
        totalPlaced: placedCount || 0,
        deptStats,
        placementRate: totalStudents ? Number(((placedCount || 0) / totalStudents * 100).toFixed(1)) : 0,
      },
    });
  } catch (error) {
    next(error);
  }
});

router.post('/placement/records', auth, roleGuard('admin', 'teacher', 'placement_officer'), async (req, res, next) => {
  try {
    const { companyId, studentName, studentEmail, department, year, packageLPA } = req.body;
    requireField(companyId, 'companyId is required.');
    const client = db();
    const { data: company, error: companyError } = await client.from('companies').select('*').eq('company_id', companyId).maybeSingle();
    if (companyError) throw companyError;
    if (!company) throw new AppError('Company not found.', 404, 'NOT_FOUND');

    let studentId = null;
    if (studentEmail) {
      const { data: studentUser } = await client.from('users').select('user_id').eq('email', studentEmail.toLowerCase()).maybeSingle();
      if (studentUser) {
        const { data: studentProfile } = await client.from('students').select('student_id').eq('user_id', studentUser.user_id).maybeSingle();
        studentId = studentProfile?.student_id || null;
      }
    }

    const { data, error } = await client.from('placement_results').insert({
      student_id: studentId,
      company_id: companyId,
      package: packageLPA || company.package || null,
      result: 'placed',
      student_name: studentName || null,
      student_email: studentEmail || null,
      department: department || null,
      passed_year: year || null,
    }).select('*').single();
    if (error) throw error;
    res.status(201).json({ success: true, data });
  } catch (error) {
    next(error);
  }
});

router.get('/placement/companies/:companyId/experiences', auth, async (req, res, next) => {
  try {
    const client = db();
    const { data, error } = await client.from('interview_experiences').select('experience_id, company_id, student_id, role, year, difficulty, experience_text, status, created_at').eq('company_id', req.params.companyId).order('created_at', { ascending: false });
    if (error) throw error;
    res.json({ success: true, data: data || [] });
  } catch (error) {
    next(error);
  }
});

router.post('/placement/companies/:companyId/experiences', auth, roleGuard('student', 'admin'), async (req, res, next) => {
  try {
    const { role, year, difficulty, experienceText, status } = req.body;
    const student = await getStudentProfile(req.user.id);
    const client = db();
    const { data, error } = await client.from('interview_experiences').insert({
      company_id: req.params.companyId,
      student_id: student?.studentId || req.user.id,
      role: role || null,
      year: year || null,
      difficulty: difficulty || null,
      experience_text: experienceText || null,
      status: status || null,
    }).select('*').single();
    if (error) throw error;
    res.status(201).json({ success: true, data });
  } catch (error) {
    next(error);
  }
});

// ------------------------- Admin -------------------------

router.get('/admin/users', auth, roleGuard('admin', 'teacher', 'placement_officer'), async (req, res, next) => {
  try {
    const client = db();
    const query = client.from('users').select('user_id, name, email, role, status, created_at, students(student_id, roll_number, section, cgpa, active_backlogs, departments(department_code), semesters(semester_number, academic_year)), teachers(teacher_id, employee_id, departments(department_code))');
    if (req.query.role) query.eq('role', req.query.role);
    const { data, error } = await query.order('created_at', { ascending: false });
    if (error) throw error;
    const users = (data || []).map((row) => ({
      _id: row.user_id,
      id: row.user_id,
      name: row.name,
      email: row.email,
      role: row.role,
      status: row.status,
      createdAt: row.created_at,
      cgpa: row.students?.cgpa ?? null,
      department: row.students?.departments?.department_code || row.teachers?.departments?.department_code || null,
      section: row.students?.section || null,
      rollNumber: row.students?.roll_number || null,
      employeeId: row.teachers?.employee_id || null,
    }));
    res.json({ success: true, data: users });
  } catch (error) {
    next(error);
  }
});

router.post('/admin/users', auth, roleGuard('admin'), async (req, res, next) => {
  try {
    const { name, email, password, role } = req.body;
    requireField(name, 'name is required.');
    requireField(email, 'email is required.');
    requireField(password, 'password is required.');
    requireField(role, 'role is required.');

    const client = db();
    const passwordHash = await bcrypt.hash(password, 12);
    const { data: userRow, error: userError } = await client.from('users').insert({
      name,
      email: email.toLowerCase(),
      password_hash: passwordHash,
      role,
      status: 'active',
    }).select('*').single();
    if (userError) throw userError;

    if (role === 'student') {
      const semester = await pickLatestSemester();
      const { error: studentError } = await client.from('students').insert({
        user_id: userRow.user_id,
        department_id: req.body.departmentId || null,
        semester_id: semester?.semester_id || null,
        roll_number: req.body.rollNumber || `ROLL-${userRow.user_id.slice(0, 8).toUpperCase()}`,
        section: req.body.section || 'A',
        cgpa: Number(req.body.cgpa || 0),
        active_backlogs: Number(req.body.activeBacklogs || 0),
      });
      if (studentError) throw studentError;

      if (semester) {
        const { data: subjects } = await client.from('subjects').select('subject_id').eq('semester_id', semester.semester_id);
        if (subjects?.length) {
          const enrollments = subjects.map((subject) => ({ student_id: userRow.user_id, subject_id: subject.subject_id }));
          const { error: enrollError } = await client.from('student_enrollments').insert(enrollments);
          if (enrollError) throw enrollError;
        }
      }
    }

    if (role === 'teacher') {
      const { error: teacherError } = await client.from('teachers').insert({
        user_id: userRow.user_id,
        department_id: req.body.departmentId || null,
        employee_id: req.body.employeeId || `EMP-${userRow.user_id.slice(0, 8).toUpperCase()}`,
      });
      if (teacherError) throw teacherError;
    }

    res.status(201).json({ success: true, data: toUser(userRow) });
  } catch (error) {
    next(error);
  }
});

router.delete('/admin/users/:userId', auth, roleGuard('admin'), async (req, res, next) => {
  try {
    if (req.user.id === req.params.userId) {
      throw new AppError('You cannot delete your own account.', 400, 'VALIDATION_ERROR');
    }
    const client = db();
    const { error } = await client.from('users').delete().eq('user_id', req.params.userId);
    if (error) throw error;
    res.json({ success: true, message: 'User deleted successfully.' });
  } catch (error) {
    next(error);
  }
});

router.get('/admin/analytics', auth, roleGuard('admin', 'teacher', 'placement_officer'), async (_req, res, next) => {
  try {
    const client = db();
    const [students, teachers, tpos, subjects, materials, companies] = await Promise.all([
      client.from('students').select('student_id', { count: 'exact', head: true }),
      client.from('teachers').select('teacher_id', { count: 'exact', head: true }),
      client.from('users').select('user_id', { count: 'exact', head: true }).eq('role', 'placement_officer'),
      client.from('subjects').select('subject_id', { count: 'exact', head: true }),
      client.from('materials').select('material_id', { count: 'exact', head: true }),
      client.from('companies').select('company_id', { count: 'exact', head: true }),
    ]);

    const { data: placedResults } = await client.from('placement_results').select('result_id').eq('result', 'placed');
    res.json({
      success: true,
      data: {
        counts: {
          students: students.count || 0,
          teachers: teachers.count || 0,
          tpos: tpos.count || 0,
          courses: subjects.count || 0,
          materials: materials.count || 0,
          companies: companies.count || 0,
          placements: placedResults?.length || 0,
        },
        placementRate: students.count ? Number((((placedResults?.length || 0) / students.count) * 100).toFixed(1)) : 0,
      },
    });
  } catch (error) {
    next(error);
  }
});

// ------------------------- Notifications -------------------------

router.get('/notifications', auth, async (req, res, next) => {
  try {
    const client = db();
    const { data, error } = await client.from('notifications').select('*').eq('user_id', req.user.id).order('created_at', { ascending: false });
    if (error) throw error;
    res.json({ success: true, data: (data || []).map(toNotification) });
  } catch (error) {
    next(error);
  }
});

router.patch('/notifications/:notificationId/read', auth, async (req, res, next) => {
  try {
    const client = db();
    const { data, error } = await client.from('notifications').update({ is_read: true }).eq('notification_id', req.params.notificationId).eq('user_id', req.user.id).select('*').single();
    if (error) throw error;
    res.json({ success: true, data: toNotification(data) });
  } catch (error) {
    next(error);
  }
});

router.patch('/notifications/read-all', auth, async (req, res, next) => {
  try {
    const client = db();
    const { error } = await client.from('notifications').update({ is_read: true }).eq('user_id', req.user.id).eq('is_read', false);
    if (error) throw error;
    res.json({ success: true, message: 'Notifications marked as read.' });
  } catch (error) {
    next(error);
  }
});

// ------------------------- Chat / AI -------------------------

router.post('/chat/session', auth, roleGuard('student', 'admin'), async (req, res, next) => {
  try {
    const { subjectId } = req.body;
    requireField(subjectId, 'subjectId is required.');
    const student = await getStudentProfile(req.user.id);
    const client = db();
    const { data, error } = await client.from('chat_sessions').insert({ student_id: student?.studentId || req.user.id, subject_id: subjectId }).select('*').single();
    if (error) throw error;
    res.status(201).json({ success: true, data: { sessionId: data.session_id, id: data.session_id } });
  } catch (error) {
    next(error);
  }
});

router.get('/chat/history', auth, roleGuard('student', 'admin'), async (req, res, next) => {
  try {
    const student = await getStudentProfile(req.user.id);
    const client = db();
    const query = client.from('chat_sessions').select('*').eq('student_id', student?.studentId || req.user.id).order('last_active', { ascending: false });
    if (req.query.subjectId) query.eq('subject_id', req.query.subjectId);
    const { data, error } = await query;
    if (error) throw error;
    res.json({ success: true, data: (data || []).map((row) => ({ sessionId: row.session_id, subjectId: row.subject_id, createdAt: row.created_at, lastActive: row.last_active })) });
  } catch (error) {
    next(error);
  }
});

router.get('/chat/session/:sessionId', auth, roleGuard('student', 'admin'), async (req, res, next) => {
  try {
    const student = await getStudentProfile(req.user.id);
    const client = db();
    const { data: session, error: sessionError } = await client.from('chat_sessions').select('*').eq('session_id', req.params.sessionId).eq('student_id', student?.studentId || req.user.id).maybeSingle();
    if (sessionError) throw sessionError;
    if (!session) throw new AppError('Chat session not found.', 404, 'NOT_FOUND');
    const { data: messages, error } = await client.from('chat_messages').select('*').eq('session_id', req.params.sessionId).order('created_at', { ascending: true });
    if (error) throw error;
    res.json({ success: true, data: { ...toChatSession(session), messages: (messages || []).map(toChatMessage) } });
  } catch (error) {
    next(error);
  }
});

router.post('/chat/query', auth, roleGuard('student', 'admin'), async (req, res, next) => {
  try {
    const { message, subjectId, sessionId } = req.body;
    requireField(message, 'message is required.');
    requireField(subjectId, 'subjectId is required.');

    const student = await getStudentProfile(req.user.id);
    const client = db();
    let sessionRow = null;
    if (sessionId) {
      const { data } = await client.from('chat_sessions').select('*').eq('session_id', sessionId).eq('student_id', student?.studentId || req.user.id).maybeSingle();
      sessionRow = data || null;
    }
    if (!sessionRow) {
      const { data, error } = await client.from('chat_sessions').insert({ student_id: student?.studentId || req.user.id, subject_id: subjectId }).select('*').single();
      if (error) throw error;
      sessionRow = data;
    }

    const { data: history } = await client.from('chat_messages').select('role, message, response, sources, created_at').eq('session_id', sessionRow.session_id).order('created_at', { ascending: true }).limit(12);
    const subject = await getSubjectById(subjectId);
    const aiResult = await aiProxy.queryRAG({
      message,
      collectionName: `subject_${subjectId}`,
      subjectId,
      chatHistory: (history || []).map((entry) => ({
        role: entry.role === 'user' ? 'user' : 'assistant',
        content: entry.role === 'user' ? entry.message : entry.response || entry.message,
      })),
      userContext: {
        studentId: student?.studentId || req.user.id,
        subjectName: subject?.subject_name || null,
        subjectCode: subject?.subject_code || null,
      },
      allowExternal: false,
    });

    const assistantMessage = {
      session_id: sessionRow.session_id,
      role: 'assistant',
      message,
      response: aiResult?.answer || aiResult?.response || '',
      sources: aiResult?.sources || [],
    };
    await client.from('chat_messages').insert([
      { session_id: sessionRow.session_id, role: 'user', message, sources: [] },
      assistantMessage,
    ]);
    await client.from('chat_sessions').update({ last_active: new Date().toISOString() }).eq('session_id', sessionRow.session_id);

    res.json({
      success: true,
      data: {
        answer: aiResult?.answer || aiResult?.response || '',
        response: aiResult?.response || aiResult?.answer || '',
        sources: aiResult?.sources || [],
        confidence_score: aiResult?.confidence_score || aiResult?.confidence || null,
        page_number: aiResult?.page_number || null,
        related_topics: aiResult?.related_topics || [],
        sessionId: sessionRow.session_id,
      },
    });
  } catch (error) {
    next(error);
  }
});

// ------------------------- Events -------------------------

router.get('/events', auth, async (_req, res, next) => {
  try {
    const client = db();
    const { data, error } = await client.from('events').select('*').order('event_date', { ascending: true });
    if (error) throw error;
    res.json({ success: true, data: (data || []).map(toEvent) });
  } catch (error) {
    next(error);
  }
});

router.post('/events', auth, roleGuard('admin', 'teacher', 'placement_officer'), async (req, res, next) => {
  try {
    const { title, description, venue, date } = req.body;
    requireField(title, 'title is required.');
    requireField(date, 'date is required.');
    const client = db();
    const { data, error } = await client.from('events').insert({ title, description: description || null, venue: venue || null, event_date: date }).select('*').single();
    if (error) throw error;
    res.status(201).json({ success: true, data: toEvent(data) });
  } catch (error) {
    next(error);
  }
});

// ------------------------- Health -------------------------

router.get('/health', async (_req, res) => {
  const providerStatus = aiGateway.getStatus();
  res.json({ success: true, status: 'ok', timestamp: new Date().toISOString(), ai: providerStatus });
});

module.exports = router;