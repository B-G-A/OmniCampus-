/**
 * Teacher dashboard controller.
 *
 * Aggregated stats, subjects, students, and activity for the logged-in teacher.
 */

const Subject = require('../models/Subject');
const Material = require('../models/Material');
const ChatHistory = require('../models/ChatHistory');
<<<<<<< HEAD
const { AppError } = require('../middleware/errorHandler');
=======
const Attendance = require('../models/Attendance');
const Mark = require('../models/Mark');
const { AppError } = require('../middleware/errorHandler');
const { createBulkNotifications } = require('./notification.controller');
>>>>>>> c6bda4a (Fix AI resume parsing normalization and chat fallback message, add features)

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

<<<<<<< HEAD
=======
/**
 * POST /api/teacher/attendance
 * Bulk save attendance records for a subject.
 */
const saveAttendance = async (req, res, next) => {
  try {
    const { subjectId, date, records } = req.body;
    
    // records: [{ student: id, status: 'Present'/'Absent' }, ...]
    const parsedDate = new Date(date);
    parsedDate.setHours(0, 0, 0, 0);

    const operations = records.map(record => ({
      updateOne: {
        filter: { student: record.student, subject: subjectId, date: parsedDate },
        update: { $set: { status: record.status } },
        upsert: true
      }
    }));

    if (operations.length > 0) {
      await Attendance.bulkWrite(operations);
    }

    // Fire notifications to affected students
    const subject = await Subject.findById(subjectId).select('name');
    const studentIds = records.map(r => r.student);
    createBulkNotifications(studentIds, {
      type: 'attendance',
      title: 'Attendance Updated',
      message: `Attendance for ${subject?.name || 'a subject'} on ${parsedDate.toLocaleDateString()} has been recorded.`,
      relatedId: subjectId,
    });

    res.json({ success: true, message: 'Attendance saved successfully.' });
  } catch (error) {
    next(error);
  }
};

/**
 * POST /api/teacher/marks
 * Bulk save marks for a subject.
 */
const saveMarks = async (req, res, next) => {
  try {
    const { subjectId, marks } = req.body;

    // Support both old fields (midTerm/endTerm/practical) and new fields (internal1/internal2/assignment/total/grade)
    const operations = marks.map(m => {
      const updateFields = {};
      // Old fields — preserve backward compat
      if (m.midTerm !== undefined) updateFields.midTerm = m.midTerm;
      if (m.endTerm !== undefined) updateFields.endTerm = m.endTerm;
      if (m.practical !== undefined) updateFields.practical = m.practical;
      // New detailed fields
      if (m.internal1 !== undefined) updateFields.internal1 = m.internal1;
      if (m.internal2 !== undefined) updateFields.internal2 = m.internal2;
      if (m.assignment !== undefined) updateFields.assignment = m.assignment;
      if (m.total !== undefined) updateFields.total = m.total;
      if (m.grade !== undefined) updateFields.grade = m.grade;

      return {
        updateOne: {
          filter: { student: m.student, subject: subjectId },
          update: { $set: updateFields },
          upsert: true
        }
      };
    });

    if (operations.length > 0) {
      await Mark.bulkWrite(operations);
    }

    // Fire notifications to affected students
    const subject = await Subject.findById(subjectId).select('name');
    const studentIds = marks.map(m => m.student);
    createBulkNotifications(studentIds, {
      type: 'marks',
      title: 'Marks Updated',
      message: `Marks for ${subject?.name || 'a subject'} have been updated by your teacher.`,
      relatedId: subjectId,
    });

    res.json({ success: true, message: 'Marks saved successfully.' });
  } catch (error) {
    next(error);
  }
};

>>>>>>> c6bda4a (Fix AI resume parsing normalization and chat fallback message, add features)
module.exports = {
  getDashboard,
  getTeacherSubjects,
  getTeacherStudents,
  getActivity,
<<<<<<< HEAD
=======
  saveAttendance,
  saveMarks,
>>>>>>> c6bda4a (Fix AI resume parsing normalization and chat fallback message, add features)
};
