/**
 * Semester controller.
 *
 * CRUD operations, activation/deactivation, archiving with AI-collection
 * cleanup, and cascading deletes.
 */

const Semester = require('../models/Semester');
const Subject = require('../models/Subject');
const Material = require('../models/Material');
const ChatHistory = require('../models/ChatHistory');
const aiProxy = require('../services/aiProxy.service');
const { AppError } = require('../middleware/errorHandler');

/**
 * GET /api/semesters
 * Paginated list of all semesters.
 */
const getAllSemesters = async (req, res, next) => {
  try {
    const page = Math.max(parseInt(req.query.page, 10) || 1, 1);
    const limit = Math.min(Math.max(parseInt(req.query.limit, 10) || 20, 1), 100);
    const skip = (page - 1) * limit;

    const [semesters, total] = await Promise.all([
      Semester.find()
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .populate('createdBy', 'name email'),
      Semester.countDocuments(),
    ]);

    res.set('X-Total-Count', total);
    res.json({
      success: true,
      data: semesters,
      pagination: { page, limit, total, pages: Math.ceil(total / limit) },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/semesters/active
 * Return the single active semester.
 */
const getActiveSemester = async (req, res, next) => {
  try {
    const semester = await Semester.findOne({ isActive: true }).populate('createdBy', 'name email');

    if (!semester) {
      throw new AppError('No active semester found.', 404, 'NOT_FOUND');
    }

    res.json({ success: true, data: semester });
  } catch (error) {
    next(error);
  }
};

/**
 * POST /api/semesters
 * Create a new semester. vectorCollectionName is derived from the new doc id.
 */
const createSemester = async (req, res, next) => {
  try {
    const { name, year, semesterNumber, startDate, endDate } = req.body;

    const semester = await Semester.create({
      name,
      year,
      semesterNumber,
      startDate: startDate || null,
      endDate: endDate || null,
      createdBy: req.user.id,
    });

    // Set vector collection name after we have the id
    semester.vectorCollectionName = `semester_${semester._id}`;
    await semester.save();

    res.status(201).json({ success: true, data: semester });
  } catch (error) {
    next(error);
  }
};

/**
 * PATCH /api/semesters/:id/activate
 * Deactivate all semesters, then activate the specified one.
 */
const activateSemester = async (req, res, next) => {
  try {
    const { id } = req.params;

    const semester = await Semester.findById(id);
    if (!semester) {
      throw new AppError('Semester not found.', 404, 'NOT_FOUND');
    }

    // Deactivate every semester
    await Semester.updateMany({}, { isActive: false });

    // Activate the target
    semester.isActive = true;
    semester.archivedAt = null; // un-archive if it was archived
    await semester.save();

    res.json({ success: true, message: 'Semester activated.', data: semester });
  } catch (error) {
    next(error);
  }
};

/**
 * PATCH /api/semesters/:id/archive
 * Mark semester as archived and delete its vector collection.
 */
const archiveSemester = async (req, res, next) => {
  try {
    const { id } = req.params;

    const semester = await Semester.findById(id);
    if (!semester) {
      throw new AppError('Semester not found.', 404, 'NOT_FOUND');
    }

    semester.isActive = false;
    semester.archivedAt = new Date();
    await semester.save();

    // Clean up AI vector collection (best-effort)
    if (semester.vectorCollectionName) {
      aiProxy.deleteCollection(semester.vectorCollectionName).catch((err) =>
        console.error('⚠️  Failed to delete AI collection:', err.message)
      );
    }

    res.json({ success: true, message: 'Semester archived.', data: semester });
  } catch (error) {
    next(error);
  }
};

/**
 * DELETE /api/semesters/:id
 * Delete semester and cascade-delete all related data.
 */
const deleteSemester = async (req, res, next) => {
  try {
    const { id } = req.params;

    const semester = await Semester.findById(id);
    if (!semester) {
      throw new AppError('Semester not found.', 404, 'NOT_FOUND');
    }

    // Cascade deletes
    await Promise.all([
      Material.deleteMany({ semester: id }),
      ChatHistory.deleteMany({ semester: id }),
      Subject.deleteMany({ semester: id }),
    ]);

    // Clean up AI vector collection (best-effort)
    if (semester.vectorCollectionName) {
      aiProxy.deleteCollection(semester.vectorCollectionName).catch((err) =>
        console.error('⚠️  Failed to delete AI collection:', err.message)
      );
    }

    await Semester.findByIdAndDelete(id);

    res.json({ success: true, message: 'Semester and all related data deleted.' });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getAllSemesters,
  getActiveSemester,
  createSemester,
  activateSemester,
  archiveSemester,
  deleteSemester,
};
