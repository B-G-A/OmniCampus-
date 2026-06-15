const { getSupabaseAdmin } = require('../config/db');
const { AppError } = require('../middleware/errorHandler');
const aiProxy = require('../services/aiProxy.service');

const db = () => getSupabaseAdmin();

const requireField = (value, message) => {
  if (value === undefined || value === null || value === '') {
    throw new AppError(message, 400, 'VALIDATION_ERROR');
  }
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
    departmentId: data.departments?.department_id || null,
    departmentName: data.departments?.department_name || null,
    departmentCode: data.departments?.department_code || null,
    semesterId: data.semesters?.semester_id || null,
    semesterNumber: data.semesters?.semester_number || null,
    academicYear: data.semesters?.academic_year || null,
  };
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

const createNewSession = async (req, res, next) => {
  try {
    const { subjectId } = req.body;
    requireField(subjectId, 'subjectId is required.');
    const student = await getStudentProfile(req.user.id);
    const client = db();
    const { data, error } = await client
      .from('chat_sessions')
      .insert({ student_id: student?.studentId || req.user.id, subject_id: subjectId })
      .select('*')
      .single();
    if (error) throw error;
    res.status(201).json({ success: true, data: { sessionId: data.session_id, id: data.session_id } });
  } catch (error) {
    next(error);
  }
};

const getChatHistory = async (req, res, next) => {
  try {
    const student = await getStudentProfile(req.user.id);
    const client = db();
    const query = client.from('chat_sessions').select('*').eq('student_id', student?.studentId || req.user.id).order('last_active', { ascending: false });
    if (req.query.subjectId) query.eq('subject_id', req.query.subjectId);
    
    // Pagination
    const page = Math.max(parseInt(req.query.page, 10) || 1, 1);
    const limit = Math.min(Math.max(parseInt(req.query.limit, 10) || 20, 1), 100);
    const skip = (page - 1) * limit;
    
    query.range(skip, skip + limit - 1);
    
    const { data, error, count } = await query.select('*', { count: 'exact' });
    if (error) throw error;
    
    res.set('X-Total-Count', count || 0);
    res.json({ 
      success: true, 
      data: (data || []).map((row) => ({ 
        sessionId: row.session_id, 
        subjectId: row.subject_id, 
        createdAt: row.created_at, 
        lastActive: row.last_active,
        _id: row.session_id,
        id: row.session_id
      })),
      pagination: { page, limit, total: count || 0, pages: Math.ceil((count || 0) / limit) }
    });
  } catch (error) {
    next(error);
  }
};

const getSessionMessages = async (req, res, next) => {
  try {
    const student = await getStudentProfile(req.user.id);
    const client = db();
    const { data: session, error: sessionError } = await client
      .from('chat_sessions')
      .select('*')
      .eq('session_id', req.params.sessionId)
      .eq('student_id', student?.studentId || req.user.id)
      .maybeSingle();
    if (sessionError) throw sessionError;
    if (!session) throw new AppError('Chat session not found.', 404, 'NOT_FOUND');
    const { data: messages, error } = await client
      .from('chat_messages')
      .select('*')
      .eq('session_id', req.params.sessionId)
      .order('created_at', { ascending: true });
    if (error) throw error;
    res.json({ success: true, data: { ...toChatSession(session), messages: (messages || []).map(toChatMessage) } });
  } catch (error) {
    next(error);
  }
};

const sendQuery = async (req, res, next) => {
  try {
    const { message, subjectId, sessionId } = req.body;
    requireField(message, 'message is required.');
    requireField(subjectId, 'subjectId is required.');

    const student = await getStudentProfile(req.user.id);
    const client = db();
    let sessionRow = null;
    if (sessionId) {
      const { data } = await client
        .from('chat_sessions')
        .select('*')
        .eq('session_id', sessionId)
        .eq('student_id', student?.studentId || req.user.id)
        .maybeSingle();
      sessionRow = data || null;
    }
    if (!sessionRow) {
      const { data, error } = await client
        .from('chat_sessions')
        .insert({ student_id: student?.studentId || req.user.id, subject_id: subjectId })
        .select('*')
        .single();
      if (error) throw error;
      sessionRow = data;
    }

    const { data: history } = await client
      .from('chat_messages')
      .select('role, message, response, sources, created_at')
      .eq('session_id', sessionRow.session_id)
      .order('created_at', { ascending: true })
      .limit(12);
      
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
      response: aiResult?.answer || aiResult?.response || (aiResult?.prompt_external ? "I couldn't find any relevant information in the uploaded notes. Please ask questions related to the uploaded PDFs, or upload new materials if none are available." : ''),
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
        answer: aiResult?.answer || aiResult?.response || (aiResult?.prompt_external ? "I couldn't find any relevant information in the uploaded notes. Please ask questions related to the uploaded PDFs, or upload new materials if none are available." : ''),
        response: aiResult?.response || aiResult?.answer || (aiResult?.prompt_external ? "I couldn't find any relevant information in the uploaded notes. Please ask questions related to the uploaded PDFs, or upload new materials if none are available." : ''),
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
};

const deleteSession = async (req, res, next) => {
  try {
    const student = await getStudentProfile(req.user.id);
    const client = db();
    const { data, error } = await client
      .from('chat_sessions')
      .delete()
      .eq('session_id', req.params.sessionId)
      .eq('student_id', student?.studentId || req.user.id)
      .select()
      .maybeSingle();

    if (error) throw error;
    if (!data) throw new AppError('Chat session not found.', 404, 'NOT_FOUND');

    res.json({ success: true, message: 'Chat session deleted.' });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  sendQuery,
  getChatHistory,
  getSessionMessages,
  deleteSession,
  createNewSession,
};
