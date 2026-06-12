const express = require('express');
const teacherController = require('../controllers/teacher.controller');
const authMiddleware = require('../middleware/auth');
const roleGuard = require('../middleware/roleGuard');

const router = express.Router();

router.use(authMiddleware);
router.use(roleGuard('teacher'));

router.get('/dashboard', teacherController.getDashboard);
router.get('/subjects', teacherController.getTeacherSubjects);
router.get('/students', teacherController.getTeacherStudents);
router.get('/activity', teacherController.getActivity);
<<<<<<< HEAD
=======
router.post('/attendance', teacherController.saveAttendance);
router.post('/marks', teacherController.saveMarks);
>>>>>>> c6bda4a (Fix AI resume parsing normalization and chat fallback message, add features)

module.exports = router;
