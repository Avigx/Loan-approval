const jwt = require('jsonwebtoken');
const User = require('../models/User');
const env = require('../config/env');

/**
 * Middleware: Verify JWT access token from Authorization header.
 * Attaches req.user with { id, role, clientId, permission, fullName, email }.
 */
const authenticate = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'No token provided' });
    }

    const token = authHeader.split(' ')[1];
    const decoded = jwt.verify(token, env.JWT_SECRET);

    // Fetch the user to ensure they still exist and are active
    const user = await User.findById(decoded.id).select('-passwordHash');
    if (!user) {
      return res.status(401).json({ error: 'User not found' });
    }
    if (!user.active) {
      return res.status(403).json({ error: 'Account is deactivated' });
    }
    if (!user.emailVerified) {
      return res.status(403).json({ error: 'Email not verified' });
    }

    req.user = {
      id: user._id,
      role: user.role,
      clientId: user.clientId,
      permission: user.permission,
      fullName: user.fullName,
      email: user.email,
    };

    next();
  } catch (error) {
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({ error: 'Token expired' });
    }
    if (error.name === 'JsonWebTokenError') {
      return res.status(401).json({ error: 'Invalid token' });
    }
    next(error);
  }
};

module.exports = { authenticate };
