/* ═══════════════════════════════════════════
   VERIDEX — ROUTES/ADMIN.JS
═══════════════════════════════════════════ */
const express = require('express');
const router  = express.Router();
const { protect, adminOnly } = require('../middleware/auth');
const {
  getOverview, getAllUsers, getAllScans,
  updateUserRole, deleteUser, getTrend, sendDigest,
} = require('../controllers/adminController');

// All admin routes require auth + admin role
router.use(protect, adminOnly);

router.get ('/overview',          getOverview);
router.get ('/users',             getAllUsers);
router.get ('/scans',             getAllScans);
router.get ('/trend',             getTrend);
router.post('/digest',            sendDigest);
router.put ('/users/:id/role',    updateUserRole);
router.delete('/users/:id',       deleteUser);

module.exports = router;
