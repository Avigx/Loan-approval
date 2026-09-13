const { processBulkUpload, generateTemplate } = require('../services/bulkUpload.service');
const UploadBatch = require('../models/UploadBatch');
const { scopeToClient } = require('../middleware/permissions.middleware');

/**
 * POST /api/bulk-upload
 * Upload template + document files for bulk processing.
 */
const uploadBatch = async (req, res, next) => {
  try {
    const templateFile = req.files?.template?.[0];
    const documentFiles = req.files?.documents || [];

    if (!templateFile) {
      return res.status(400).json({ error: 'Template file is required' });
    }

    if (documentFiles.length === 0) {
      return res.status(400).json({ error: 'At least one document file is required' });
    }

    let clientId = req.user.clientId;
    if (!clientId && req.user.role === 'SUPER_ADMIN') {
      clientId = req.body.clientId;
      if (!clientId) {
        const Client = require('../models/Client');
        const firstClient = await Client.findOne({ active: true });
        clientId = firstClient?._id;
      }
    }

    const batch = await processBulkUpload({
      templateFile,
      documentFiles,
      clientId,
      userId: req.user.id,
      batchName: req.body.batchName || '',
    });

    res.status(202).json({
      message: 'Batch upload started',
      batch: {
        id: batch._id,
        batchCode: batch.batchCode,
        status: batch.status,
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/bulk-upload/:id/status
 * Check batch processing status (for polling from the UI).
 */
const getBatchStatus = async (req, res, next) => {
  try {
    const filter = { _id: req.params.id, ...scopeToClient(req) };
    const batch = await UploadBatch.findOne(filter)
      .populate('uploadedById', 'fullName email');

    if (!batch) {
      return res.status(404).json({ error: 'Batch not found' });
    }

    res.json({ batch });
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/bulk-upload/batches
 * List all batches for the current client.
 */
const listBatches = async (req, res, next) => {
  try {
    const filter = scopeToClient(req);
    const batches = await UploadBatch.find(filter)
      .populate('uploadedById', 'fullName email')
      .sort({ createdAt: -1 })
      .limit(50);

    res.json({ batches });
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/bulk-upload/template
 * Download the bulk upload template file.
 */
const downloadTemplate = async (req, res, next) => {
  try {
    const buffer = generateTemplate();
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', 'attachment; filename="bulk_upload_template.xlsx"');
    res.send(buffer);
  } catch (error) {
    next(error);
  }
};

module.exports = { uploadBatch, getBatchStatus, listBatches, downloadTemplate };
