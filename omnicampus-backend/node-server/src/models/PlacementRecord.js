const mongoose = require('mongoose');

const placementRecordSchema = new mongoose.Schema({
  company: { type: mongoose.Schema.Types.ObjectId, ref: 'Company', required: true },
  studentName: { type: String, required: true },
  studentEmail: { type: String },
  department: { type: String, required: true }, // e.g. "CSE", "ECE", "ME", "EEE"
  year: { type: Number, required: true }, // e.g. 2024, 2025
  packageLPA: { type: Number, required: true }, // Salary package in LPA
  status: { type: String, enum: ['Selected', 'Offered'], default: 'Selected' },
}, {
  timestamps: true,
});

module.exports = mongoose.model('PlacementRecord', placementRecordSchema);
