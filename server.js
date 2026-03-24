const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const dotenv = require('dotenv');
const path = require('path');
const connectDB = require('./config/db');

// Load environment variables
dotenv.config();

// Initialize Express
const app = express();

// ── Middleware ──────────────────────────────
app.use(helmet({
  contentSecurityPolicy: false, // Disable for easier dev/deploy if using external assets
}));
app.use(cors());
app.use(express.json());

// Serve Static Frontend Files
app.use(express.static(path.join(__dirname, 'public')));

// ── API Routes ─────────────────────────────
app.use('/api/auth', require('./routes/auth'));
app.use('/api/courses', require('./routes/courses'));
app.use('/api/assignments', require('./routes/assignments'));
app.use('/api/submissions', require('./routes/submissions'));
app.use('/api/announcements', require('./routes/announcements'));

// ── Fallback to Frontend index.html or 404 ────────────────
app.use((req, res) => {
  if (req.method === 'GET' && !req.originalUrl.startsWith('/api')) {
    res.sendFile(path.resolve(__dirname, 'public', 'index.html'));
  } else {
    res.status(404).json({ message: 'API Route not found.' });
  }
});

app.use((err, req, res, next) => {
  console.error('Unhandled error:', err.stack);
  res.status(500).json({ message: 'Internal server error.' });
});

const PORT = process.env.PORT || 5000;

connectDB().then(() => {
  app.listen(PORT, () => {
    console.log(`\n🚀 Server running on port ${PORT}`);
    console.log(`📡 API Base: http://localhost:${PORT}/api\n`);
  });
});
