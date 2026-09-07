const express = require('express');
const router = express.Router();
const auditLogController = require('../controllers/auditLog.controller');
const { authenticate } = require('../middleware/auth.middleware');
const { requireRole } = require('../middleware/permissions.middleware');
const { validateQuery } = require('../middleware/validate');
const { auditLogQuerySchema } = require('../validators');

// Only admins can view audit logs
router.use(authenticate);
router.use(requireRole('SUPER_ADMIN', 'CLIENT_ADMIN'));

router.get('/', validateQuery(auditLogQuerySchema), auditLogController.listAuditLogs);

module.exports = router;
