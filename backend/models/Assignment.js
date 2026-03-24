const mongoose = require('mongoose');

const assignmentSchema = new mongoose.Schema(
  {
    courseId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Course',
      required: true,
    },
    title: {
      type: String,
      required: [true, 'Assignment title is required'],
      trim: true,
    },
    description: {
      type: String,
      required: [true, 'Assignment description is required'],
      trim: true,
    },
    deadline: {
      type: Date,
      required: [true, 'Deadline is required'],
    },
    totalMarks: {
      type: Number,
      required: [true, 'Total marks is required'],
      min: 1,
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Assignment', assignmentSchema);
