const AuditLog = require('../models/AuditLog');
const { scopeToClient } = require('../middleware/permissions.middleware');

/**
 * GET /api/audit-logs
 * List audit logs with filters. Tenant-scoped.
 */
const listAuditLogs = async (req, res, next) => {
  try {
    const { userId, action, loanNumber, dateFrom, dateTo, page = '1', limit = '50' } = req.query;

    const filter = { ...scopeToClient(req) };

    if (userId) filter.userId = userId;
    if (action) filter.action = action;
    if (loanNumber) {
      filter['details.filters.loanNumber'] = { $regex: loanNumber, $options: 'i' };
    }

    // Date range
    if (dateFrom || dateTo) {
      filter.createdAt = {};
      if (dateFrom) filter.createdAt.$gte = new Date(dateFrom);
      if (dateTo) filter.createdAt.$lte = new Date(dateTo);
    }

    const pageNum = parseInt(page, 10);
    const limitNum = parseInt(limit, 10);
    const skip = (pageNum - 1) * limitNum;

    const [logs, total] = await Promise.all([
      AuditLog.find(filter)
        .populate('userId', 'fullName email')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limitNum)
        .lean(),
      AuditLog.countDocuments(filter),
    ]);

    res.json({
      logs,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total,
        totalPages: Math.ceil(total / limitNum),
      },
    });
  } catch (error) {
    next(error);
  }
};

module.exports = { listAuditLogs };
