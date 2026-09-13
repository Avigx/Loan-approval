const express = require('express');
const router = express.Router();
const foldersController = require('../controllers/folders.controller');
const { authenticate } = require('../middleware/auth.middleware');
const { requireRole } = require('../middleware/permissions.middleware');

router.use(authenticate);

// All authenticated users can list folders
router.get('/', foldersController.listFolders);

// Super Admin only: CRUD operations
router.post('/', requireRole('SUPER_ADMIN'), foldersController.createFolder);
router.put('/:id', requireRole('SUPER_ADMIN'), foldersController.updateFolder);
router.delete('/:id', requireRole('SUPER_ADMIN'), foldersController.deleteFolder);

module.exports = router;
