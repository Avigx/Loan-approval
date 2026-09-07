/**
 * RBAC + multi-tenant scoping middleware.
 *
 * Key principle: every query on Document/UploadBatch/User MUST be scoped
 * by clientId for non-SUPER_ADMIN roles. A missed spot is a tenant-data-leak bug.
 */

/**
 * Returns a Mongoose filter object that scopes queries to the user's client.
 * SUPER_ADMIN sees all; everyone else is restricted to their own clientId.
 */
const scopeToClient = (req) => {
  if (req.user.role === 'SUPER_ADMIN') {
    return {}; // no restriction
  }
  return { clientId: req.user.clientId };
};

/**
 * Middleware factory: restrict access to specific roles.
 * Usage: requireRole('SUPER_ADMIN', 'CLIENT_ADMIN')
 */
const requireRole = (...roles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ error: 'Not authenticated' });
    }
    if (!roles.includes(req.user.role)) {
      return res.status(403).json({ error: 'Insufficient role' });
    }
    next();
  };
};

/**
 * Middleware: check that the user has download permission.
 * Used on any route that returns a file URL or triggers a download.
 */
const requireDownloadPermission = (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({ error: 'Not authenticated' });
  }
  if (req.user.permission === 'DOWNLOAD_DISABLED') {
    return res.status(403).json({ error: 'Download permission disabled' });
  }
  next();
};

/**
 * Middleware: check that the user has view permission (not DOWNLOAD_DISABLED).
 * VIEW_ONLY and VIEW_DOWNLOAD both pass.
 */
const requireViewPermission = (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({ error: 'Not authenticated' });
  }
  // All permission levels can at least view
  next();
};

module.exports = {
  scopeToClient,
  requireRole,
  requireDownloadPermission,
  requireViewPermission,
};
