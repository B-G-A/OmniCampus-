/**
 * MongoDB connection via Mongoose.
 * Exports a single `connectDB` async function that can be awaited at startup.
 */

const mongoose = require('mongoose');
const env = require('./env');

const connectDB = async () => {
  try {
    let mongoUri = env.MONGODB_URI;

    if (process.env.USE_MEMORY_DB === 'true') {
      const { MongoMemoryServer } = require('mongodb-memory-server');
      const mongod = await MongoMemoryServer.create();
      mongoUri = mongod.getUri();
      console.log('🧠 Using in-memory MongoDB');
    }

    const conn = await mongoose.connect(mongoUri, {
      // Mongoose 8 uses the new URL parser & unified topology by default,
      // but we can still pass driver-level options here if needed.
      autoIndex: env.NODE_ENV !== 'production', // disable auto-index in prod for perf
    });

    console.log(`✅  MongoDB connected: ${conn.connection.host}/${conn.connection.name}`);

    // ── Connection event listeners ────────────────────────────────
    mongoose.connection.on('error', (err) => {
      console.error(`❌  MongoDB connection error: ${err.message}`);
    });

    mongoose.connection.on('disconnected', () => {
      console.warn('⚠️  MongoDB disconnected. Attempting to reconnect…');
    });

    mongoose.connection.on('reconnected', () => {
      console.log('🔄  MongoDB reconnected.');
    });

    return conn;
  } catch (error) {
    console.error(`❌  MongoDB connection failed: ${error.message}`);
    // Exit with failure so the process manager (pm2, Docker, etc.) can restart us
    process.exit(1);
  }
};

module.exports = connectDB;
