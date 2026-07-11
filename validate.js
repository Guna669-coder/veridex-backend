/* ═══════════════════════════════════════════
   VERIDEX — MIDDLEWARE/VALIDATE.JS
   Express-validator rules
═══════════════════════════════════════════ */
const { body, validationResult } = require('express-validator');

// ── Run validation and return errors ──
const validate = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      message: 'Validation failed',
      errors: errors.array().map(e => ({ field: e.path, message: e.msg })),
    });
  }
  next();
};

// ── Register rules ──
const registerRules = [
  body('name').trim().isLength({ min:2, max:50 }).withMessage('Name must be 2–50 characters'),
  body('email').isEmail().normalizeEmail().withMessage('Valid email required'),
  body('password').isLength({ min:6 }).withMessage('Password must be at least 6 characters'),
];

// ── Login rules ──
const loginRules = [
  body('email').isEmail().normalizeEmail().withMessage('Valid email required'),
  body('password').notEmpty().withMessage('Password is required'),
];

// ── Save scan rules ──
const saveScanRules = [
  body('verdict').isIn(['DEEPFAKE','AUTHENTIC']).withMessage('Invalid verdict'),
  body('fakeConf').isFloat({ min:0, max:100 }).withMessage('fakeConf must be 0–100'),
  body('signals').isObject().withMessage('Signals must be an object'),
];

// ── Feedback rules ──
const feedbackRules = [
  body('wasCorrect').isBoolean().withMessage('wasCorrect must be boolean'),
];

module.exports = { validate, registerRules, loginRules, saveScanRules, feedbackRules };
