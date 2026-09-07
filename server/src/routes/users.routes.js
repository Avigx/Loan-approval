const express = require('express');
const router = express.Router();
const usersController = require('../controllers/users.controller');
const { authenticate } = require('../middleware/auth.middleware');
const { requireRole } = require('../middleware/permissions.middleware');
const { validate } = require('../middleware/validate');
const { createUserSchema, updateUserSchema } = require('../validators');

// All user management routes require authentication + admin role
router.use(authenticate);
router.use(requireRole('SUPER_ADMIN', 'CLIENT_ADMIN'));

router.get('/', usersController.listUsers);
router.get('/clients', usersController.listClients);
router.post('/', validate(createUserSchema), usersController.createUser);
router.patch('/:id', validate(updateUserSchema), usersController.updateUser);

module.exports = router;
