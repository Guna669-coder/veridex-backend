/* ═══════════════════════════════════════════
   VERIDEX — UTILS/EMAIL.JS
   Nodemailer email helper (Gmail SMTP)
═══════════════════════════════════════════ */
const nodemailer = require('nodemailer');

// ── Create transporter ──
const transporter = nodemailer.createTransport({
  host:   process.env.EMAIL_HOST,
  port:   parseInt(process.env.EMAIL_PORT),
  secure: false, // TLS
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
});

// ── Verify connection on boot ──
transporter.verify((err) => {
  if (err) console.warn('⚠ Email transporter error:', err.message);
  else     console.log('✅ Email transporter ready');
});

// ── Base HTML template ──
const baseTemplate = (title, content) => `
<!DOCTYPE html>
<html>
<head>
<meta charset="UTF-8">
<style>
  body { margin:0; padding:0; background:#03070f; font-family:'Courier New',monospace; }
  .wrap { max-width:580px; margin:0 auto; background:#060c18; border:1px solid rgba(0,210,255,.15); }
  .header { padding:32px; border-bottom:1px solid rgba(0,210,255,.1); text-align:center; }
  .logo { font-size:32px; letter-spacing:8px; color:#00d2ff; margin-bottom:4px; }
  .logo-sub { font-size:10px; letter-spacing:4px; color:#4a6880; }
  .body { padding:32px; }
  .title { font-size:20px; letter-spacing:3px; color:#c5ddf5; margin-bottom:16px; }
  p { font-size:13px; color:#4a6880; line-height:1.8; margin-bottom:12px; }
  .btn { display:inline-block; padding:12px 32px; background:#00d2ff; color:#000;
         font-weight:700; letter-spacing:2px; font-size:11px; text-decoration:none; margin:16px 0; }
  .code { background:#03070f; border:1px solid rgba(0,210,255,.2); padding:14px 20px;
          color:#00d2ff; font-size:18px; letter-spacing:6px; text-align:center; margin:16px 0; }
  .footer { padding:20px 32px; border-top:1px solid rgba(0,210,255,.1);
            font-size:10px; letter-spacing:2px; color:#2d4a68; text-align:center; }
</style>
</head>
<body>
<div class="wrap">
  <div class="header">
    <div class="logo">VERIDEX</div>
    <div class="logo-sub">NEURAL FORENSIC ENGINE</div>
  </div>
  <div class="body">
    <div class="title">${title}</div>
    ${content}
  </div>
  <div class="footer">© 2025 VERIDEX · ALL ANALYSIS RUNS LOCALLY · NO DATA STORED</div>
</div>
</body>
</html>`;

// ── Send welcome + verify email ──
const sendVerifyEmail = async (user, verifyUrl) => {
  const content = `
    <p>Welcome to VERIDEX, ${user.name}.</p>
    <p>Click the button below to verify your email address and activate your account.</p>
    <a href="${verifyUrl}" class="btn">VERIFY EMAIL</a>
    <p>Or copy this link: <br><span style="color:#00d2ff;font-size:11px">${verifyUrl}</span></p>
    <p>This link expires in 24 hours.</p>`;

  await transporter.sendMail({
    from:    process.env.EMAIL_FROM,
    to:      user.email,
    subject: 'VERIDEX — Verify Your Email',
    html:    baseTemplate('VERIFY YOUR EMAIL', content),
  });
};

// ── Send scan result email ──
const sendScanResultEmail = async (user, scan) => {
  const color   = scan.isFake ? '#ff1f4e' : '#00ff88';
  const verdict = scan.isFake ? 'DEEPFAKE DETECTED' : 'AUTHENTIC VERIFIED';
  const content = `
    <p>Hi ${user.name}, your VERIDEX scan is complete.</p>
    <div style="border:1px solid ${color};padding:20px;margin:16px 0;text-align:center">
      <div style="font-size:28px;letter-spacing:5px;color:${color}">${verdict}</div>
      <div style="font-size:13px;color:#4a6880;margin-top:8px">
        CONFIDENCE: ${Math.max(scan.fakeConf, scan.realConf).toFixed(1)}%
      </div>
    </div>
    <p><strong style="color:#c5ddf5">File:</strong> <span style="color:#4a6880">${scan.fileName}</span></p>
    <p><strong style="color:#c5ddf5">Top Signal:</strong> <span style="color:#4a6880">${getTopSignal(scan.signals)}</span></p>
    <p>Log in to your dashboard to see the full forensic breakdown.</p>`;

  await transporter.sendMail({
    from:    process.env.EMAIL_FROM,
    to:      user.email,
    subject: `VERIDEX — Scan Result: ${scan.verdict}`,
    html:    baseTemplate('SCAN COMPLETE', content),
  });
};

// ── Send password reset email ──
const sendPasswordResetEmail = async (user, resetUrl) => {
  const content = `
    <p>Hi ${user.name}, you requested a password reset.</p>
    <a href="${resetUrl}" class="btn">RESET PASSWORD</a>
    <p>Or copy this link: <br><span style="color:#00d2ff;font-size:11px">${resetUrl}</span></p>
    <p>This link expires in 1 hour. If you didn't request this, ignore this email.</p>`;

  await transporter.sendMail({
    from:    process.env.EMAIL_FROM,
    to:      user.email,
    subject: 'VERIDEX — Password Reset',
    html:    baseTemplate('PASSWORD RESET', content),
  });
};

// ── Send weekly digest to admin ──
const sendAdminDigest = async (stats) => {
  const content = `
    <p>Weekly VERIDEX platform digest.</p>
    <div class="code">${stats.totalScans} TOTAL SCANS</div>
    <p>
      Deepfakes detected: <strong style="color:#ff1f4e">${stats.fakes}</strong><br>
      Authentic verified: <strong style="color:#00ff88">${stats.reals}</strong><br>
      New users: <strong style="color:#00d2ff">${stats.newUsers}</strong><br>
      Avg confidence: <strong style="color:#ffb700">${stats.avgConf}%</strong>
    </p>`;

  await transporter.sendMail({
    from:    process.env.EMAIL_FROM,
    to:      process.env.ADMIN_EMAIL,
    subject: 'VERIDEX — Weekly Admin Digest',
    html:    baseTemplate('WEEKLY DIGEST', content),
  });
};

// ── Helper ──
const getTopSignal = (signals) => {
  if (!signals) return 'N/A';
  return Object.entries(signals)
    .sort((a,b) => b[1]-a[1])[0]?.[0]?.toUpperCase() || 'N/A';
};

module.exports = { sendVerifyEmail, sendScanResultEmail, sendPasswordResetEmail, sendAdminDigest };
