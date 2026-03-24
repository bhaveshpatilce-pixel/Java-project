const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const dotenv = require('dotenv');
const connectDB = require('./config/db');

// Load environment variables
dotenv.config();

// Initialize Express
const app = express();

// ── Middleware ──────────────────────────────
app.use(helmet());
app.use(cors());
app.use(express.json());

// ── API Routes ─────────────────────────────
app.use('/api/auth', require('./routes/auth'));
app.use('/api/courses', require('./routes/courses'));
app.use('/api/assignments', require('./routes/assignments'));
app.use('/api/submissions', require('./routes/submissions'));
app.use('/api/announcements', require('./routes/announcements'));

// ── Health Check ───────────────────────────
app.get('/', (req, res) => {
  res.json({ message: '🎓 Classroom Management System API is running!' });
});

// ── 404 Handler ────────────────────────────
app.use((req, res) => {
  res.status(404).json({ message: 'Route not found.' });
});

// ── Error Handler ──────────────────────────
app.use((err, req, res, next) => {
  console.error('Unhandled error:', err.stack);
  res.status(500).json({ message: 'Internal server error.' });
});

// ── Start Server ───────────────────────────
const PORT = process.env.PORT || 5000;

connectDB().then(() => {
  app.listen(PORT, () => {
    console.log(`\n🚀 Server running on port ${PORT}`);
    console.log(`📡 API Base: http://localhost:${PORT}/api\n`);
  });
});
