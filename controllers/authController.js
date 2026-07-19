/* ═══════════════════════════════════════════
   VERIDEX — CONTROLLERS/AUTHCONTROLLER.JS
   Register, Login, Verify, Reset Password
═══════════════════════════════════════════ */
const crypto = require('crypto');
const User   = require('../models/User');
const { generateToken } = require('../middleware/auth');
const { sendVerifyEmail, sendPasswordResetEmail } = require('../utils/email');

// ── REGISTER ──
exports.register = async (req, res) => {
  try {
    const { name, email, password } = req.body;

    // Check duplicate email
    if (await User.findOne({ email })) {
      return res.status(400).json({ success: false, message: 'Email already registered' });
    }

    // Create verify token
    const verifyToken  = crypto.randomBytes(32).toString('hex');
    const verifyExpiry = Date.now() + 24 * 60 * 60 * 1000; // 24h

    const user = await User.create({
      name, email, password,
      verifyToken, verifyTokenExpiry: verifyExpiry,
    });

    // Send verify email
    const verifyUrl = `${process.env.FRONTEND_URL}/verify-email.html?token=${verifyToken}`;
    try { await sendVerifyEmail(user, verifyUrl); }
    catch(e) { console.warn('Email send failed:', e.message); }

    res.status(201).json({
      success: true,
      message: 'Account created — check your email to verify',
      token:   generateToken(user._id),
      user: { id:user._id, name:user.name, email:user.email, role:user.role, isVerified:user.isVerified },
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Server error during registration' });
  }
};

// ── LOGIN ──
exports.login = async (req, res) => {
  try {
    const { email, password } = req.body;

    const user = await User.findOne({ email }).select('+password');
    if (!user || !(await user.comparePassword(password))) {
      return res.status(401).json({ success: false, message: 'Invalid email or password' });
    }

    res.json({
      success: true,
      token: generateToken(user._id),
      user: {
        id: user._id, name: user.name, email: user.email,
        role: user.role, isVerified: user.isVerified,
        stats: user.stats, signalWeights: user.signalWeights,
        feedbackCount: user.feedbackCount,
      },
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Server error during login' });
  }
};

// ── GET CURRENT USER ──
exports.getMe = async (req, res) => {
  res.json({
    success: true,
    user: {
      id: req.user._id, name: req.user.name, email: req.user.email,
      role: req.user.role, isVerified: req.user.isVerified,
      stats: req.user.stats, signalWeights: req.user.signalWeights,
      feedbackCount: req.user.feedbackCount, createdAt: req.user.createdAt,
    },
  });
};

// ── VERIFY EMAIL ──
exports.verifyEmail = async (req, res) => {
  try {
    const { token } = req.params;
    const user = await User.findOne({
      verifyToken: token,
      verifyTokenExpiry: { $gt: Date.now() },
    });
    if (!user) return res.status(400).json({ success: false, message: 'Invalid or expired token' });

    user.isVerified        = true;
    user.verifyToken       = undefined;
    user.verifyTokenExpiry = undefined;
    await user.save();

    res.json({ success: true, message: 'Email verified successfully' });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Verification failed' });
  }
};

// ── FORGOT PASSWORD ──
exports.forgotPassword = async (req, res) => {
  try {
    const user = await User.findOne({ email: req.body.email });
    if (!user) return res.json({ success: true, message: 'If that email exists, a reset link was sent' });

    const resetToken  = crypto.randomBytes(32).toString('hex');
    user.resetToken       = resetToken;
    user.resetTokenExpiry = Date.now() + 60 * 60 * 1000; // 1h
    await user.save();

    const resetUrl = `${process.env.FRONTEND_URL}/reset-password.html?token=${resetToken}`;
    try { await sendPasswordResetEmail(user, resetUrl); }
    catch(e) { console.warn('Reset email failed:', e.message); }

    res.json({ success: true, message: 'If that email exists, a reset link was sent' });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// ── RESET PASSWORD ──
exports.resetPassword = async (req, res) => {
  try {
    const user = await User.findOne({
      resetToken: req.params.token,
      resetTokenExpiry: { $gt: Date.now() },
    });
    if (!user) return res.status(400).json({ success: false, message: 'Invalid or expired reset token' });

    user.password          = req.body.password;
    user.resetToken        = undefined;
    user.resetTokenExpiry  = undefined;
    await user.save();

    res.json({ success: true, message: 'Password reset successfully — please log in' });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Reset failed' });
  }
};

// ── UPDATE SIGNAL WEIGHTS ──
exports.updateWeights = async (req, res) => {
  try {
    const { weights } = req.body;
    if (!weights || typeof weights !== 'object') {
      return res.status(400).json({ success: false, message: 'Weights object required' });
    }
    req.user.signalWeights = weights;
    await req.user.save();
    res.json({ success: true, message: 'Weights updated', weights: req.user.signalWeights });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Update failed' });
  }
};
