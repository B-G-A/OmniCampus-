/**
 * Subject controller.
 *
 * CRUD, enrollment/unenrollment, and student listing.
 */

const mongoose = require('mongoose');
const Subject = require('../models/Subject');
const Semester = require('../models/Semester');
const Material = require('../models/Material');
const User = require('../models/User');
const { AppError } = require('../middleware/errorHandler');

/**
 * GET /api/subjects
 * Paginated, optionally filtered by semester. Students see only enrolled subjects.
 */
const getSubjects = async (req, res, next) => {
  try {
    const page = Math.max(parseInt(req.query.page, 10) || 1, 1);
    const limit = Math.min(Math.max(parseInt(req.query.limit, 10) || 20, 1), 100);
    const skip = (page - 1) * limit;

    const filter = {};

    // Optional semester filter
    if (req.query.semester) {
      filter.semester = req.query.semester;
    }

    // Students should only see subjects they are enrolled in
    if (req.user.role === 'student') {
      filter.enrolledStudents = req.user.id;
    }

    // Teachers see only their own subjects (optional — remove if you want all)
    if (req.user.role === 'teacher' && req.query.mine === 'true') {
      filter.teacher = req.user.id;
    }

    const [subjects, total] = await Promise.all([
      Subject.find(filter)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .populate('teacher', 'name email')
        .populate('semester', 'name year semesterNumber isActive'),
      Subject.countDocuments(filter),
    ]);

    res.set('X-Total-Count', total);
    res.json({
      success: true,
      data: subjects,
      pagination: { page, limit, total, pages: Math.ceil(total / limit) },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/subjects/:id
 */
const getSubjectById = async (req, res, next) => {
  try {
    const subject = await Subject.findById(req.params.id)
      .populate('teacher', 'name email profilePicture')
      .populate('materials')
      .populate('semester', 'name year semesterNumber isActive');

    if (!subject) {
      throw new AppError('Subject not found.', 404, 'NOT_FOUND');
    }

    res.json({ success: true, data: subject });
  } catch (error) {
    next(error);
  }
};

/**
 * POST /api/subjects
 * Teacher only — create a new subject within a semester.
 */
const createSubject = async (req, res, next) => {
  try {
    const { name, code, description, semester, bannerColor } = req.body;

    // Validate semester exists
    const sem = await Semester.findById(semester);
    if (!sem) {
      throw new AppError('Semester not found.', 404, 'NOT_FOUND');
    }

    const subject = await Subject.create({
      name,
      code,
      description,
      semester,
      teacher: req.body.teacher || req.user.id,
      bannerColor: bannerColor || '#4F46E5',
    });

    res.status(201).json({ success: true, data: subject });
  } catch (error) {
    next(error);
  }
};

/**
 * PUT /api/subjects/:id
 * Teacher only — must own the subject.
 */
const updateSubject = async (req, res, next) => {
  try {
    const subject = await Subject.findById(req.params.id);

    if (!subject) {
      throw new AppError('Subject not found.', 404, 'NOT_FOUND');
    }

    if (req.user.role !== 'admin' && subject.teacher.toString() !== req.user.id) {
      throw new AppError('You can only update your own subjects.', 403, 'FORBIDDEN');
    }

    const allowed = ['name', 'code', 'description', 'bannerColor'];
    allowed.forEach((field) => {
      if (req.body[field] !== undefined) {
        subject[field] = req.body[field];
      }
    });

    await subject.save();

    res.json({ success: true, data: subject });
  } catch (error) {
    next(error);
  }
};

/**
 * DELETE /api/subjects/:id
 * Teacher only — cascade-delete materials.
 */
const deleteSubject = async (req, res, next) => {
  try {
    const subject = await Subject.findById(req.params.id);

    if (!subject) {
      throw new AppError('Subject not found.', 404, 'NOT_FOUND');
    }

    if (req.user.role !== 'admin' && subject.teacher.toString() !== req.user.id) {
      throw new AppError('You can only delete your own subjects.', 403, 'FORBIDDEN');
    }

    // Cascade-delete materials
    await Material.deleteMany({ subject: subject._id });

    // Remove this subject from all students' enrolledSubjects
    await User.updateMany(
      { enrolledSubjects: subject._id },
      { $pull: { enrolledSubjects: subject._id } }
    );

    await Subject.findByIdAndDelete(subject._id);

    res.json({ success: true, message: 'Subject and related materials deleted.' });
  } catch (error) {
    next(error);
  }
};

/**
 * POST /api/subjects/:id/enroll
 * Student only — enroll in a subject.
 */
const enrollStudent = async (req, res, next) => {
  try {
    const subject = await Subject.findById(req.params.id);
    if (!subject) {
      throw new AppError('Subject not found.', 404, 'NOT_FOUND');
    }

    const studentId = new mongoose.Types.ObjectId(req.user.id);

    // Already enrolled?
    if (subject.enrolledStudents.some((s) => s.equals(studentId))) {
      throw new AppError('You are already enrolled in this subject.', 409, 'ALREADY_ENROLLED');
    }

    // Add to subject
    subject.enrolledStudents.push(studentId);
    await subject.save();

    // Add to user
    await User.findByIdAndUpdate(req.user.id, {
      $addToSet: { enrolledSubjects: subject._id },
    });

    res.json({ success: true, message: 'Enrolled successfully.' });
  } catch (error) {
    next(error);
  }
};

/**
 * POST /api/subjects/:id/unenroll
 * Student only — remove enrollment.
 */
const unenrollStudent = async (req, res, next) => {
  try {
    const subject = await Subject.findById(req.params.id);
    if (!subject) {
      throw new AppError('Subject not found.', 404, 'NOT_FOUND');
    }

    // Remove from subject
    subject.enrolledStudents = subject.enrolledStudents.filter(
      (s) => s.toString() !== req.user.id
    );
    await subject.save();

    // Remove from user
    await User.findByIdAndUpdate(req.user.id, {
      $pull: { enrolledSubjects: subject._id },
    });

    res.json({ success: true, message: 'Unenrolled successfully.' });
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/subjects/:id/students
 * Teacher only — list students enrolled in the subject.
 */
const getEnrolledStudents = async (req, res, next) => {
  try {
    const subject = await Subject.findById(req.params.id).populate(
      'enrolledStudents',
      'name email profilePicture'
    );

    if (!subject) {
      throw new AppError('Subject not found.', 404, 'NOT_FOUND');
    }

    if (subject.teacher.toString() !== req.user.id) {
      throw new AppError('You can only view students for your own subjects.', 403, 'FORBIDDEN');
    }

    res.json({ success: true, data: subject.enrolledStudents });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getSubjects,
  getSubjectById,
  createSubject,
  updateSubject,
  deleteSubject,
  enrollStudent,
  unenrollStudent,
  getEnrolledStudents,
};
