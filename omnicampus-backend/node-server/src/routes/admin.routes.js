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
router.delete('/users/:id', adminController.deleteUser);

module.exports = router;
