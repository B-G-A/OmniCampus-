const mongoose = require('mongoose');

const interviewExperienceSchema = new mongoose.Schema({
  company: { type: mongoose.Schema.Types.ObjectId, ref: 'Company', required: true },
  student: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  role: { type: String, required: true },
  year: { type: Number, required: true },
  difficulty: { type: String, enum: ['Easy', 'Medium', 'Hard'], default: 'Medium' },
  experienceText: { type: String, required: true },
  status: { type: String, enum: ['Selected', 'Rejected'], default: 'Selected' },
}, {
  timestamps: true,
});

module.exports = mongoose.model('InterviewExperience', interviewExperienceSchema);
