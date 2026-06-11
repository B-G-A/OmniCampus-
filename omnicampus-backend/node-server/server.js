/**
 * OmniCampus Node Server Entry Point.
 *
 * Starts database connection and listens on the configured PORT.
 */

// Load dot env variables first
require('dotenv').config();

const app = require('./src/app');
const connectDB = require('./src/config/db');
const env = require('./src/config/env');

// Handle uncaught exceptions
process.on('uncaughtException', (err) => {
  console.error('🔥  Uncaught Exception! Shutting down...');
  console.error(err.name, err.message, err.stack);
  process.exit(1);
});

const PORT = env.PORT || 5000;

let server;

const startServer = async () => {
  // Connect to database
  await connectDB();

  if (process.env.USE_MEMORY_DB === 'true') {
    const seed = require('./seed');
    await seed();
    console.log('🌱 Seed data injected into in-memory DB.');
  }

  // Listen
  server = app.listen(PORT, '0.0.0.0', () => {
    console.log(`🚀  Node server running in ${env.NODE_ENV} mode on port ${PORT}`);
  });
};

startServer();

// Handle unhandled rejections
process.on('unhandledRejection', (err) => {
  console.error('🔥  Unhandled Rejection! Shutting down...');
  console.error(err.name, err.message, err.stack);
  if (server) {
    server.close(() => {
      process.exit(1);
    });
  } else {
    process.exit(1);
  }
});
