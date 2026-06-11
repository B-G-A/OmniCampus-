const express = require('express');
const subjectController = require('../controllers/subject.controller');
const authMiddleware = require('../middleware/auth');
const roleGuard = require('../middleware/roleGuard');

const router = express.Router();

router.use(authMiddleware);

// Get subjects & subject details (accessible to both students and teachers)
router.get('/', subjectController.getSubjects);
router.get('/:id', subjectController.getSubjectById);

// Student-only enrollment routes
router.post('/:id/enroll', roleGuard('student'), subjectController.enrollStudent);
router.delete('/:id/unenroll', roleGuard('student'), subjectController.unenrollStudent);
router.post('/:id/unenroll', roleGuard('student'), subjectController.unenrollStudent); // fallback

// Teacher & Admin routes
router.post('/', roleGuard('teacher', 'admin'), subjectController.createSubject);
router.put('/:id', roleGuard('teacher', 'admin'), subjectController.updateSubject);
router.delete('/:id', roleGuard('teacher', 'admin'), subjectController.deleteSubject);
router.get('/:id/students', roleGuard('teacher', 'admin'), subjectController.getEnrolledStudents);

module.exports = router;
