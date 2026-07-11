/* ═══════════════════════════════════════════
   VERIDEX — MIDDLEWARE/RATELIMITER.JS
   Rate limiting for all API routes
═══════════════════════════════════════════ */
const rateLimit = require('express-rate-limit');

// ── General API limit ──
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100,
  message: { success: false, message: 'Too many requests — try again in 15 minutes' },
  standardHeaders: true,
  legacyHeaders: false,
});

// ── Auth routes — stricter ──
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  message: { success: false, message: 'Too many auth attempts — try again in 15 minutes' },
  standardHeaders: true,
  legacyHeaders: false,
});

// ── Scan routes — medium ──
const scanLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 20,
  message: { success: false, message: 'Too many scans — slow down' },
  standardHeaders: true,
  legacyHeaders: false,
});

module.exports = { apiLimiter, authLimiter, scanLimiter };
