const Assignment = require('../models/Assignment');
const Submission = require('../models/Submission');
const Subject = require('../models/Subject');
const { AppError } = require('../middleware/errorHandler');
const fs = require('fs');
const path = require('path');
const { v4: uuidv4 } = require('uuid');
const env = require('../config/env');

// Teacher: Create Assignment
exports.createAssignment = async (req, res, next) => {
  try {
    const { title, description, subjectId, dueDate } = req.body;
    
    const subject = await Subject.findById(subjectId);
    if (!subject) throw new AppError('Subject not found', 404);

    let fileName = null;
    let fileUrl = null;

    if (req.file) {
      const ext = path.extname(req.file.originalname);
      fileName = req.file.originalname;
      const newName = `${uuidv4()}${ext}`;
      const destDir = path.resolve(env.UPLOAD_DIR, 'assignments');
      fs.mkdirSync(destDir, { recursive: true });
      const destPath = path.join(destDir, newName);
      fs.renameSync(req.file.path, destPath);
      fileUrl = destPath; // Usually you'd store a relative URL or cloud URL
    }

    const assignment = await Assignment.create({
      title,
      description,
      subject: subjectId,
      teacher: req.user.id,
      dueDate: new Date(dueDate),
      fileName,
      fileUrl
    });

    res.status(201).json({ success: true, data: assignment });
  } catch (error) {
    next(error);
  }
};

// Teacher: Get assignments they created
exports.getTeacherAssignments = async (req, res, next) => {
  try {
    const assignments = await Assignment.find({ teacher: req.user.id })
      .populate('subject', 'name code')
      .sort({ createdAt: -1 });

    // Attach submission count
    const data = await Promise.all(assignments.map(async (a) => {
      const count = await Submission.countDocuments({ assignment: a._id });
      return { ...a.toObject(), submissionsCount: count };
    }));

    res.json({ success: true, data });
  } catch (error) {
    next(error);
  }
};

// Teacher: Get submissions for an assignment
exports.getSubmissions = async (req, res, next) => {
  try {
    const submissions = await Submission.find({ assignment: req.params.id })
      .populate('student', 'name email rollNumber')
      .sort({ submittedAt: -1 });
    res.json({ success: true, data: submissions });
  } catch (error) {
    next(error);
  }
};

// Student: Get assignments for their enrolled subjects
exports.getStudentAssignments = async (req, res, next) => {
  try {
    // Find subjects student is enrolled in
    const subjects = await Subject.find({ enrolledStudents: req.user.id });
    const subjectIds = subjects.map(s => s._id);

    const assignments = await Assignment.find({ subject: { $in: subjectIds } })
      .populate('subject', 'name code teacher')
      .populate('teacher', 'name')
      .sort({ dueDate: 1 });

    // Check if student has submitted
    const data = await Promise.all(assignments.map(async (a) => {
      const sub = await Submission.findOne({ assignment: a._id, student: req.user.id });
      return { ...a.toObject(), mySubmission: sub };
    }));

    res.json({ success: true, data });
  } catch (error) {
    next(error);
  }
};

// Student: Submit assignment
exports.submitAssignment = async (req, res, next) => {
  try {
    const assignmentId = req.params.id;
    if (!req.file) throw new AppError('Submission file is required', 400);

    const assignment = await Assignment.findById(assignmentId);
    if (!assignment) throw new AppError('Assignment not found', 404);

    const ext = path.extname(req.file.originalname);
    const fileName = req.file.originalname;
    const newName = `${uuidv4()}${ext}`;
    const destDir = path.resolve(env.UPLOAD_DIR, 'submissions');
    fs.mkdirSync(destDir, { recursive: true });
    const destPath = path.join(destDir, newName);
    fs.renameSync(req.file.path, destPath);

    // Upsert submission
    const submission = await Submission.findOneAndUpdate(
      { assignment: assignmentId, student: req.user.id },
      {
        fileName,
        fileUrl: destPath,
        submittedAt: new Date()
      },
      { new: true, upsert: true }
    );

    res.status(201).json({ success: true, data: submission });
  } catch (error) {
    next(error);
  }
};

// Teacher: Grade submission
exports.gradeSubmission = async (req, res, next) => {
  try {
    const { grade, feedback } = req.body;
    const submission = await Submission.findByIdAndUpdate(
      req.params.submissionId,
      { grade, feedback },
      { new: true }
    );
    if (!submission) throw new AppError('Submission not found', 404);
    res.json({ success: true, data: submission });
  } catch (error) {
    next(error);
  }
};
