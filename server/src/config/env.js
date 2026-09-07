const dotenv = require('dotenv');
const path = require('path');

// Load .env from server directory
dotenv.config({ path: path.resolve(__dirname, '../../.env') });

const env = {
  PORT: process.env.PORT || 5000,
  MONGODB_URI: process.env.MONGODB_URI || 'mongodb://localhost:27017/legal-notice-dms',
  JWT_SECRET: process.env.JWT_SECRET || 'dev-jwt-secret',
  JWT_REFRESH_SECRET: process.env.JWT_REFRESH_SECRET || 'dev-refresh-secret',
  JWT_ACCESS_EXPIRY: process.env.JWT_ACCESS_EXPIRY || '15m',
  JWT_REFRESH_EXPIRY: process.env.JWT_REFRESH_EXPIRY || '7d',
  CLIENT_URL: process.env.CLIENT_URL || 'http://localhost:5173',
  EMAIL_PROVIDER: process.env.EMAIL_PROVIDER || 'stub',
  STORAGE_MODE: process.env.STORAGE_MODE || 'local',
  MAX_FILE_SIZE: parseInt(process.env.MAX_FILE_SIZE || '26214400', 10), // 25MB
  NODE_ENV: process.env.NODE_ENV || 'development',
};

module.exports = env;
