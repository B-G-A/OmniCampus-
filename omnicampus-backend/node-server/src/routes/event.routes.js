const express = require('express');
const eventController = require('../controllers/event.controller');
const authMiddleware = require('../middleware/auth');
const roleGuard = require('../middleware/roleGuard');

const router = express.Router();
router.use(authMiddleware);

router.get('/', eventController.listEvents);
router.post('/', roleGuard('admin'), eventController.createEvent);
router.post('/:id/register', roleGuard('student'), eventController.registerForEvent);
router.delete('/:id/register', roleGuard('student'), eventController.unregisterFromEvent);
router.get('/:id/registrations', roleGuard('admin', 'teacher'), eventController.getEventRegistrations);

module.exports = router;
