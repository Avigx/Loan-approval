const Document = require('../models/Document');
const Folder = require('../models/Folder');
const archiver = require('archiver');
const storageService = require('../services/storage.service');
const { scopeToClient } = require('../middleware/permissions.middleware');
const { writeAuditLog, getClientIp } = require('../services/audit.service');

/**
 * GET /api/documents/search
 * Search documents with filters. Tenant-scoped.
 */
const searchDocuments = async (req, res, next) => {
  try {
    const {
      loanNumber, uniqueRef, customerName,
      trackingNumber, folderCode, noticeType, dispatchFrom, dispatchTo,
      page = '1', limit = '50',
    } = req.query;

    const filter = { ...scopeToClient(req) };

    if (loanNumber) filter.loanNumber = { $regex: loanNumber, $options: 'i' };
    if (uniqueRef) filter.uniqueRef = { $regex: uniqueRef, $options: 'i' };
    if (customerName) filter.customerName = { $regex: customerName, $options: 'i' };
    if (trackingNumber) filter.trackingNumber = { $regex: trackingNumber, $options: 'i' };
    
    // Notice Type enum filter (notice, receipt, tracking)
    if (noticeType) filter.noticeType = noticeType.toUpperCase();

    // Filter by folder code
    if (folderCode) {
      const folders = await Folder.find({ code: { $regex: folderCode, $options: 'i' } });
      const folderIds = folders.map((f) => f._id);
      filter.folderId = { $in: folderIds };
    }

    // Dispatch date range
    if (dispatchFrom || dispatchTo) {
      filter.dispatchDate = {};
      if (dispatchFrom) filter.dispatchDate.$gte = new Date(dispatchFrom);
      if (dispatchTo) filter.dispatchDate.$lte = new Date(dispatchTo);
    }

    const pageNum = parseInt(page, 10);
    const limitNum = parseInt(limit, 10);
    const skip = (pageNum - 1) * limitNum;

    const [documents, total] = await Promise.all([
      Document.find(filter)
        .populate('folderId', 'code displayLabel name')
        .populate('clientId', 'name code')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limitNum)
        .lean(),
      Document.countDocuments(filter),
    ]);

    // Audit log
    writeAuditLog({
      action: 'search',
      userId: req.user.id,
      clientId: req.user.clientId,
      ipAddress: getClientIp(req),
      details: { filters: req.query, resultCount: total },
    });

    res.json({
      documents,
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

/**
 * GET /api/documents/:id/view
 * Get document details for viewing. Tenant-scoped.
 */
const viewDocument = async (req, res, next) => {
  try {
    const filter = { _id: req.params.id, ...scopeToClient(req) };
    const document = await Document.findOne(filter)
      .populate('folderId', 'code displayLabel name')
      .populate('clientId', 'name code');

    if (!document) {
      return res.status(404).json({ error: 'Document not found' });
    }

    // Audit log
    writeAuditLog({
      action: 'view',
      userId: req.user.id,
      entityType: 'Document',
      entityId: document._id,
      clientId: req.user.clientId,
      ipAddress: getClientIp(req),
    });

    res.json({ document });
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/documents/:id/download
 * Download document file. Requires download permission. Tenant-scoped.
 */
const downloadDocument = async (req, res, next) => {
  try {
    const filter = { _id: req.params.id, ...scopeToClient(req) };
    const document = await Document.findOne(filter);

    if (!document) {
      return res.status(404).json({ error: 'Document not found' });
    }

    if (!storageService.exists(document.filePath)) {
      return res.status(404).json({ error: 'File not found on storage' });
    }

    // Audit log
    writeAuditLog({
      action: 'download',
      userId: req.user.id,
      entityType: 'Document',
      entityId: document._id,
      clientId: req.user.clientId,
      ipAddress: getClientIp(req),
    });

    const fileStream = storageService.getReadStream(document.filePath);
    const filename = `${document.uniqueRef}.${document.fileType}`;

    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.setHeader('Content-Type', getContentType(document.fileType));
    fileStream.pipe(res);
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/documents/stats
 * Dashboard stats: total documents, batches, successful/failed rows, folder-wise counts.
 */
const getStats = async (req, res, next) => {
  try {
    const clientFilter = scopeToClient(req);

    const [totalDocs, folderCounts] = await Promise.all([
      Document.countDocuments(clientFilter),
      Document.aggregate([
        { $match: clientFilter.clientId ? { clientId: clientFilter.clientId } : {} },
        {
          $lookup: {
            from: 'folders',
            localField: 'folderId',
            foreignField: '_id',
            as: 'folder',
          },
        },
        { $unwind: '$folder' },
        {
          $group: {
            _id: '$folder.code',
            displayLabel: { $first: '$folder.displayLabel' },
            count: { $sum: 1 },
          },
        },
        { $sort: { count: -1 } },
      ]),
    ]);

    // Get batch stats
    const UploadBatch = require('../models/UploadBatch');
    const batchStats = await UploadBatch.aggregate([
      { $match: clientFilter.clientId ? { clientId: clientFilter.clientId } : {} },
      {
        $group: {
          _id: null,
          totalBatches: { $sum: 1 },
          successfulRows: { $sum: '$successfulRows' },
          failedRows: { $sum: '$failedRows' },
        },
      },
    ]);

    const stats = batchStats[0] || { totalBatches: 0, successfulRows: 0, failedRows: 0 };

    res.json({
      totalDocuments: totalDocs,
      totalBatches: stats.totalBatches,
      successfulRows: stats.successfulRows,
      failedRows: stats.failedRows,
      folderCounts, // Keep the key as folderCounts
    });
  } catch (error) {
    next(error);
  }
};

/**
 * DELETE /api/documents/:id
 * Permanently delete a document. Restricted to admin roles. Tenant-scoped.
 */
const deleteDocument = async (req, res, next) => {
  try {
    const filter = { _id: req.params.id, ...scopeToClient(req) };
    const document = await Document.findOne(filter);

    if (!document) {
      return res.status(404).json({ error: 'Document not found' });
    }

    // Delete the physical file from storage (best-effort; don't fail if already gone)
    try {
      await storageService.deleteFile(document.filePath);
    } catch (fileErr) {
      console.error(`Failed to delete file ${document.filePath}:`, fileErr.message);
    }

    // Delete the MongoDB document
    await Document.deleteOne({ _id: document._id });

    // Audit log
    writeAuditLog({
      action: 'delete',
      userId: req.user.id,
      entityType: 'Document',
      entityId: document._id,
      clientId: req.user.clientId,
      ipAddress: getClientIp(req),
      details: {
        loanNumber: document.loanNumber,
        uniqueRef: document.uniqueRef,
        customerName: document.customerName,
        fileType: document.fileType,
      },
    });

    res.json({ message: 'Document deleted successfully' });
  } catch (error) {
    next(error);
  }
};

/**
 * POST /api/documents/download-bulk
 * Download multiple documents as a single ZIP file. Requires download permission. Tenant-scoped.
 */
const downloadBulk = async (req, res, next) => {
  try {
    const { documentIds } = req.body;

    if (!Array.isArray(documentIds) || documentIds.length === 0) {
      return res.status(400).json({ error: 'documentIds must be a non-empty array' });
    }

    // Cap the number of documents to prevent abuse
    if (documentIds.length > 500) {
      return res.status(400).json({ error: 'Cannot download more than 500 documents at once' });
    }

    const filter = { _id: { $in: documentIds }, ...scopeToClient(req) };
    const documents = await Document.find(filter).lean();

    if (documents.length === 0) {
      return res.status(404).json({ error: 'No documents found for the given IDs' });
    }

    // Filter to only documents whose physical files exist
    const validDocs = documents.filter((doc) => storageService.exists(doc.filePath));

    if (validDocs.length === 0) {
      return res.status(404).json({ error: 'No downloadable files found on storage' });
    }

    // Set response headers for ZIP download
    res.setHeader('Content-Type', 'application/zip');
    res.setHeader('Content-Disposition', 'attachment; filename="search_results.zip"');

    const archive = archiver('zip', { zlib: { level: 5 } });

    // Handle archiver errors
    archive.on('error', (err) => {
      console.error('Archiver error:', err);
      // If headers not yet sent, send an error response
      if (!res.headersSent) {
        return res.status(500).json({ error: 'Failed to generate ZIP archive' });
      }
      res.end();
    });

    // Pipe archive data to the response
    archive.pipe(res);

    // Add each valid document to the archive
    for (const doc of validDocs) {
      const stream = storageService.getReadStream(doc.filePath);
      const filename = `${doc.uniqueRef}.${doc.fileType}`;
      archive.append(stream, { name: filename });
    }

    // Audit log
    writeAuditLog({
      action: 'bulk_download',
      userId: req.user.id,
      clientId: req.user.clientId,
      ipAddress: getClientIp(req),
      details: { documentCount: validDocs.length, skippedMissing: documents.length - validDocs.length },
    });

    // Finalize the archive (this triggers the end event)
    await archive.finalize();
  } catch (error) {
    next(error);
  }
};

function getContentType(fileType) {
  const types = {
    pdf: 'application/pdf',
    jpg: 'image/jpeg',
    jpeg: 'image/jpeg',
    png: 'image/png',
    xlsx: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    csv: 'text/csv',
  };
  return types[fileType] || 'application/octet-stream';
}

module.exports = { searchDocuments, viewDocument, downloadDocument, downloadBulk, deleteDocument, getStats };
