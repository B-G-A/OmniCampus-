const mongoose = require('mongoose');

const roleSchema = new mongoose.Schema({
  title: { type: String, required: true },
  packageLPA: { type: Number, required: true },
  description: { type: String, default: '' },
});

const companySchema = new mongoose.Schema({
  name: { type: String, required: true, unique: true },
  logo: { type: String, default: '' },
  website: { type: String, default: '' },
  description: { type: String, default: '' },
  rolesOffered: [roleSchema],
  eligibility: {
    minCGPA: { type: Number, default: 0 },
    allowedBranches: [{ type: String }],
<<<<<<< HEAD
=======
    maxBacklogs: { type: Number, default: 0 },
>>>>>>> c6bda4a (Fix AI resume parsing normalization and chat fallback message, add features)
  },
  recruitmentProcess: [{ type: String }],
  visitedYears: [{ type: Number }],
}, {
  timestamps: true,
});

module.exports = mongoose.model('Company', companySchema);
