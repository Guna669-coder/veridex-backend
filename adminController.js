/* ═══════════════════════════════════════════
   VERIDEX — CONTROLLERS/ADMINCONTROLLER.JS
   Admin panel — all users, all scans, stats
═══════════════════════════════════════════ */
const User = require('../models/User');
const Scan = require('../models/Scan');
const { sendAdminDigest } = require('../utils/email');

// ── PLATFORM OVERVIEW ──
exports.getOverview = async (req, res) => {
  try {
    const [
      totalUsers, totalScans, totalFakes, totalReal, recentUsers, recentScans
    ] = await Promise.all([
      User.countDocuments(),
      Scan.countDocuments(),
      Scan.countDocuments({ isFake: true }),
      Scan.countDocuments({ isFake: false }),
      User.find().sort({ createdAt:-1 }).limit(5).select('name email createdAt stats role'),
      Scan.find().sort({ createdAt:-1 }).limit(10)
          .populate('user','name email')
          .select('fileName verdict fakeConf createdAt user'),
    ]);

    // Avg confidence
    const confAgg = await Scan.aggregate([
      { $group: { _id: null, avg: { $avg: '$fakeConf' } } }
    ]);
    const avgConf = confAgg[0]?.avg?.toFixed(1) || '0';

    res.json({
      success: true,
      overview: { totalUsers, totalScans, totalFakes, totalReal, avgConf },
      recentUsers,
      recentScans,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Overview fetch failed' });
  }
};

// ── ALL USERS ──
exports.getAllUsers = async (req, res) => {
  try {
    const page  = parseInt(req.query.page)  || 1;
    const limit = parseInt(req.query.limit) || 20;
    const skip  = (page-1)*limit;

    const [users, total] = await Promise.all([
      User.find().sort({ createdAt:-1 }).skip(skip).limit(limit)
          .select('-password -verifyToken -resetToken'),
      User.countDocuments(),
    ]);

    res.json({
      success: true, users,
      pagination: { page, limit, total, pages: Math.ceil(total/limit) },
    });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Failed to fetch users' });
  }
};

// ── ALL SCANS ──
exports.getAllScans = async (req, res) => {
  try {
    const page   = parseInt(req.query.page)    || 1;
    const limit  = parseInt(req.query.limit)   || 20;
    const skip   = (page-1)*limit;
    const filter = {};
    if (req.query.verdict) filter.verdict = req.query.verdict;

    const [scans, total] = await Promise.all([
      Scan.find(filter).sort({ createdAt:-1 }).skip(skip).limit(limit)
          .populate('user','name email'),
      Scan.countDocuments(filter),
    ]);

    res.json({
      success: true, scans,
      pagination: { page, limit, total, pages: Math.ceil(total/limit) },
    });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Failed to fetch scans' });
  }
};

// ── UPDATE USER ROLE ──
exports.updateUserRole = async (req, res) => {
  try {
    const { role } = req.body;
    if (!['user','admin'].includes(role)) {
      return res.status(400).json({ success:false, message:'Invalid role' });
    }
    const user = await User.findByIdAndUpdate(req.params.id, { role }, { new:true }).select('-password');
    if (!user) return res.status(404).json({ success:false, message:'User not found' });
    res.json({ success:true, user });
  } catch (err) {
    res.status(500).json({ success:false, message:'Update failed' });
  }
};

// ── DELETE USER ──
exports.deleteUser = async (req, res) => {
  try {
    if (req.params.id === req.user._id.toString()) {
      return res.status(400).json({ success:false, message:'Cannot delete yourself' });
    }
    await Promise.all([
      User.findByIdAndDelete(req.params.id),
      Scan.deleteMany({ user: req.params.id }),
    ]);
    res.json({ success:true, message:'User and all scans deleted' });
  } catch (err) {
    res.status(500).json({ success:false, message:'Delete failed' });
  }
};

// ── PLATFORM TREND (7-day) ──
exports.getTrend = async (req, res) => {
  try {
    const days = parseInt(req.query.days) || 7;
    const from = new Date(Date.now() - days*24*60*60*1000);

    const trend = await Scan.aggregate([
      { $match: { createdAt: { $gte: from } } },
      { $group: {
        _id: { $dateToString: { format:'%Y-%m-%d', date:'$createdAt' } },
        total: { $sum:1 },
        fakes: { $sum: { $cond:['$isFake',1,0] } },
        reals: { $sum: { $cond:['$isFake',0,1] } },
      }},
      { $sort: { _id:1 } },
    ]);

    res.json({ success:true, trend });
  } catch (err) {
    res.status(500).json({ success:false, message:'Trend fetch failed' });
  }
};

// ── SEND ADMIN DIGEST EMAIL ──
exports.sendDigest = async (req, res) => {
  try {
    const weekAgo = new Date(Date.now() - 7*24*60*60*1000);
    const [totalScans, fakes, reals, newUsers, confAgg] = await Promise.all([
      Scan.countDocuments({ createdAt:{ $gte:weekAgo } }),
      Scan.countDocuments({ createdAt:{ $gte:weekAgo }, isFake:true }),
      Scan.countDocuments({ createdAt:{ $gte:weekAgo }, isFake:false }),
      User.countDocuments({ createdAt:{ $gte:weekAgo } }),
      Scan.aggregate([{ $group:{ _id:null, avg:{ $avg:'$fakeConf' } } }]),
    ]);

    await sendAdminDigest({
      totalScans, fakes, reals, newUsers,
      avgConf: confAgg[0]?.avg?.toFixed(1) || '0',
    });

    res.json({ success:true, message:'Digest sent to admin email' });
  } catch (err) {
    res.status(500).json({ success:false, message:'Digest failed' });
  }
};
