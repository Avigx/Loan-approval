const express = require('express');
const router = express.Router();
const bulkUploadController = require('../controllers/bulkUpload.controller');
const { authenticate } = require('../middleware/auth.middleware');
const { requireRole } = require('../middleware/permissions.middleware');
const { bulkUpload } = require('../middleware/upload.middleware');

// All bulk upload routes require authentication + admin role
router.use(authenticate);

router.post(
  '/',
  requireRole('SUPER_ADMIN', 'CLIENT_ADMIN'),
  bulkUpload.fields([
    { name: 'template', maxCount: 1 },
    { name: 'documents', maxCount: 500 },
  ]),
  bulkUploadController.uploadBatch
);

router.get('/template', bulkUploadController.downloadTemplate);
router.get('/batches', requireRole('SUPER_ADMIN', 'CLIENT_ADMIN'), bulkUploadController.listBatches);
router.get('/:id/status', bulkUploadController.getBatchStatus);

module.exports = router;
