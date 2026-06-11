const express = require('express');
const semesterController = require('../controllers/semester.controller');
const authMiddleware = require('../middleware/auth');
const roleGuard = require('../middleware/roleGuard');

const router = express.Router();

router.use(authMiddleware);

// Get active semester (accessible to students and teachers)
router.get('/active', semesterController.getActiveSemester);

// Teacher-only routes
router.use(roleGuard('teacher'));

router.get('/', semesterController.getAllSemesters);
router.post('/', semesterController.createSemester);

// Support both PUT/PATCH/POST for activate and archive to be compliant with different API specs
router.put('/:id/activate', semesterController.activateSemester);
router.patch('/:id/activate', semesterController.activateSemester);

router.post('/:id/archive', semesterController.archiveSemester);
router.patch('/:id/archive', semesterController.archiveSemester);

router.delete('/:id', semesterController.deleteSemester);

module.exports = router;
