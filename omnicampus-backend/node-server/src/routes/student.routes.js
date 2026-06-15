const express = require('express');
const studentController = require('../controllers/student.controller');
const authMiddleware = require('../middleware/auth');
const roleGuard = require('../middleware/roleGuard');

const router = express.Router();

router.use(authMiddleware);
router.use(roleGuard('student'));

router.get('/dashboard', studentController.getDashboard);
router.get('/subjects', studentController.getStudentSubjects);
router.get('/attendance', studentController.getAttendance);
router.get('/marks', studentController.getMarks);

module.exports = router;
