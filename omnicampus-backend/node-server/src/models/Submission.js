const mongoose = require('mongoose');

const submissionSchema = new mongoose.Schema(
  {
    assignment: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Assignment',
      required: [true, 'Assignment is required'],
    },
    student: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Student is required'],
    },
    fileName: {
      type: String,
      required: [true, 'File name is required'],
    },
    fileUrl: {
      type: String,
      required: [true, 'File URL is required'],
    },
    grade: {
      type: Number,
      default: null,
    },
    feedback: {
      type: String,
      default: '',
    },
  },
  { timestamps: true }
);

// A student can submit multiple times, or maybe just once. We'll let them submit multiple times and take the latest, or just keep a single submission by overwriting.
// Let's enforce one submission per student per assignment for simplicity, and they can overwrite it if needed (upsert).
submissionSchema.index({ assignment: 1, student: 1 }, { unique: true });

const Submission = mongoose.model('Submission', submissionSchema);
module.exports = Submission;
