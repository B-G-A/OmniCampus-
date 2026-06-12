const User = require('../models/User');
const Subject = require('../models/Subject');
const PlacementRecord = require('../models/PlacementRecord');
<<<<<<< HEAD
=======
const Material = require('../models/Material');
const ResumeHistory = require('../models/ResumeHistory');
const ChatHistory = require('../models/ChatHistory');
const Attendance = require('../models/Attendance');
>>>>>>> c6bda4a (Fix AI resume parsing normalization and chat fallback message, add features)
const { AppError } = require('../middleware/errorHandler');

/**
 * GET /api/admin/analytics
<<<<<<< HEAD
 * Retrieve system-wide analytics.
 */
const getAnalytics = async (req, res, next) => {
  try {
    const studentCount = await User.countDocuments({ role: 'student' });
    const teacherCount = await User.countDocuments({ role: 'teacher' });
    const tpoCount = await User.countDocuments({ role: 'tpo' });
    const courseCount = await Subject.countDocuments();
    const placementCount = await PlacementRecord.countDocuments();

    // Calculate placement rate: placed students / total students
    const placedStudents = await PlacementRecord.distinct('studentEmail');
    const placementRate = studentCount > 0 ? Math.round((placedStudents.length / studentCount) * 1000) / 10 : 0;

=======
 * Retrieve system-wide analytics including materials, resume analyses,
 * chatbot usage, departments, and attendance statistics.
 */
const getAnalytics = async (req, res, next) => {
  try {
    const [
      studentCount,
      teacherCount,
      tpoCount,
      courseCount,
      placementCount,
      materialCount,
      resumeAnalysisCount,
      chatSessionCount,
    ] = await Promise.all([
      User.countDocuments({ role: 'student' }),
      User.countDocuments({ role: 'teacher' }),
      User.countDocuments({ role: 'tpo' }),
      Subject.countDocuments(),
      PlacementRecord.countDocuments(),
      Material.countDocuments(),
      ResumeHistory.countDocuments(),
      ChatHistory.countDocuments(),
    ]);

    // Total chat messages across all sessions
    const chatMessageAgg = await ChatHistory.aggregate([
      { $project: { messageCount: { $size: '$messages' } } },
      { $group: { _id: null, total: { $sum: '$messageCount' } } },
    ]);
    const totalChatMessages = chatMessageAgg[0]?.total || 0;

    // Placement rate
    const placedStudents = await PlacementRecord.distinct('studentEmail');
    const placementRate = studentCount > 0 ? Math.round((placedStudents.length / studentCount) * 1000) / 10 : 0;

    // Departments
    const departments = await User.distinct('department', { role: 'student' });

    // Attendance stats
    const totalAttendanceRecords = await Attendance.countDocuments();
    const presentRecords = await Attendance.countDocuments({ status: 'Present' });
    const avgAttendanceRate = totalAttendanceRecords > 0 ? Math.round((presentRecords / totalAttendanceRecords) * 100) : 0;

>>>>>>> c6bda4a (Fix AI resume parsing normalization and chat fallback message, add features)
    res.json({
      success: true,
      data: {
        counts: {
          students: studentCount,
          teachers: teacherCount,
          tpos: tpoCount,
          courses: courseCount,
<<<<<<< HEAD
          placements: placementCount
        },
        placementRate
=======
          placements: placementCount,
          materials: materialCount,
          resumeAnalyses: resumeAnalysisCount,
          chatSessions: chatSessionCount,
          chatMessages: totalChatMessages,
        },
        placementRate,
        departments,
        attendanceStats: {
          totalRecords: totalAttendanceRecords,
          presentRecords,
          avgAttendanceRate,
        },
>>>>>>> c6bda4a (Fix AI resume parsing normalization and chat fallback message, add features)
      }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/admin/users
 * Fetch all users with optional role filtering.
 */
const listUsers = async (req, res, next) => {
  try {
    const filter = {};
    if (req.query.role) {
      filter.role = req.query.role;
    }

    const users = await User.find(filter).sort({ createdAt: -1 });

    res.json({
      success: true,
      data: users
    });
  } catch (error) {
    next(error);
  }
};

/**
 * POST /api/admin/users
 * Register a new user (Student, Teacher, TPO, or Admin).
 */
const createUser = async (req, res, next) => {
  try {
    const { name, email, password, role, cgpa, department, attendance } = req.body;

    if (!name || !email || !password || !role) {
      throw new AppError('Name, email, password, and role are required.', 400, 'VALIDATION_ERROR');
    }

    const existingUser = await User.findOne({ email: email.toLowerCase() });
    if (existingUser) {
      throw new AppError('A user with this email already exists.', 409, 'DUPLICATE_EMAIL');
    }

    // Prepare creation options
    const userData = {
      name,
      email,
      password,
      role,
      isVerified: true // Pre-verify admin-created accounts
    };

    // Add optional student fields if role is student
    if (role === 'student') {
      if (cgpa !== undefined) userData.cgpa = cgpa;
      if (department !== undefined) userData.department = department;
      if (attendance !== undefined) userData.attendance = attendance;
    }

    const user = await User.create(userData);

    res.status(201).json({
      success: true,
      message: 'User created successfully.',
      data: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role
      }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * DELETE /api/admin/users/:id
 * Delete a user and clean up associations.
 */
const deleteUser = async (req, res, next) => {
  try {
    const user = await User.findById(req.params.id);
    if (!user) {
      throw new AppError('User not found.', 404, 'NOT_FOUND');
    }

    // Prevent deleting self
    if (user._id.toString() === req.user.id) {
      throw new AppError('Admins cannot delete their own accounts.', 400, 'FORBIDDEN');
    }

    // Clean up enrollment or courses if necessary
    if (user.role === 'student') {
      // Pull student from subject enrolledStudents arrays
      await Subject.updateMany(
        { enrolledStudents: user._id },
        { $pull: { enrolledStudents: user._id } }
      );
    } else if (user.role === 'teacher') {
      // Set teacher field to null for subjects owned by this teacher
      await Subject.updateMany(
        { teacher: user._id },
        { $set: { teacher: null } }
      );
    }

    await User.findByIdAndDelete(user._id);

    res.json({
      success: true,
      message: `User ${user.name} deleted successfully.`
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getAnalytics,
  listUsers,
  createUser,
  deleteUser
};
