const express = require('express');
const cors = require('cors');
const cookieParser = require('cookie-parser');
const path = require('path');
const fs = require('fs');
const connectDB = require('./config/db');
const env = require('./config/env');
const errorHandler = require('./middleware/errorHandler');

// Route imports
const authRoutes = require('./routes/auth.routes');
const documentsRoutes = require('./routes/documents.routes');
const bulkUploadRoutes = require('./routes/bulkUpload.routes');
const usersRoutes = require('./routes/users.routes');
const foldersRoutes = require('./routes/folders.routes');
const auditLogRoutes = require('./routes/auditLog.routes');

const app = express();

// Ensure storage directory exists
const storagePath = path.resolve(__dirname, '../storage');
if (!fs.existsSync(storagePath)) {
  fs.mkdirSync(storagePath, { recursive: true });
}

// Middleware
app.use(cors({
  origin: env.CLIENT_URL,
  credentials: true,
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/documents', documentsRoutes);
app.use('/api/bulk-upload', bulkUploadRoutes);
app.use('/api/users', usersRoutes);
app.use('/api/folders', foldersRoutes);
app.use('/api/audit-logs', auditLogRoutes);

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Error handler (must be last)
app.use(errorHandler);

// Start server
const startServer = async () => {
  await connectDB();
  app.listen(env.PORT, () => {
    console.log(`\n🚀 Server running on http://localhost:${env.PORT}`);
    console.log(`   API base: http://localhost:${env.PORT}/api`);
    console.log(`   Environment: ${env.NODE_ENV}\n`);
  });
};

startServer();

module.exports = app; // Export for testing with supertest
