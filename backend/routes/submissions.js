const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const Submission = require('../models/Submission');
const Assignment = require('../models/Assignment');
const Course = require('../models/Course');
const User = require('../models/User');

// ────────────────────────────────────────────
// POST /api/submissions — Submit assignment (student only)
// ────────────────────────────────────────────
router.post('/', auth, async (req, res) => {
  try {
    if (req.user.role !== 'student') {
      return res.status(403).json({ message: 'Only students can submit assignments.' });
    }

    const { assignmentId, content } = req.body;

    if (!assignmentId || !content) {
      return res.status(400).json({ message: 'Assignment ID and content are required.' });
    }

    // Check assignment exists
    const assignment = await Assignment.findById(assignmentId);
    if (!assignment) {
      return res.status(404).json({ message: 'Assignment not found.' });
    }

    // Check for duplicate submission
    const existing = await Submission.findOne({
      assignmentId,
      studentId: req.user.id,
    });
    if (existing) {
      return res.status(400).json({ message: 'You have already submitted this assignment.' });
    }

    // Get student name
    const student = await User.findById(req.user.id).select('name');

    const submission = await Submission.create({
      assignmentId,
      studentId: req.user.id,
      studentName: student.name,
      content,
    });

    res.status(201).json(submission);
  } catch (error) {
    console.error('Submit error:', error.message);
    res.status(500).json({ message: 'Server error.' });
  }
});

// ────────────────────────────────────────────
// GET /api/submissions/assignment/:assignmentId — Get submissions for an assignment
// ────────────────────────────────────────────
router.get('/assignment/:assignmentId', auth, async (req, res) => {
  try {
    const submissions = await Submission.find({ assignmentId: req.params.assignmentId }).sort({ createdAt: -1 });
    res.json(submissions);
  } catch (error) {
    console.error('Get submissions error:', error.message);
    res.status(500).json({ message: 'Server error.' });
  }
});

// ────────────────────────────────────────────
// GET /api/submissions/my — Get student's own submissions
// ────────────────────────────────────────────
router.get('/my', auth, async (req, res) => {
  try {
    const submissions = await Submission.find({ studentId: req.user.id })
      .populate('assignmentId', 'title totalMarks courseId deadline')
      .sort({ createdAt: -1 });
    res.json(submissions);
  } catch (error) {
    console.error('Get my submissions error:', error.message);
    res.status(500).json({ message: 'Server error.' });
  }
});

// ────────────────────────────────────────────
// GET /api/submissions/teacher — Get all submissions for teacher's courses
// ────────────────────────────────────────────
router.get('/teacher', auth, async (req, res) => {
  try {
    if (req.user.role !== 'teacher') {
      return res.status(403).json({ message: 'Only teachers can access this route.' });
    }

    // Get teacher's courses
    const courses = await Course.find({ teacherId: req.user.id });
    const courseIds = courses.map((c) => c._id);

    // Get assignments for those courses
    const assignments = await Assignment.find({ courseId: { $in: courseIds } });
    const assignmentIds = assignments.map((a) => a._id);

    // Get all submissions for those assignments
    const submissions = await Submission.find({ assignmentId: { $in: assignmentIds } })
      .populate('assignmentId', 'title totalMarks courseId')
      .sort({ createdAt: -1 });

    res.json(submissions);
  } catch (error) {
    console.error('Get teacher submissions error:', error.message);
    res.status(500).json({ message: 'Server error.' });
  }
});

// ────────────────────────────────────────────
// PUT /api/submissions/:id/grade — Grade a submission (teacher only)
// ────────────────────────────────────────────
router.put('/:id/grade', auth, async (req, res) => {
  try {
    if (req.user.role !== 'teacher') {
      return res.status(403).json({ message: 'Only teachers can grade submissions.' });
    }

    const { marks, feedback } = req.body;

    if (marks === undefined || marks === null || marks === '') {
      return res.status(400).json({ message: 'Marks are required.' });
    }

    const submission = await Submission.findById(req.params.id);
    if (!submission) {
      return res.status(404).json({ message: 'Submission not found.' });
    }

    submission.marks = Number(marks);
    submission.feedback = feedback || '';
    submission.gradedAt = new Date();
    await submission.save();

    res.json(submission);
  } catch (error) {
    console.error('Grade error:', error.message);
    res.status(500).json({ message: 'Server error.' });
  }
});

module.exports = router;
