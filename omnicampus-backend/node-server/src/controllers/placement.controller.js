const Company = require('../models/Company');
const PlacementRecord = require('../models/PlacementRecord');
const InterviewExperience = require('../models/InterviewExperience');
const { AppError } = require('../middleware/errorHandler');

// Helper to seed initial mock placement data if the DB is empty
const seedPlacementDataIfEmpty = async () => {
  const companyCount = await Company.countDocuments();
  if (companyCount > 0) return;

  console.log('🌱  Seeding mock placement data for dashboard...');

  const google = await Company.create({
    name: 'Google',
    website: 'https://careers.google.com',
    description: 'Global technology leader in search, cloud, and AI.',
    rolesOffered: [
      { title: 'Software Engineer', packageLPA: 45, description: 'Systems and application development.' },
      { title: 'Associate Product Manager', packageLPA: 35, description: 'Product lifecycle management.' }
    ],
    eligibility: { minCGPA: 8.5, allowedBranches: ['CSE', 'ECE'] },
    recruitmentProcess: ['Online Assessment', 'Technical Round 1', 'Technical Round 2', 'Googleyness Round'],
    visitedYears: [2023, 2024, 2025]
  });

  const microsoft = await Company.create({
    name: 'Microsoft',
    website: 'https://careers.microsoft.com',
    description: 'Empowering every person and organization on the planet to achieve more.',
    rolesOffered: [
      { title: 'Software Engineering Intern', packageLPA: 12, description: 'Summer internship program.' },
      { title: 'Full Time SWE', packageLPA: 32, description: 'Cloud and Windows engineering.' }
    ],
    eligibility: { minCGPA: 8.0, allowedBranches: ['CSE', 'ECE', 'EEE'] },
    recruitmentProcess: ['Coding Round', 'Technical Interview 1', 'Technical Interview 2', 'HR Fitment'],
    visitedYears: [2023, 2024, 2025]
  });

  const amazon = await Company.create({
    name: 'Amazon',
    website: 'https://jobs.amazon.com',
    description: 'Earth\'s most customer-centric company.',
    rolesOffered: [
      { title: 'Systems Engineer', packageLPA: 22, description: 'Infrastructure operations.' },
      { title: 'Software Development Engineer', packageLPA: 28, description: 'Amazon Web Services engineering.' }
    ],
    eligibility: { minCGPA: 7.5, allowedBranches: ['CSE', 'ECE', 'ME', 'EEE'] },
    recruitmentProcess: ['Online Coding Test', 'Technical Round', 'Bar Raiser Round'],
    visitedYears: [2023, 2024]
  });

  const TCS = await Company.create({
    name: 'TCS',
    website: 'https://tcs.com',
    description: 'Global IT service and consulting services provider.',
    rolesOffered: [
      { title: 'Ninja Developer', packageLPA: 4, description: 'Core software development.' },
      { title: 'Digital Developer', packageLPA: 7, description: 'Next-gen technology development.' }
    ],
    eligibility: { minCGPA: 6.0, allowedBranches: ['CSE', 'ECE', 'ME', 'EEE', 'CE'] },
    recruitmentProcess: ['National Qualifier Test', 'Technical Interview', 'HR Round'],
    visitedYears: [2023, 2024, 2025]
  });

  // Create placement records
  const records = [
    // 2025
    { company: google._id, studentName: 'Alice Johnson', department: 'CSE', year: 2025, packageLPA: 45 },
    { company: google._id, studentName: 'Bob Smith', department: 'CSE', year: 2025, packageLPA: 45 },
    { company: microsoft._id, studentName: 'Carol Danvers', department: 'ECE', year: 2025, packageLPA: 32 },
    { company: TCS._id, studentName: 'David Banner', department: 'ME', year: 2025, packageLPA: 7 },
    { company: TCS._id, studentName: 'Eve Miller', department: 'EEE', year: 2025, packageLPA: 4 },

    // 2024
    { company: google._id, studentName: 'Frank Castle', department: 'CSE', year: 2024, packageLPA: 42 },
    { company: microsoft._id, studentName: 'Grace Hopper', department: 'CSE', year: 2024, packageLPA: 30 },
    { company: amazon._id, studentName: 'Henry Pym', department: 'ECE', year: 2024, packageLPA: 28 },
    { company: amazon._id, studentName: 'Iris West', department: 'EEE', year: 2024, packageLPA: 22 },
    { company: TCS._id, studentName: 'Jack Reacher', department: 'ME', year: 2024, packageLPA: 4 },

    // 2023
    { company: microsoft._id, studentName: 'Karen Page', department: 'CSE', year: 2023, packageLPA: 28 },
    { company: amazon._id, studentName: 'Luke Cage', department: 'CSE', year: 2023, packageLPA: 26 },
    { company: TCS._id, studentName: 'Matt Murdock', department: 'ECE', year: 2023, packageLPA: 4 }
  ];

  await PlacementRecord.create(records);
};

/**
 * GET /api/placement/dashboard
 * Fetch aggregated metrics for placements.
 */
const getDashboardStats = async (req, res, next) => {
  try {
    await seedPlacementDataIfEmpty();

    // 1. Core aggregates (Min, Average, Max package, Total selections)
    const packageStats = await PlacementRecord.aggregate([
      {
        $group: {
          _id: null,
          minPackage: { $min: '$packageLPA' },
          maxPackage: { $max: '$packageLPA' },
          avgPackage: { $avg: '$packageLPA' },
          totalPlaced: { $sum: 1 }
        }
      }
    ]);

    const stats = packageStats[0] || { minPackage: 0, maxPackage: 0, avgPackage: 0, totalPlaced: 0 };

    // 2. Company-wise selected counts
    const companyStats = await PlacementRecord.aggregate([
      {
        $group: {
          _id: '$company',
          selectionsCount: { $sum: 1 }
        }
      },
      {
        $lookup: {
          from: 'companies',
          localField: '_id',
          foreignField: '_id',
          as: 'companyInfo'
        }
      },
      { $unwind: '$companyInfo' },
      {
        $project: {
          name: '$companyInfo.name',
          selectionsCount: 1
        }
      },
      { $sort: { selectionsCount: -1 } }
    ]);

    // 3. Year-wise placement statistics
    const yearStats = await PlacementRecord.aggregate([
      {
        $group: {
          _id: '$year',
          selectionsCount: { $sum: 1 },
          avgPackage: { $avg: '$packageLPA' }
        }
      },
      { $project: { year: '$_id', selectionsCount: 1, avgPackage: { $round: ['$avgPackage', 1] } } },
      { $sort: { year: 1 } }
    ]);

    // 4. Department-wise placement statistics
    const deptStats = await PlacementRecord.aggregate([
      {
        $group: {
          _id: '$department',
          selectionsCount: { $sum: 1 },
          avgPackage: { $avg: '$packageLPA' }
        }
      },
      { $project: { department: '$_id', selectionsCount: 1, avgPackage: { $round: ['$avgPackage', 1] } } },
      { $sort: { selectionsCount: -1 } }
    ]);

    const totalCompanies = await Company.countDocuments();

    res.json({
      success: true,
      data: {
        totalCompanies,
        totalPlaced: stats.totalPlaced,
        minPackage: stats.minPackage,
        maxPackage: stats.maxPackage,
        avgPackage: Math.round(stats.avgPackage * 10) / 10,
        companySelections: companyStats,
        yearStats,
        deptStats
      }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/placement/companies
 * List all companies.
 */
const listCompanies = async (req, res, next) => {
  try {
    await seedPlacementDataIfEmpty();
    const companies = await Company.find().sort({ name: 1 });
    res.json({ success: true, data: companies });
  } catch (error) {
    next(error);
  }
};

/**
 * POST /api/placement/companies
 * Create a new company profile (Teacher only).
 */
const createCompany = async (req, res, next) => {
  try {
    const { name, website, description, rolesOffered, eligibility, recruitmentProcess, visitedYears } = req.body;

    const existing = await Company.findOne({ name });
    if (existing) {
      throw new AppError('A company with this name already exists.', 409, 'DUPLICATE_KEY');
    }

    const company = await Company.create({
      name,
      website,
      description,
      rolesOffered,
      eligibility,
      recruitmentProcess,
      visitedYears
    });

    res.status(201).json({ success: true, data: company });
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/placement/companies/:id
 * Get detailed company info.
 */
const getCompanyDetails = async (req, res, next) => {
  try {
    const company = await Company.findById(req.params.id);
    if (!company) {
      throw new AppError('Company not found.', 404, 'NOT_FOUND');
    }
    res.json({ success: true, data: company });
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/placement/companies/:id/experiences
 * Get interview experiences for a company.
 */
const listExperiences = async (req, res, next) => {
  try {
    const experiences = await InterviewExperience.find({ company: req.params.id })
      .populate('student', 'name email profilePicture')
      .sort({ createdAt: -1 });

    res.json({ success: true, data: experiences });
  } catch (error) {
    next(error);
  }
};

/**
 * POST /api/placement/companies/:id/experiences
 * Add an interview experience (Student only).
 */
const createExperience = async (req, res, next) => {
  try {
    const { role, year, difficulty, experienceText, status } = req.body;
    const companyId = req.params.id;

    const company = await Company.findById(companyId);
    if (!company) {
      throw new AppError('Company not found.', 404, 'NOT_FOUND');
    }

    const experience = await InterviewExperience.create({
      company: companyId,
      student: req.user.id,
      role,
      year,
      difficulty,
      experienceText,
      status
    });

    res.status(201).json({ success: true, data: experience });
  } catch (error) {
    next(error);
  }
};

/**
 * POST /api/placement/records
 * Create a new placement record (Teacher only).
 */
const createPlacementRecord = async (req, res, next) => {
  try {
    const { companyId, studentName, studentEmail, department, year, packageLPA } = req.body;

    const company = await Company.findById(companyId);
    if (!company) {
      throw new AppError('Company not found.', 404, 'NOT_FOUND');
    }

    const record = await PlacementRecord.create({
      company: companyId,
      studentName,
      studentEmail,
      department,
      year,
      packageLPA
    });

    res.status(201).json({ success: true, data: record });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getDashboardStats,
  listCompanies,
  createCompany,
  getCompanyDetails,
  listExperiences,
  createExperience,
  createPlacementRecord,
};
