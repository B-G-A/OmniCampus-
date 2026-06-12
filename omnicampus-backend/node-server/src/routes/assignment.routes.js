const express = require('express');
const router = express.Router();
const assignmentController = require('../controllers/assignment.controller');
const auth = require('../middleware/auth');
const roleGuard = require('../middleware/roleGuard');
const upload = require('../middleware/upload');

router.use(auth);

// Teacher routes
router.post('/', roleGuard('teacher'), upload.single('file'), assignmentController.createAssignment);
router.get('/teacher', roleGuard('teacher'), assignmentController.getTeacherAssignments);
router.get('/:id/submissions', roleGuard('teacher'), assignmentController.getSubmissions);
router.post('/submissions/:submissionId/grade', roleGuard('teacher'), assignmentController.gradeSubmission);

// Student routes
router.get('/student', roleGuard('student'), assignmentController.getStudentAssignments);
router.post('/:id/submit', roleGuard('student'), upload.single('file'), assignmentController.submitAssignment);

module.exports = router;
