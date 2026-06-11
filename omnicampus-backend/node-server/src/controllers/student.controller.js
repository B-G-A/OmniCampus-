/**
 * Student dashboard controller.
 *
 * Enrolled-subjects overview and recent materials for the logged-in student.
 */

const User = require('../models/User');
const Subject = require('../models/Subject');
const Material = require('../models/Material');
const Semester = require('../models/Semester');
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

module.exports = {
  getDashboard,
  getStudentSubjects,
};
