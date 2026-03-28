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

const JavaBridge = require('../backend/JavaBridge');

// ────────────────────────────────────────────
// GET /api/submissions/stats-java — Get performance stats via Java Engine
// ────────────────────────────────────────────
router.get('/stats-java', auth, async (req, res) => {
  try {
    if (req.user.role !== 'teacher') {
      return res.status(403).json({ message: 'Only teachers can access statistics.' });
    }

    // Get all submissions for teacher's courses
    const courses = await Course.find({ teacherId: req.user.id });
    const courseIds = courses.map((c) => c._id);
    const assignments = await Assignment.find({ courseId: { $in: courseIds } });
    const assignmentIds = assignments.map((a) => a._id);
    const submissions = await Submission.find({ assignmentId: { $in: assignmentIds } });

    if (submissions.length === 0) {
      return res.json({ message: 'No submissions yet.' });
    }

    const data = submissions.map(s => ({ studentName: s.studentName, marks: s.marks || 0 }));
    
    // --- CALL JAVA ENGINE ---
    const statsOutput = await JavaBridge.getStats(data);
    res.json({ output: statsOutput });
  } catch (error) {
    console.error('Java Stats error:', error.message);
    res.status(500).json({ message: 'Java Engine error.', error: error.message });
  }
});

// ────────────────────────────────────────────
// GET /api/submissions/export-java — Export to CSV via Java Engine
// ────────────────────────────────────────────
router.get('/export-java', auth, async (req, res) => {
  try {
    if (req.user.role !== 'teacher') {
      return res.status(403).json({ message: 'Only teachers can export data.' });
    }

    const courses = await Course.find({ teacherId: req.user.id });
    const courseIds = courses.map((c) => c._id);
    const assignments = await Assignment.find({ courseId: { $in: courseIds } });
    const assignmentIds = assignments.map((a) => a._id);
    const submissions = await Submission.find({ assignmentId: { $in: assignmentIds } })
      .populate('assignmentId', 'title totalMarks');

    if (submissions.length === 0) {
      return res.status(400).json({ message: 'No submissions to export.' });
    }

    const data = submissions.map(s => ({
      name: s.studentName,
      assignment: s.assignmentId?.title || 'Unknown',
      marks: s.marks ?? '—',
      total: s.assignmentId?.totalMarks || 100,
      status: s.marks !== null ? 'Graded' : 'Pending'
    }));

    const outputPath = path.join(__dirname, `../public/exports/report_${Date.now()}.csv`);
    
    // Ensure export directory exists
    const exportDir = path.dirname(outputPath);
    if (!require('fs').existsSync(exportDir)) require('fs').mkdirSync(exportDir, { recursive: true });

    // --- CALL JAVA ENGINE ---
    await JavaBridge.exportCSV(data, outputPath);

    res.json({ 
      message: 'Export successful via Java Engine', 
      downloadUrl: `/exports/${path.basename(outputPath)}` 
    });
  } catch (error) {
    console.error('Java Export error:', error.message);
    res.status(500).json({ message: 'Java Engine error.', error: error.message });
  }
});

module.exports = router;

