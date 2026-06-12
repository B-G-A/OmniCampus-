const mongoose = require('mongoose');

const assignmentSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: [true, 'Assignment title is required'],
      trim: true,
    },
    description: {
      type: String,
      default: '',
    },
    subject: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Subject',
      required: [true, 'Subject is required'],
    },
    teacher: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Teacher is required'],
    },
    dueDate: {
      type: Date,
      required: [true, 'Due date is required'],
    },
    fileName: {
      type: String,
      default: null,
    },
    fileUrl: {
      type: String,
      default: null,
    },
  },
  { timestamps: true }
);

const Assignment = mongoose.model('Assignment', assignmentSchema);
module.exports = Assignment;
