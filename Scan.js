/* ═══════════════════════════════════════════
   VERIDEX — MODELS/SCAN.JS
   Scan history schema per user
═══════════════════════════════════════════ */
const mongoose = require('mongoose');

const ScanSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User', required: true, index: true,
  },
  fileName:    { type: String, default: 'unknown' },
  fileSize:    { type: Number },              // bytes
  fileMimeType:{ type: String },

  // ── Verdict ──
  verdict:     { type: String, enum: ['DEEPFAKE','AUTHENTIC'], required: true },
  isFake:      { type: Boolean, required: true },
  fakeConf:    { type: Number, required: true },  // 0–100
  realConf:    { type: Number, required: true },

  // ── Signal Scores ──
  signals: {
    pixel:      { type: Number },
    fft:        { type: Number },
    ela:        { type: Number },
    face:       { type: Number },
    color:      { type: Number },
    hand:       { type: Number },
    lighting:   { type: Number },
    background: { type: Number },
    textgeo:    { type: Number },
  },

  // ── Weights used at time of scan ──
  weightsUsed: { type: Object },

  // ── AI Analysis ──
  aiVerdict: {
    explanation:    { type: String },
    likelyGenerator:{ type: String },
    generatorReason:{ type: String },
    weightReasoning:{ type: String },
  },

  // ── User Feedback ──
  feedback: {
    given:      { type: Boolean, default: false },
    wasCorrect: { type: Boolean },
    givenAt:    { type: Date },
  },

  analysisTimeMs: { type: Number },  // how long analysis took
}, { timestamps: true });

// ── Index for fast queries ──
ScanSchema.index({ user: 1, createdAt: -1 });
ScanSchema.index({ verdict: 1 });
ScanSchema.index({ createdAt: -1 });

module.exports = mongoose.model('Scan', ScanSchema);
