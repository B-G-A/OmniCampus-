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
router.post('/notices', teacherController.postNotice);
router.post('/attendance', teacherController.saveAttendance);
router.post('/marks', teacherController.saveMarks);

module.exports = router;
