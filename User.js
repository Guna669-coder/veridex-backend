/* ═══════════════════════════════════════════
   VERIDEX — MODELS/USER.JS
   User schema with auth + profile
═══════════════════════════════════════════ */
const mongoose = require('mongoose');
const bcrypt   = require('bcryptjs');

const UserSchema = new mongoose.Schema({
  name: {
    type: String, required: [true, 'Name is required'],
    trim: true, minlength: 2, maxlength: 50,
  },
  email: {
    type: String, required: [true, 'Email is required'],
    unique: true, lowercase: true, trim: true,
    match: [/^\S+@\S+\.\S+$/, 'Please enter a valid email'],
  },
  password: {
    type: String, required: [true, 'Password is required'],
    minlength: 6, select: false, // never returned in queries by default
  },
  role: {
    type: String, enum: ['user', 'admin'], default: 'user',
  },
  isVerified: {
    type: Boolean, default: false,
  },
  verifyToken:       { type: String },
  verifyTokenExpiry: { type: Date },
  resetToken:        { type: String },
  resetTokenExpiry:  { type: Date },
  stats: {
    totalScans:     { type: Number, default: 0 },
    deepfakesFound: { type: Number, default: 0 },
    authenticFound: { type: Number, default: 0 },
    lastScanAt:     { type: Date },
  },
  signalWeights: {
    type: Object,
    default: {
      pixel:.12, fft:.12, ela:.12, face:.12, color:.08,
      hand:.16,  lighting:.12, background:.08, textgeo:.08,
    },
  },
  feedbackCount: { type: Number, default: 0 },
}, { timestamps: true });

// ── Hash password before save ──
UserSchema.pre('save', async function(next) {
  if (!this.isModified('password')) return next();
  this.password = await bcrypt.hash(this.password, 12);
  next();
});

// ── Compare password ──
UserSchema.methods.comparePassword = async function(candidatePassword) {
  return await bcrypt.compare(candidatePassword, this.password);
};

// ── Update stats after scan ──
UserSchema.methods.updateScanStats = async function(isFake) {
  this.stats.totalScans++;
  if (isFake) this.stats.deepfakesFound++;
  else        this.stats.authenticFound++;
  this.stats.lastScanAt = new Date();
  await this.save();
};

module.exports = mongoose.model('User', UserSchema);
