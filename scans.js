/* ═══════════════════════════════════════════
   VERIDEX — ROUTES/SCANS.JS
═══════════════════════════════════════════ */
const express = require('express');
const router  = express.Router();
const { protect } = require('../middleware/auth');
const { scanLimiter } = require('../middleware/rateLimiter');
const { validate, saveScanRules, feedbackRules } = require('../middleware/validate');
const {
  saveScan, getMyScan, getScan,
  submitFeedback, getMyStats, deleteScan,
} = require('../controllers/scanController');

// All scan routes require authentication
router.use(protect);

router.post('/',                 scanLimiter, saveScanRules, validate, saveScan);
router.get ('/',                 getMyScan);
router.get ('/stats',            getMyStats);
router.get ('/:id',              getScan);
router.post('/:id/feedback',     feedbackRules, validate, submitFeedback);
router.delete('/:id',            deleteScan);

module.exports = router;
