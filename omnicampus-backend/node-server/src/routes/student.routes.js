const express = require('express');
const studentController = require('../controllers/student.controller');
const authMiddleware = require('../middleware/auth');
const roleGuard = require('../middleware/roleGuard');

const router = express.Router();

router.use(authMiddleware);
router.use(roleGuard('student'));

router.get('/dashboard', studentController.getDashboard);
router.get('/subjects', studentController.getStudentSubjects);
<<<<<<< HEAD
=======
router.get('/attendance', studentController.getAttendance);
router.get('/marks', studentController.getMarks);
>>>>>>> c6bda4a (Fix AI resume parsing normalization and chat fallback message, add features)

module.exports = router;
