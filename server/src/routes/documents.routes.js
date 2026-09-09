const express = require('express');
const router = express.Router();
const documentsController = require('../controllers/documents.controller');
const { authenticate } = require('../middleware/auth.middleware');
const { requireDownloadPermission, requireRole } = require('../middleware/permissions.middleware');
const { validateQuery } = require('../middleware/validate');
const { searchDocumentsSchema } = require('../validators');

// All document routes require authentication
router.use(authenticate);

router.get('/search', validateQuery(searchDocumentsSchema), documentsController.searchDocuments);
router.get('/stats', documentsController.getStats);
router.get('/:id/view', documentsController.viewDocument);
router.get('/:id/download', requireDownloadPermission, documentsController.downloadDocument);
router.delete('/:id', requireRole('SUPER_ADMIN', 'CLIENT_ADMIN'), documentsController.deleteDocument);

module.exports = router;

