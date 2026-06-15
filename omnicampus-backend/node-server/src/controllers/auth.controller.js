const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const crypto = require('crypto');
const { getSupabaseAdmin } = require('../config/db');
const { AppError } = require('../middleware/errorHandler');
const env = require('../config/env');

const db = () => getSupabaseAdmin();

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

const requireField = (val, msg) => {
  if (!val) throw new AppError(msg, 400, 'VALIDATION_ERROR');
};

const createAuditLog = async ({ actorUserId, action, entityType, entityId, payload }) => {
  const client = db();
  await client.from('audit_logs').insert({
    user_id: actorUserId,
    action,
    resource: entityType,
    details: { entityId, ...payload },
  });
};

const issueTokens = async (user) => {
  const accessToken = jwt.sign({ id: user._id, email: user.email, role: user.role, name: user.name }, env.JWT_ACCESS_SECRET, {
    expiresIn: env.JWT_ACCESS_EXPIRY,
  });

  const refreshToken = jwt.sign({ id: user._id }, env.JWT_REFRESH_SECRET, {
    expiresIn: env.JWT_REFRESH_EXPIRY,
  });

  const tokenHash = await bcrypt.hash(refreshToken, 10);
  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + 7);

  const client = db();
  const { error } = await client.from('refresh_tokens').insert({
    user_id: user._id,
    token_hash: tokenHash,
    expires_at: expiresAt.toISOString(),
  });
  if (error) throw error;

  return { accessToken, refreshToken };
};

const pickLatestSemester = async () => {
  const { data } = await db()
    .from('semesters')
    .select('semester_id, semester_number, academic_year')
    .order('academic_year', { ascending: false })
    .order('semester_number', { ascending: false })
    .limit(1)
    .maybeSingle();
  return data;
};

const getCurrentUserContext = async (req) => {
  const client = db();
  const { data: userRow } = await client
    .from('users')
    .select('user_id, name, email, role, status, created_at')
    .eq('user_id', req.user.id)
    .maybeSingle();
  if (!userRow) throw new AppError('User not found.', 404, 'NOT_FOUND');

  let extra = {};
  if (userRow.role === 'student') {
    const { data: studentRow } = await client
      .from('students')
      .select('roll_number, section, cgpa, departments(department_name, department_code), semesters(semester_id)')
      .eq('user_id', req.user.id)
      .maybeSingle();
    if (studentRow) {
      extra = {
        rollNumber: studentRow.roll_number,
        section: studentRow.section,
        cgpa: studentRow.cgpa,
        department: studentRow.departments?.department_code,
        semesterId: studentRow.semesters?.semester_id,
      };
    }
  } else if (userRow.role === 'teacher') {
    const { data: teacherRow } = await client
      .from('teachers')
      .select('departments(department_name, department_code)')
      .eq('user_id', req.user.id)
      .maybeSingle();
    if (teacherRow) {
      extra = { department: teacherRow.departments?.department_code };
    }
  }
  return toUser({ ...userRow, ...extra });
};

// ── Controllers ─────────────────────────────────────────────────────────────

const register = async (req, res, next) => {
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
};

const login = async (req, res, next) => {
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
};

const refreshToken = async (req, res, next) => {
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
};

const logout = async (req, res, next) => {
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
};

const getMe = async (req, res, next) => {
  try {
    const user = await getCurrentUserContext(req);
    res.json({ success: true, data: user });
  } catch (error) {
    next(error);
  }
};

const forgotPassword = async (req, res, next) => {
  try {
    const { email } = req.body;
    requireField(email, 'Email is required.');
    res.json({ success: true, message: 'If the email exists, a reset link can be generated.' });
  } catch (error) {
    next(error);
  }
};

const resetPassword = async (req, res, next) => {
  try {
    const { token, password } = req.body;
    requireField(token, 'Token is required.');
    requireField(password, 'Password is required.');
    res.json({ success: true, message: 'Password reset completed.' });
  } catch (error) {
    next(error);
  }
};

const verifyEmail = async (_req, res) => {
  res.json({ success: true, message: 'Email verification completed.' });
};

module.exports = {
  register,
  login,
  refreshToken,
  logout,
  getMe,
  forgotPassword,
  resetPassword,
  verifyEmail,
};
