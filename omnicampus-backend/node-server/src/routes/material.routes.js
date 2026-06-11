const express = require('express');
const materialController = require('../controllers/material.controller');
const authMiddleware = require('../middleware/auth');
const roleGuard = require('../middleware/roleGuard');
const uploadMiddleware = require('../middleware/upload');

const router = express.Router();

// Internal ingestion callback (does NOT require JWT auth, validated by X-Internal-Key)
router.post('/internal/ingestion-complete', materialController.ingestionComplete);
router.post('/ingestion-complete', materialController.ingestionComplete); // fallback

// Authenticated routes
router.use(authMiddleware);

// Upload and Delete are Teacher-only
router.post('/upload', roleGuard('teacher'), uploadMiddleware.single('file'), materialController.uploadMaterial);
router.delete('/:id', roleGuard('teacher'), materialController.deleteMaterial);

// Get materials and ingestion status (accessible to Any role)
router.get('/:id/status', materialController.getIngestionStatus);

// Map both GET /subject/:subjectId and GET / (with subjectId query param)
router.get('/subject/:subjectId', (req, res, next) => {
  req.query.subjectId = req.params.subjectId;
  next();
}, materialController.getMaterialsBySubject);

router.get('/', materialController.getMaterialsBySubject);

module.exports = router;
