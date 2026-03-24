const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const Course = require('../models/Course');
const Enrollment = require('../models/Enrollment');
const User = require('../models/User');

// Helper: Generate a unique 6-char course code
const generateCode = async () => {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let code, exists;
  do {
    code = '';
    for (let i = 0; i < 6; i++) {
      code += chars[Math.floor(Math.random() * chars.length)];
    }
    exists = await Course.findOne({ code });
  } while (exists);
  return code;
};

// ────────────────────────────────────────────
// POST /api/courses — Create a new course (teacher only)
// ────────────────────────────────────────────
router.post('/', auth, async (req, res) => {
  try {
    if (req.user.role !== 'teacher') {
      return res.status(403).json({ message: 'Only teachers can create courses.' });
    }

    const { name, description } = req.body;
    if (!name || !description) {
      return res.status(400).json({ message: 'Course name and description are required.' });
    }

    const code = await generateCode();

    const course = await Course.create({
      name,
      description,
      teacherId: req.user.id,
      code,
    });

    res.status(201).json(course);
  } catch (error) {
    console.error('Create course error:', error.message);
    res.status(500).json({ message: 'Server error.' });
  }
});

// ────────────────────────────────────────────
// GET /api/courses/my — Get teacher's courses
// ────────────────────────────────────────────
router.get('/my', auth, async (req, res) => {
  try {
    const courses = await Course.find({ teacherId: req.user.id }).sort({ createdAt: -1 });
    res.json(courses);
  } catch (error) {
    console.error('Get my courses error:', error.message);
    res.status(500).json({ message: 'Server error.' });
  }
});

// ────────────────────────────────────────────
// GET /api/courses/enrolled/me — Get student's enrolled courses
// ────────────────────────────────────────────
router.get('/enrolled/me', auth, async (req, res) => {
  try {
    const enrollments = await Enrollment.find({ userId: req.user.id });
    const courseIds = enrollments.map((e) => e.courseId);
    const courses = await Course.find({ _id: { $in: courseIds } }).sort({ createdAt: -1 });
    res.json(courses);
  } catch (error) {
    console.error('Get enrolled courses error:', error.message);
    res.status(500).json({ message: 'Server error.' });
  }
});

// ────────────────────────────────────────────
// GET /api/courses/code/:code — Find course by code
// ────────────────────────────────────────────
router.get('/code/:code', auth, async (req, res) => {
  try {
    const course = await Course.findOne({ code: req.params.code.toUpperCase() });
    if (!course) {
      return res.status(404).json({ message: 'No course found with that code.' });
    }
    res.json(course);
  } catch (error) {
    console.error('Find by code error:', error.message);
    res.status(500).json({ message: 'Server error.' });
  }
});

// ────────────────────────────────────────────
// GET /api/courses/:id — Get course by ID
// ────────────────────────────────────────────
router.get('/:id', auth, async (req, res) => {
  try {
    const course = await Course.findById(req.params.id);
    if (!course) {
      return res.status(404).json({ message: 'Course not found.' });
    }
    res.json(course);
  } catch (error) {
    console.error('Get course error:', error.message);
    res.status(500).json({ message: 'Server error.' });
  }
});

// ────────────────────────────────────────────
// POST /api/courses/:id/enroll — Enroll student in course
// ────────────────────────────────────────────
router.post('/:id/enroll', auth, async (req, res) => {
  try {
    if (req.user.role !== 'student') {
      return res.status(403).json({ message: 'Only students can enroll in courses.' });
    }

    const course = await Course.findById(req.params.id);
    if (!course) {
      return res.status(404).json({ message: 'Course not found.' });
    }

    // Check if already enrolled
    const existing = await Enrollment.findOne({
      courseId: req.params.id,
      userId: req.user.id,
    });
    if (existing) {
      return res.status(400).json({ message: 'You are already enrolled in this course.' });
    }

    await Enrollment.create({
      courseId: req.params.id,
      userId: req.user.id,
    });

    res.json({ message: 'Successfully enrolled in the course.' });
  } catch (error) {
    console.error('Enroll error:', error.message);
    res.status(500).json({ message: 'Server error.' });
  }
});

// ────────────────────────────────────────────
// GET /api/courses/:id/students — Get enrolled students
// ────────────────────────────────────────────
router.get('/:id/students', auth, async (req, res) => {
  try {
    const enrollments = await Enrollment.find({ courseId: req.params.id });
    const studentIds = enrollments.map((e) => e.userId);
    const students = await User.find({ _id: { $in: studentIds } }).select('-password');
    res.json(students);
  } catch (error) {
    console.error('Get students error:', error.message);
    res.status(500).json({ message: 'Server error.' });
  }
});

module.exports = router;
