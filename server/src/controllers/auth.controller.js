const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const User = require('../models/User');
const env = require('../config/env');
const { writeAuditLog, getClientIp } = require('../services/audit.service');

/**
 * POST /api/auth/login
 */
const login = async (req, res, next) => {
  try {
    const { email, password } = req.body;

    const user = await User.findOne({ email: email.toLowerCase() });
    if (!user) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    if (!user.active) {
      return res.status(403).json({ error: 'Account is deactivated. Contact your administrator.' });
    }

    if (!user.emailVerified) {
      return res.status(403).json({ error: 'Please verify your email before logging in.' });
    }

    const isMatch = await bcrypt.compare(password, user.passwordHash);
    if (!isMatch) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    // Generate tokens
    const accessToken = jwt.sign(
      { id: user._id, role: user.role, clientId: user.clientId, permission: user.permission },
      env.JWT_SECRET,
      { expiresIn: env.JWT_ACCESS_EXPIRY }
    );

    const refreshToken = jwt.sign(
      { id: user._id },
      env.JWT_REFRESH_SECRET,
      { expiresIn: env.JWT_REFRESH_EXPIRY }
    );

    // Set refresh token as httpOnly cookie
    res.cookie('refreshToken', refreshToken, {
      httpOnly: true,
      secure: env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
    });

    // Update last login
    user.lastLoginAt = new Date();
    await user.save();

    // Audit log
    writeAuditLog({
      action: 'login',
      userId: user._id,
      clientId: user.clientId,
      ipAddress: getClientIp(req),
    });

    res.json({
      accessToken,
      user: {
        id: user._id,
        fullName: user.fullName,
        email: user.email,
        role: user.role,
        permission: user.permission,
        clientId: user.clientId,
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * POST /api/auth/register
 */
const register = async (req, res, next) => {
  try {
    const { fullName, email, password } = req.body;

    // Check if email is taken
    const existing = await User.findOne({ email: email.toLowerCase() });
    if (existing) {
      return res.status(409).json({ error: 'Email already registered' });
    }

    // Hash password
    const passwordHash = await bcrypt.hash(password, 12);

    // Generate email verification token
    const emailVerifyToken = crypto.randomBytes(32).toString('hex');
    const emailVerifyExpires = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours

    const isDev = env.NODE_ENV === 'development' || env.EMAIL_PROVIDER === 'stub';

    // Self-registered users always start with CUSTOMER role and VIEW_ONLY permission.
    // Elevated roles and permissions are assigned strictly by Super Admin.
    const user = await User.create({
      fullName,
      email: email.toLowerCase(),
      passwordHash,
      role: 'CUSTOMER',
      permission: 'VIEW_ONLY',
      clientId: null,
      emailVerifyToken,
      emailVerifyExpires,
      emailVerified: isDev,
    });

    // Stub email in dev — just log the verification token
    if (env.EMAIL_PROVIDER === 'stub') {
      console.log(`\n📧 [DEV] Email verification for ${email}:`);
      console.log(`   Token: ${emailVerifyToken}`);
      console.log(`   URL: ${env.CLIENT_URL}/verify-email?token=${emailVerifyToken}\n`);
    }
    // TODO: Send actual email via Resend/SMTP in production

    res.status(201).json({
      message: isDev ? 'Account registered successfully! You can now log in.' : 'User created. Please verify your email.',
      userId: user._id,
      emailVerified: isDev,
      // Include token in dev response for easy testing
      ...(env.NODE_ENV === 'development' && { emailVerifyToken }),
    });
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/auth/verify-email?token=xxx
 */
const verifyEmail = async (req, res, next) => {
  try {
    const { token } = req.query;
    if (!token) {
      return res.status(400).json({ error: 'Verification token is required' });
    }

    const user = await User.findOne({
      emailVerifyToken: token,
      emailVerifyExpires: { $gt: new Date() },
    });

    if (!user) {
      return res.status(400).json({ error: 'Invalid or expired verification token' });
    }

    user.emailVerified = true;
    user.emailVerifyToken = undefined;
    user.emailVerifyExpires = undefined;
    await user.save();

    res.json({ message: 'Email verified successfully. You can now log in.' });
  } catch (error) {
    next(error);
  }
};

/**
 * POST /api/auth/refresh
 */
const refreshToken = async (req, res, next) => {
  try {
    const token = req.cookies?.refreshToken;
    if (!token) {
      return res.status(401).json({ error: 'No refresh token' });
    }

    const decoded = jwt.verify(token, env.JWT_REFRESH_SECRET);
    const user = await User.findById(decoded.id).select('-passwordHash');

    if (!user || !user.active) {
      return res.status(401).json({ error: 'Invalid refresh token' });
    }

    const accessToken = jwt.sign(
      { id: user._id, role: user.role, clientId: user.clientId, permission: user.permission },
      env.JWT_SECRET,
      { expiresIn: env.JWT_ACCESS_EXPIRY }
    );

    res.json({ accessToken });
  } catch (error) {
    return res.status(401).json({ error: 'Invalid refresh token' });
  }
};

/**
 * POST /api/auth/logout
 */
const logout = (req, res) => {
  res.clearCookie('refreshToken');
  res.json({ message: 'Logged out' });
};

/**
 * GET /api/auth/me
 */
const getMe = async (req, res, next) => {
  try {
    const user = await User.findById(req.user.id).select('-passwordHash').populate('clientId', 'name code');
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }
    res.json({ user });
  } catch (error) {
    next(error);
  }
};

module.exports = { login, register, verifyEmail, refreshToken, logout, getMe };
