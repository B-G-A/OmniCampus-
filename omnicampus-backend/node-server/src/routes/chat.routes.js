const express = require('express');
const chatController = require('../controllers/chat.controller');
const authMiddleware = require('../middleware/auth');
const roleGuard = require('../middleware/roleGuard');

const router = express.Router();

// Chat is student-only
router.use(authMiddleware);
router.use(roleGuard('student'));

router.post('/query', chatController.sendQuery);

router.get('/history', chatController.getChatHistory);

// Expose both /history/:sessionId and /session/:sessionId to be compliant with code and specs
router.get('/history/:sessionId', chatController.getSessionMessages);
router.get('/session/:sessionId', chatController.getSessionMessages);

router.delete('/history/:sessionId', chatController.deleteSession);
router.delete('/session/:sessionId', chatController.deleteSession);

router.post('/new-session', chatController.createNewSession);
router.post('/session', chatController.createNewSession); // fallback

module.exports = router;
