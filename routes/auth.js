/* ═══════════════════════════════════════════
   VERIDEX — ROUTES/AUTH.JS
═══════════════════════════════════════════ */
const express = require('express');
const router  = express.Router();
const { protect } = require('../middleware/auth');
const { authLimiter } = require('../middleware/rateLimiter');
const { validate, registerRules, loginRules } = require('../middleware/validate');
const {
  register, login, getMe, verifyEmail,
  forgotPassword, resetPassword, updateWeights,
} = require('../controllers/authController');

router.post('/register',        authLimiter, registerRules, validate, register);
router.post('/login',           authLimiter, loginRules,    validate, login);
router.get ('/me',              protect, getMe);
router.get ('/verify/:token',   verifyEmail);
router.post('/forgot-password', authLimiter, forgotPassword);
router.post('/reset-password/:token', resetPassword);
router.put ('/weights',         protect, updateWeights);

module.exports = router;