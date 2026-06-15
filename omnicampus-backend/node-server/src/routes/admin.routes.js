const express = require('express');
const adminController = require('../controllers/admin.controller');
const authMiddleware = require('../middleware/auth');
const roleGuard = require('../middleware/roleGuard');

const router = express.Router();

// All admin routes require authentication and admin privileges
router.use(authMiddleware);
router.use(roleGuard('admin'));

router.get('/analytics', adminController.getAnalytics);
router.get('/users', adminController.listUsers);
router.post('/users', adminController.createUser);
router.put('/users/:id', adminController.updateUser);
router.patch('/users/:id/status', adminController.toggleUserStatus);
router.delete('/users/:id', adminController.deleteUser);

router.get('/departments', adminController.listDepartments);
router.post('/departments', adminController.createDepartment);
router.delete('/departments/:id', adminController.deleteDepartment);

router.post('/assign-teacher', adminController.assignTeacherToSubject);
router.post('/enroll-student', adminController.enrollStudentInSemester);

router.get('/audit-logs', adminController.getAuditLogs);

module.exports = router;
