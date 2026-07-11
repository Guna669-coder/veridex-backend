/* ═══════════════════════════════════════════
   VERIDEX — CONTROLLERS/SCANCONTROLLER.JS
   Save scan, list history, feedback, stats
═══════════════════════════════════════════ */
const Scan = require('../models/Scan');
const User = require('../models/User');
const { sendScanResultEmail } = require('../utils/email');

// ── SAVE SCAN ──
exports.saveScan = async (req, res) => {
  try {
    const {
      fileName, fileSize, fileMimeType,
      verdict, isFake, fakeConf,
      signals, weightsUsed, aiVerdict,
      analysisTimeMs,
    } = req.body;

    const scan = await Scan.create({
      user:         req.user._id,
      fileName:     fileName || 'unknown',
      fileSize, fileMimeType,
      verdict, isFake,
      fakeConf,
      realConf:     parseFloat((100 - fakeConf).toFixed(2)),
      signals,
      weightsUsed:  weightsUsed || req.user.signalWeights,
      aiVerdict,
      analysisTimeMs,
    });

    // Update user stats
    await req.user.updateScanStats(isFake);

    // Send email notification (non-blocking)
    sendScanResultEmail(req.user, scan).catch(e => console.warn('Scan email failed:', e.message));

    res.status(201).json({ success: true, scan });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Failed to save scan' });
  }
};

// ── GET USER SCAN HISTORY ──
exports.getMyScan = async (req, res) => {
  try {
    const page  = parseInt(req.query.page)  || 1;
    const limit = parseInt(req.query.limit) || 20;
    const skip  = (page - 1) * limit;

    const filter = { user: req.user._id };
    if (req.query.verdict) filter.verdict = req.query.verdict;

    const [scans, total] = await Promise.all([
      Scan.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit).lean(),
      Scan.countDocuments(filter),
    ]);

    res.json({
      success: true,
      scans,
      pagination: { page, limit, total, pages: Math.ceil(total / limit) },
    });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Failed to fetch scans' });
  }
};

// ── GET SINGLE SCAN ──
exports.getScan = async (req, res) => {
  try {
    const scan = await Scan.findOne({ _id: req.params.id, user: req.user._id });
    if (!scan) return res.status(404).json({ success: false, message: 'Scan not found' });
    res.json({ success: true, scan });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Failed to fetch scan' });
  }
};

// ── SUBMIT FEEDBACK ──
exports.submitFeedback = async (req, res) => {
  try {
    const { wasCorrect } = req.body;
    const scan = await Scan.findOne({ _id: req.params.id, user: req.user._id });
    if (!scan) return res.status(404).json({ success: false, message: 'Scan not found' });
    if (scan.feedback.given) return res.status(400).json({ success: false, message: 'Feedback already submitted' });

    scan.feedback = { given: true, wasCorrect, givenAt: new Date() };
    await scan.save();

    // Adjust user signal weights based on feedback
    const weights    = { ...req.user.signalWeights };
    const LEARN_RATE = 0.018;
    const SIG_NAMES  = ['pixel','fft','ela','face','color','hand','lighting','background','textgeo'];

    SIG_NAMES.forEach(k => {
      const score = scan.signals?.[k] || 0;
      const fired = score > 45;
      if (wasCorrect) {
        if (scan.isFake  &&  fired) weights[k] = Math.min(0.30, weights[k] + LEARN_RATE*(score/100));
        if (!scan.isFake && !fired) weights[k] = Math.min(0.30, weights[k] + LEARN_RATE*0.5);
      } else {
        if (scan.isFake  &&  fired) weights[k] = Math.max(0.02, weights[k] - LEARN_RATE*(score/100));
        if (!scan.isFake && !fired) weights[k] = Math.max(0.02, weights[k] - LEARN_RATE*0.5);
      }
    });

    // Normalise weights
    const total = Object.values(weights).reduce((s,v)=>s+v,0);
    SIG_NAMES.forEach(k => weights[k] = parseFloat((weights[k]/total).toFixed(4)));

    req.user.signalWeights = weights;
    req.user.feedbackCount++;
    await req.user.save();

    res.json({ success: true, message: 'Feedback recorded', updatedWeights: weights });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Feedback failed' });
  }
};

// ── USER DASHBOARD STATS ──
exports.getMyStats = async (req, res) => {
  try {
    const userId = req.user._id;

    // Aggregation for signal averages
    const signalAvgs = await Scan.aggregate([
      { $match: { user: userId } },
      { $group: {
        _id: null,
        avgPixel:  { $avg: '$signals.pixel' },
        avgFft:    { $avg: '$signals.fft' },
        avgEla:    { $avg: '$signals.ela' },
        avgFace:   { $avg: '$signals.face' },
        avgColor:  { $avg: '$signals.color' },
        avgHand:   { $avg: '$signals.hand' },
        avgLight:  { $avg: '$signals.lighting' },
        avgBg:     { $avg: '$signals.background' },
        avgText:   { $avg: '$signals.textgeo' },
        avgFakeConf: { $avg: '$fakeConf' },
      }}
    ]);

    // 14-day trend
    const twoWeeksAgo = new Date(Date.now() - 14*24*60*60*1000);
    const trend = await Scan.aggregate([
      { $match: { user: userId, createdAt: { $gte: twoWeeksAgo } } },
      { $group: {
        _id: { $dateToString: { format:'%Y-%m-%d', date:'$createdAt' } },
        total: { $sum: 1 },
        fakes: { $sum: { $cond: ['$isFake',1,0] } },
      }},
      { $sort: { _id: 1 } },
    ]);

    res.json({
      success: true,
      stats: req.user.stats,
      signalAverages: signalAvgs[0] || {},
      trend,
      weights: req.user.signalWeights,
      feedbackCount: req.user.feedbackCount,
    });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Stats fetch failed' });
  }
};

// ── DELETE SCAN ──
exports.deleteScan = async (req, res) => {
  try {
    const scan = await Scan.findOneAndDelete({ _id: req.params.id, user: req.user._id });
    if (!scan) return res.status(404).json({ success: false, message: 'Scan not found' });
    res.json({ success: true, message: 'Scan deleted' });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Delete failed' });
  }
};
