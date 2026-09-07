const AuditLog = require('../models/AuditLog');

/**
 * Fire-and-forget audit log writer.
 * Don't await this in the main request path — it should not block the response.
 *
 * @param {object} params
 * @param {string} params.action - The action performed
 * @param {string} [params.userId] - The actor's user ID
 * @param {string} [params.entityType] - The type of entity affected
 * @param {string} [params.entityId] - The ID of the entity affected
 * @param {string} [params.clientId] - The client/tenant ID
 * @param {string} [params.ipAddress] - The actor's IP address
 * @param {object} [params.details] - Additional details (JSON)
 */
const writeAuditLog = ({ action, userId, entityType, entityId, clientId, ipAddress, details }) => {
  AuditLog.create({
    action,
    userId: userId || null,
    entityType: entityType || null,
    entityId: entityId || null,
    clientId: clientId || null,
    ipAddress: ipAddress || null,
    details: details || null,
  }).catch((err) => {
    console.error('Failed to write audit log:', err.message);
  });
};

/**
 * Extract client IP from Express request.
 */
const getClientIp = (req) => {
  return req.headers['x-forwarded-for']?.split(',')[0]?.trim() || req.socket?.remoteAddress || 'unknown';
};

module.exports = { writeAuditLog, getClientIp };
