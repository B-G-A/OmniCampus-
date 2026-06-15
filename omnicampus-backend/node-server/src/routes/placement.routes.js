const express = require('express');
const placementController = require('../controllers/placement.controller');
const authMiddleware = require('../middleware/auth');
const roleGuard = require('../middleware/roleGuard');

const router = express.Router();

// All placement routes require authentication
router.use(authMiddleware);

// Get placement dashboard stats (accessible by students, teachers, admins, and tpos)
router.get('/dashboard', placementController.getDashboardStats);

// List all companies
router.get('/companies', placementController.listCompanies);

// Add a company (TPO and Admin only)
router.post('/companies', roleGuard('tpo', 'admin'), placementController.createCompany);

// Get company details
router.get('/companies/:id', placementController.getCompanyDetails);

// List interview experiences for a company
router.get('/companies/:id/experiences', placementController.listExperiences);

// Add an interview experience (Students only)
router.post('/companies/:id/experiences', roleGuard('student'), placementController.createExperience);

// Add a student placement record (TPO and Admin only)
router.post('/records', roleGuard('tpo', 'admin'), placementController.createPlacementRecord);

// Apply to a company
router.post('/companies/:id/apply', roleGuard('student'), placementController.applyToCompany);

// Withdraw application
router.delete('/companies/:id/apply', roleGuard('student'), placementController.withdrawApplication);

// Get student's applications
router.get('/my-applications', roleGuard('student'), placementController.getStudentApplications);

module.exports = router;
