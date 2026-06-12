const express = require('express');
const resumeController = require('../controllers/resume.controller');
const authMiddleware = require('../middleware/auth');
const roleGuard = require('../middleware/roleGuard');
const uploadMiddleware = require('../middleware/upload');

const router = express.Router();

router.use(authMiddleware);
router.use(roleGuard('student'));

router.post('/analyze', uploadMiddleware.single('file'), resumeController.analyzeResume);
router.get('/history', resumeController.getResumeHistory);

module.exports = router;
