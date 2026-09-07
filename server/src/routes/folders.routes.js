const express = require('express');
const router = express.Router();
const foldersController = require('../controllers/folders.controller');
const { authenticate } = require('../middleware/auth.middleware');

router.use(authenticate);
router.get('/', foldersController.listFolders);

module.exports = router;
