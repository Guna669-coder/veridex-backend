/* ═══════════════════════════════════════════
   VERIDEX — CONFIG/DB.JS
   MongoDB Atlas connection
═══════════════════════════════════════════ */
const mongoose = require('mongoose');

const connectDB = async () => {
  try {
    const conn = await mongoose.connect(process.env.MONGODB_URI, {
      useNewUrlParser:    true,
      useUnifiedTopology: true,
    });
    console.log(`✅ MongoDB Connected: ${conn.connection.host}`);
  } catch (err) {
    console.error(`❌ MongoDB Error: ${err.message}`);
    process.exit(1);
  }
};

// Log connection events
mongoose.connection.on('disconnected', () => console.warn('⚠ MongoDB disconnected'));
mongoose.connection.on('reconnected',  () => console.log('✅ MongoDB reconnected'));

module.exports = connectDB;
