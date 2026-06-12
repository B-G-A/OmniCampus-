/**
 * Student dashboard controller.
 *
 * Enrolled-subjects overview and recent materials for the logged-in student.
 */

const User = require('../models/User');
const Subject = require('../models/Subject');
const Material = require('../models/Material');
const Semester = require('../models/Semester');
<<<<<<< HEAD
=======
const Attendance = require('../models/Attendance');
const Mark = require('../models/Mark');
>>>>>>> c6bda4a (Fix AI resume parsing normalization and chat fallback message, add features)
const { AppError } = require('../middleware/errorHandler');

/**
 * GET /api/student/dashboard
 * Dashboard data — enrolled subjects, active semester, recent materials.
 */
const getDashboard = async (req, res, next) => {
  try {
    // Get student with populated enrolled subjects
    const student = await User.findById(req.user.id).populate({
      path: 'enrolledSubjects',
      populate: [
        { path: 'teacher', select: 'name email' },
        { path: 'semester', select: 'name year semesterNumber isActive' },
      ],
    });

    if (!student) {
      throw new AppError('Student not found.', 404, 'NOT_FOUND');
    }

    // Active semester
    const activeSemester = await Semester.findOne({ isActive: true });

    // Recent materials across enrolled subjects
    const subjectIds = student.enrolledSubjects.map((s) => s._id);
    const recentMaterials = await Material.find({ subject: { $in: subjectIds } })
      .sort({ createdAt: -1 })
      .limit(10)
      .populate('subject', 'name code')
      .populate('uploadedBy', 'name')
      .select('title fileType createdAt subject uploadedBy');

    res.json({
      success: true,
      data: {
        enrolledSubjects: student.enrolledSubjects,
        activeSemester: activeSemester || null,
        recentMaterials,
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/student/subjects
 * All enrolled subjects with full details.
 */
const getStudentSubjects = async (req, res, next) => {
  try {
    const student = await User.findById(req.user.id).populate({
      path: 'enrolledSubjects',
      populate: [
        { path: 'teacher', select: 'name email profilePicture' },
        { path: 'semester', select: 'name year semesterNumber isActive' },
        { path: 'materials', select: 'title fileType createdAt isIngested' },
      ],
    });

    if (!student) {
      throw new AppError('Student not found.', 404, 'NOT_FOUND');
    }

    res.json({ success: true, data: student.enrolledSubjects });
  } catch (error) {
    next(error);
  }
};

<<<<<<< HEAD
module.exports = {
  getDashboard,
  getStudentSubjects,
=======
/**
 * GET /api/student/attendance
 * Fetch all attendance records for the student with computed statistics.
 */
const getAttendance = async (req, res, next) => {
  try {
    const attendance = await Attendance.find({ student: req.user.id })
      .populate('subject', 'name code')
      .sort({ date: -1 });

    // Compute overall stats
    const totalClasses = attendance.length;
    const presentClasses = attendance.filter(a => a.status === 'Present').length;
    const overallPercentage = totalClasses > 0 ? Math.round((presentClasses / totalClasses) * 100) : 0;
    const requiredAttendance = 75;
    const status = overallPercentage >= requiredAttendance ? 'Safe' : 'Warning';

    // Compute subject-wise stats
    const subjectMap = {};
    attendance.forEach(a => {
      const subId = a.subject?._id?.toString() || 'unknown';
      if (!subjectMap[subId]) {
        subjectMap[subId] = {
          subjectId: subId,
          subjectName: a.subject?.name || 'Unknown',
          subjectCode: a.subject?.code || '',
          total: 0,
          present: 0,
        };
      }
      subjectMap[subId].total++;
      if (a.status === 'Present') subjectMap[subId].present++;
    });

    const subjectWise = Object.values(subjectMap).map(s => ({
      ...s,
      percentage: s.total > 0 ? Math.round((s.present / s.total) * 100) : 0,
      status: (s.total > 0 ? Math.round((s.present / s.total) * 100) : 0) >= requiredAttendance ? 'Safe' : 'Warning',
    }));

    res.json({
      success: true,
      data: {
        records: attendance,
        stats: {
          totalClasses,
          presentClasses,
          overallPercentage,
          requiredAttendance,
          status,
          subjectWise,
        }
      }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/student/marks
 * Fetch all marks records for the student.
 */
const getMarks = async (req, res, next) => {
  try {
    const marks = await Mark.find({ student: req.user.id })
      .populate('subject', 'name code');

    res.json({ success: true, data: marks });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getDashboard,
  getStudentSubjects,
  getAttendance,
  getMarks,
>>>>>>> c6bda4a (Fix AI resume parsing normalization and chat fallback message, add features)
};
