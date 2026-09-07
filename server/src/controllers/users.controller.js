const bcrypt = require('bcrypt');
const User = require('../models/User');
const Client = require('../models/Client');
const { scopeToClient } = require('../middleware/permissions.middleware');
const { writeAuditLog, getClientIp } = require('../services/audit.service');

/**
 * GET /api/users
 * List users. Tenant-scoped for CLIENT_ADMIN; all users for SUPER_ADMIN.
 */
const listUsers = async (req, res, next) => {
  try {
    const filter = scopeToClient(req);
    const users = await User.find(filter)
      .select('-passwordHash -emailVerifyToken')
      .populate('clientId', 'name code')
      .sort({ createdAt: -1 });

    res.json({ users });
  } catch (error) {
    next(error);
  }
};

/**
 * POST /api/users
 * Create a new user. CLIENT_ADMIN can only create users for their own client.
 */
const createUser = async (req, res, next) => {
  try {
    const { fullName, email, password, role, permission, clientId } = req.body;

    // CLIENT_ADMIN can only create users for their own client
    const assignedClientId = req.user.role === 'SUPER_ADMIN'
      ? (clientId || null)
      : req.user.clientId;

    // CLIENT_ADMIN cannot create SUPER_ADMIN users
    if (req.user.role === 'CLIENT_ADMIN' && role === 'SUPER_ADMIN') {
      return res.status(403).json({ error: 'Cannot create Super Admin users' });
    }

    // Check if email is taken
    const existing = await User.findOne({ email: email.toLowerCase() });
    if (existing) {
      return res.status(409).json({ error: 'Email already registered' });
    }

    const passwordHash = await bcrypt.hash(password, 12);

    const user = await User.create({
      fullName,
      email: email.toLowerCase(),
      passwordHash,
      role: role || 'CUSTOMER',
      permission: permission || 'VIEW_DOWNLOAD',
      clientId: assignedClientId,
      emailVerified: true, // Admin-created users are pre-verified
    });

    // Audit log
    writeAuditLog({
      action: 'create_user',
      userId: req.user.id,
      entityType: 'User',
      entityId: user._id,
      clientId: assignedClientId,
      ipAddress: getClientIp(req),
      details: { createdEmail: email, role, permission },
    });

    res.status(201).json({
      user: {
        id: user._id,
        fullName: user.fullName,
        email: user.email,
        role: user.role,
        permission: user.permission,
        active: user.active,
        clientId: user.clientId,
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * PATCH /api/users/:id
 * Update user role, permission, active status. Tenant-scoped.
 */
const updateUser = async (req, res, next) => {
  try {
    const filter = { _id: req.params.id, ...scopeToClient(req) };
    const user = await User.findOne(filter);

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    const { fullName, role, permission, active, clientId } = req.body;
    const changes = {};

    if (fullName !== undefined) { user.fullName = fullName; changes.fullName = fullName; }
    if (role !== undefined) {
      // CLIENT_ADMIN cannot promote to SUPER_ADMIN
      if (req.user.role === 'CLIENT_ADMIN' && role === 'SUPER_ADMIN') {
        return res.status(403).json({ error: 'Cannot assign Super Admin role' });
      }
      user.role = role;
      changes.role = role;
    }
    if (permission !== undefined) {
      user.permission = permission;
      changes.permission = permission;
    }
    if (clientId !== undefined && req.user.role === 'SUPER_ADMIN') {
      user.clientId = clientId || null;
      changes.clientId = clientId || null;
    }
    if (active !== undefined) {
      user.active = active;
      changes.active = active;

      // Log activation/deactivation specifically
      writeAuditLog({
        action: active ? 'activate_user' : 'deactivate_user',
        userId: req.user.id,
        entityType: 'User',
        entityId: user._id,
        clientId: req.user.clientId,
        ipAddress: getClientIp(req),
      });
    }

    await user.save();
    await user.populate('clientId', 'name code');

    // Audit log for permission/role changes
    if (changes.role || changes.permission || changes.clientId) {
      writeAuditLog({
        action: changes.role ? 'edit_role' : (changes.permission ? 'edit_permission' : 'edit_client'),
        userId: req.user.id,
        entityType: 'User',
        entityId: user._id,
        clientId: req.user.clientId,
        ipAddress: getClientIp(req),
        details: changes,
      });
    }

    res.json({
      user: {
        id: user._id,
        fullName: user.fullName,
        email: user.email,
        role: user.role,
        permission: user.permission,
        active: user.active,
        clientId: user.clientId,
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/users/clients
 * List all active clients for role & tenant assignment.
 */
const listClients = async (req, res, next) => {
  try {
    const clients = await Client.find({ active: true }).sort({ name: 1 });
    res.json({ clients });
  } catch (error) {
    next(error);
  }
};

module.exports = { listUsers, createUser, updateUser, listClients };
