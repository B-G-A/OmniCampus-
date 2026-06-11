/**
 * Teacher dashboard controller.
 *
 * Aggregated stats, subjects, students, and activity for the logged-in teacher.
 */

const Subject = require('../models/Subject');
const Material = require('../models/Material');
const ChatHistory = require('../models/ChatHistory');
const { AppError } = require('../middleware/errorHandler');

/**
 * GET /api/teacher/dashboard
 * Aggregated dashboard stats for the teacher.
 */
const getDashboard = async (req, res, next) => {
  try {
    const teacherId = req.user.id;

    // Subjects owned by this teacher
    const subjects = await Subject.find({ teacher: teacherId }).select('_id enrolledStudents');

    const subjectIds = subjects.map((s) => s._id);

    // Unique student count across all subjects
    const studentSet = new Set();
    subjects.forEach((s) => s.enrolledStudents.forEach((id) => studentSet.add(id.toString())));

    // Total materials
    const totalMaterials = await Material.countDocuments({ subject: { $in: subjectIds } });

    // Recent uploads (last 5)
    const recentUploads = await Material.find({ subject: { $in: subjectIds } })
      .sort({ createdAt: -1 })
      .limit(5)
      .populate('subject', 'name code')
      .select('title fileType createdAt subject');

    res.json({
      success: true,
      data: {
        subjectCount: subjects.length,
        totalStudents: studentSet.size,
        totalMaterials,
        recentUploads,
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/teacher/subjects
 * All subjects created by this teacher.
 */
const getTeacherSubjects = async (req, res, next) => {
  try {
    const subjects = await Subject.find({ teacher: req.user.id })
      .sort({ createdAt: -1 })
      .populate('semester', 'name year semesterNumber isActive')
      .populate('enrolledStudents', 'name email');

    res.json({ success: true, data: subjects });
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/teacher/students
 * All unique students across the teacher's subjects.
 */
const getTeacherStudents = async (req, res, next) => {
  try {
    const subjects = await Subject.find({ teacher: req.user.id })
      .populate('enrolledStudents', 'name email profilePicture')
      .select('enrolledStudents name code');

    // Deduplicate students
    const seen = new Map();
    const students = [];

    subjects.forEach((sub) => {
      sub.enrolledStudents.forEach((student) => {
        const sid = student._id.toString();
        if (!seen.has(sid)) {
          seen.set(sid, true);
          students.push(student);
        }
      });
    });

    res.json({ success: true, data: students });
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/teacher/activity
 * Recent chat activity metadata (no message content) for the teacher's subjects.
 */
const getActivity = async (req, res, next) => {
  try {
    const subjects = await Subject.find({ teacher: req.user.id }).select('_id');
    const subjectIds = subjects.map((s) => s._id);

    const activity = await ChatHistory.find({ subject: { $in: subjectIds } })
      .sort({ updatedAt: -1 })
      .limit(20)
      .select('user subject semester sessionId createdAt updatedAt')
      .populate('user', 'name email')
      .populate('subject', 'name code');

    res.json({ success: true, data: activity });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getDashboard,
  getTeacherSubjects,
  getTeacherStudents,
  getActivity,
};
