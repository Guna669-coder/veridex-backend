/* ═══════════════════════════════════════════
   VERIDEX — SERVER.JS
   Main Express server entry point
═══════════════════════════════════════════ */
require('dotenv').config();
const express = require('express');
const helmet  = require('helmet');
const cors    = require('cors');
const morgan  = require('morgan');

const connectDB           = require('./config/db');
const { apiLimiter }      = require('./middleware/rateLimiter');
const authRoutes           = require('./routes/auth');
const scanRoutes           = require('./routes/scans');
const adminRoutes          = require('./routes/admin');

// ── Connect to MongoDB ──
connectDB();

const app = express();

// ── Security Middleware ──
app.use(helmet());
app.use(cors({
  origin: [
    process.env.FRONTEND_URL,
    'http://localhost:3000',
    'http://127.0.0.1:5500',  // Live Server for local dev
  ],
  credentials: true,
}));

// ── Body Parsing ──
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// ── Logging ──
if (process.env.NODE_ENV === 'development') app.use(morgan('dev'));

// ── Global Rate Limit ──
app.use('/api', apiLimiter);

// ── Health Check ──
app.get('/', (req, res) => {
  res.json({
    success: true,
    message: 'VERIDEX API is running',
    version: '5.0',
    env:     process.env.NODE_ENV,
  });
});

app.get('/health', (req, res) => {
  res.json({ status: 'ok', uptime: process.uptime() });
});

// ── API Routes ──
app.use('/api/auth',  authRoutes);
app.use('/api/scans', scanRoutes);
app.use('/api/admin', adminRoutes);

// ── 404 Handler ──
app.use((req, res) => {
  res.status(404).json({ success: false, message: `Route ${req.originalUrl} not found` });
});

// ── Global Error Handler ──
app.use((err, req, res, next) => {
  console.error('🔴 Error:', err.message);
  res.status(err.status || 500).json({
    success: false,
    message: process.env.NODE_ENV === 'development' ? err.message : 'Internal server error',
  });
});

// ── Start Server ──
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`
  ╔══════════════════════════════════════╗
  ║   VERIDEX BACKEND v5.0              ║
  ║   Running on port ${PORT}              ║
  ║   Mode: ${process.env.NODE_ENV || 'development'}              ║
  ╚══════════════════════════════════════╝`);
});

module.exports = app;
