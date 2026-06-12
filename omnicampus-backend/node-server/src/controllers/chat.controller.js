/**
 * Chat controller.
 *
 * Send queries to the AI RAG pipeline, manage sessions, and retrieve history.
 */

const { v4: uuidv4 } = require('uuid');
const ChatHistory = require('../models/ChatHistory');
const Subject = require('../models/Subject');
const Semester = require('../models/Semester');
const aiProxy = require('../services/aiProxy.service');
<<<<<<< HEAD
=======
const Attendance = require('../models/Attendance');
const Mark = require('../models/Mark');
>>>>>>> c6bda4a (Fix AI resume parsing normalization and chat fallback message, add features)
const { AppError } = require('../middleware/errorHandler');

/**
 * POST /api/chat/query
 * Validate enrollment, fetch context, call AI, persist messages.
 */
const sendQuery = async (req, res, next) => {
  try {
    const { message, subjectId, sessionId, allowExternal } = req.body;

    if (!message || !subjectId || !sessionId) {
      throw new AppError('message, subjectId, and sessionId are required.', 400, 'VALIDATION_ERROR');
    }

    // Verify subject exists
    const subject = await Subject.findById(subjectId);
    if (!subject) {
      throw new AppError('Subject not found.', 404, 'NOT_FOUND');
    }

    // Verify student is enrolled
    const isEnrolled = subject.enrolledStudents.some(
      (s) => s.toString() === req.user.id
    );
    if (!isEnrolled) {
      throw new AppError('You must be enrolled in this subject to chat.', 403, 'FORBIDDEN');
    }

    // Get active semester for vector collection name
    const semester = await Semester.findById(subject.semester);
    if (!semester || !semester.vectorCollectionName) {
      throw new AppError('Active semester or vector collection not found.', 404, 'NOT_FOUND');
    }

    // Fetch recent chat history (last 10 messages for context)
    let chatSession = await ChatHistory.findOne({ sessionId });
    if (!chatSession) {
      throw new AppError('Chat session not found. Create a new session first.', 404, 'NOT_FOUND');
    }

    const recentMessages = chatSession.messages.slice(-10).map((m) => ({
      role: m.role,
      content: m.content,
    }));

<<<<<<< HEAD
=======
    // Fetch context
    const attendances = await Attendance.find({ student: req.user.id, subject: subjectId });
    const marks = await Mark.find({ student: req.user.id, subject: subjectId });
    
    let totalClasses = attendances.length;
    let presentClasses = attendances.filter(a => a.status === 'Present').length;
    const attPercentage = totalClasses > 0 ? ((presentClasses / totalClasses) * 100).toFixed(1) + '%' : 'N/A';

    const userContext = {
      name: req.user.name || 'Student',
      subject: subject.name,
      attendance: attPercentage,
      marks: marks.length > 0 ? marks[0] : 'No marks uploaded yet'
    };

>>>>>>> c6bda4a (Fix AI resume parsing normalization and chat fallback message, add features)
    // Call AI RAG service
    const aiResponse = await aiProxy.queryRAG({
      message,
      collectionName: semester.vectorCollectionName,
      subjectId: subjectId,
      allowExternal: allowExternal || false,
      chatHistory: recentMessages,
<<<<<<< HEAD
=======
      userContext
>>>>>>> c6bda4a (Fix AI resume parsing normalization and chat fallback message, add features)
    });

    // Save user message
    chatSession.messages.push({
      role: 'user',
      content: message,
      sources: [],
      usedExternalSearch: false,
    });

<<<<<<< HEAD
    // Save assistant response
    chatSession.messages.push({
      role: 'assistant',
      content: aiResponse.answer || aiResponse.response || '',
=======
    let finalAnswer = aiResponse.answer || aiResponse.response || '';
    if (!finalAnswer && aiResponse.prompt_external) {
      finalAnswer = "I couldn't find an answer in your course materials. Would you like me to search my general knowledge? (Note: External search is currently disabled in the UI)";
    }
    if (!finalAnswer) {
      finalAnswer = "I'm sorry, I couldn't generate an answer at this time.";
    }

    // Save assistant response
    chatSession.messages.push({
      role: 'assistant',
      content: finalAnswer,
>>>>>>> c6bda4a (Fix AI resume parsing normalization and chat fallback message, add features)
      sources: aiResponse.sources || [],
      usedExternalSearch: aiResponse.usedExternalSearch || false,
    });

    await chatSession.save();

    res.json({
      success: true,
      data: {
<<<<<<< HEAD
        answer: aiResponse.answer || aiResponse.response || '',
        sources: aiResponse.sources || [],
        usedExternalSearch: aiResponse.usedExternalSearch || false,
=======
        answer: finalAnswer,
        sources: aiResponse.sources || [],
        usedExternalSearch: aiResponse.used_external || aiResponse.usedExternalSearch || false,
        confidence_score: aiResponse.confidence_score || 0,
        page_number: aiResponse.page_number || null,
        related_topics: aiResponse.related_topics || [],
>>>>>>> c6bda4a (Fix AI resume parsing normalization and chat fallback message, add features)
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/chat/history?subjectId=...
 * Paginated list of chat sessions for the authenticated user.
 */
const getChatHistory = async (req, res, next) => {
  try {
    const page = Math.max(parseInt(req.query.page, 10) || 1, 1);
    const limit = Math.min(Math.max(parseInt(req.query.limit, 10) || 20, 1), 100);
    const skip = (page - 1) * limit;

    const filter = { user: req.user.id };
    if (req.query.subjectId) filter.subject = req.query.subjectId;

    const [sessions, total] = await Promise.all([
      ChatHistory.find(filter)
        .sort({ updatedAt: -1 })
        .skip(skip)
        .limit(limit)
        .select('sessionId subject semester createdAt updatedAt')
        .populate('subject', 'name code')
        .populate('semester', 'name year'),
      ChatHistory.countDocuments(filter),
    ]);

    res.set('X-Total-Count', total);
    res.json({
      success: true,
      data: sessions,
      pagination: { page, limit, total, pages: Math.ceil(total / limit) },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/chat/session/:sessionId
 * Return all messages for a specific session.
 */
const getSessionMessages = async (req, res, next) => {
  try {
    const session = await ChatHistory.findOne({
      sessionId: req.params.sessionId,
      user: req.user.id,
    }).populate('subject', 'name code');

    if (!session) {
      throw new AppError('Chat session not found.', 404, 'NOT_FOUND');
    }

    res.json({ success: true, data: session });
  } catch (error) {
    next(error);
  }
};

/**
 * DELETE /api/chat/session/:sessionId
 * Delete a chat session.
 */
const deleteSession = async (req, res, next) => {
  try {
    const session = await ChatHistory.findOneAndDelete({
      sessionId: req.params.sessionId,
      user: req.user.id,
    });

    if (!session) {
      throw new AppError('Chat session not found.', 404, 'NOT_FOUND');
    }

    res.json({ success: true, message: 'Chat session deleted.' });
  } catch (error) {
    next(error);
  }
};

/**
 * POST /api/chat/session
 * Create a new chat session, return the sessionId.
 */
const createNewSession = async (req, res, next) => {
  try {
    const { subjectId } = req.body;

    if (!subjectId) {
      throw new AppError('subjectId is required.', 400, 'VALIDATION_ERROR');
    }

    const subject = await Subject.findById(subjectId);
    if (!subject) {
      throw new AppError('Subject not found.', 404, 'NOT_FOUND');
    }

    const semester = await Semester.findById(subject.semester);
    if (!semester) {
      throw new AppError('Semester not found.', 404, 'NOT_FOUND');
    }

    const sessionId = uuidv4();

    const chatSession = await ChatHistory.create({
      user: req.user.id,
      subject: subjectId,
      semester: semester._id,
      sessionId,
      messages: [],
    });

    res.status(201).json({
      success: true,
      data: { sessionId: chatSession.sessionId, id: chatSession._id },
    });
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
