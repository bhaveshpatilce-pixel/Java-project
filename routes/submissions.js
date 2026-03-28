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
    const submissions = await Submission.find({ assignmentId: req.params.assignmentId })
      .populate('studentId', 'name email')
      .sort({ createdAt: -1 });
    res.json(submissions);
  } catch (error) {
    console.error('Get submissions error:', error.message);
    res.status(500).json({ message: 'Server error.' });
  }
});

// ────────────────────────────────────────────
// GET /api/submissions/student/me — Get student's own submissions
// ────────────────────────────────────────────
router.get('/student/me', auth, async (req, res) => {
  try {
    const submissions = await Submission.find({ studentId: req.user.id })
      .populate({
        path: 'assignmentId',
        select: 'title totalMarks courseId deadline',
        populate: { path: 'courseId', select: 'name' }
      })
      .sort({ createdAt: -1 });
    res.json(submissions);
  } catch (error) {
    console.error('Get student submissions error:', error.message);
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
      .populate('studentId', 'name email')
      .sort({ createdAt: -1 });

    res.json(submissions);
  } catch (error) {
    console.error('Get teacher submissions error:', error.message);
    res.status(500).json({ message: 'Server error.' });
  }
});

// ────────────────────────────────────────────
// GET /api/submissions/:id — Get single submission
// ────────────────────────────────────────────
router.get('/:id', auth, async (req, res) => {
  try {
    const submission = await Submission.findById(req.params.id)
      .populate('assignmentId', 'title totalMarks courseId deadline');
    
    if (!submission) {
      return res.status(404).json({ message: 'Submission not found.' });
    }
    res.json(submission);
  } catch (error) {
    console.error('Get submission error:', error.message);
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

const { spawn } = require('child_process');
const path = require('path');

// Helper to run Java components
const runJava = (className, args = []) => {
  return new Promise((resolve, reject) => {
    // Classpath should be the root of the project to find the backend.java package
    const rootPath = path.resolve(__dirname, '..');
    const child = spawn('java', ['-cp', rootPath, `backend.java.${className}`, ...args.map(a => String(a))]);
    
    let output = '';
    let errorOutput = '';

    child.stdout.on('data', (data) => output += data.toString());
    child.stderr.on('data', (data) => errorOutput += data.toString());

    child.on('close', (code) => {
      if (code !== 0) {
        console.error(`Java ${className} Error:`, errorOutput);
        return reject(`Java process exited with code ${code}`);
      }
      resolve(output.trim());
    });
  });
};

// ────────────────────────────────────────────
// GET /api/submissions/assignment/:assignmentId/stats — Hybrid Java Stats
// ────────────────────────────────────────────
router.get('/assignment/:assignmentId/stats', auth, async (req, res) => {
  try {
    const submissions = await Submission.find({ assignmentId: req.params.assignmentId, marks: { $ne: null } });
    
    if (submissions.length === 0) {
      return res.status(404).json({ message: 'No graded submissions found for stats.' });
    }

    const marks = submissions.map(s => s.marks);
    
    // Call Java Stats Engine
    const statsResult = await runJava('StatsEngine', marks);
    res.json(JSON.parse(statsResult));
  } catch (error) {
    console.error('Stats error:', error);
    res.status(500).json({ message: 'Error calculating stats with Java.' });
  }
});

// ────────────────────────────────────────────
// GET /api/submissions/assignment/:assignmentId/export — Hybrid Java CSV Export
// ────────────────────────────────────────────
router.get('/assignment/:assignmentId/export', auth, async (req, res) => {
  try {
    const submissions = await Submission.find({ assignmentId: req.params.assignmentId })
      .populate('studentId', 'name');

    if (submissions.length === 0) {
      return res.status(404).json({ message: 'No submissions found to export.' });
    }

    const exportData = [];
    submissions.forEach(s => {
      exportData.push(s.studentName || 'Unknown Student');
      exportData.push(s.marks || 'Not Graded');
    });

    // Call Java CSV Exporter
    const csvContent = await runJava('CsvExporter', exportData);
    
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename=assignment_${req.params.assignmentId}.csv`);
    res.send(csvContent);
  } catch (error) {
    console.error('Export error:', error);
    res.status(500).json({ message: 'Error exporting CSV with Java.' });
  }
});

module.exports = router;

