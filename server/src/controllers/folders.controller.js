const Folder = require('../models/Folder');
const { scopeToClient } = require('../middleware/permissions.middleware');

/**
 * GET /api/folders
 * List all folders. Returns global + client-specific folders.
 */
const listFolders = async (req, res, next) => {
  try {
    const clientFilter = scopeToClient(req);
    const filter = {
      active: true,
      $or: [
        { clientId: null }, // Global folders
        clientFilter.clientId ? { clientId: clientFilter.clientId } : {},
      ],
    };

    const folders = await Folder.find(filter).sort({ name: 1 });
    res.json({ folders });
  } catch (error) {
    next(error);
  }
};

/**
 * POST /api/folders
 * Create a new folder (Super Admin only).
 */
const createFolder = async (req, res, next) => {
  try {
    const { name, code, displayLabel, clientId } = req.body;

    if (!name || !code || !displayLabel) {
      return res.status(400).json({ error: 'Name, code, and displayLabel are required' });
    }

    // Check for duplicate code
    const existing = await Folder.findOne({
      code: code.toUpperCase(),
      clientId: clientId || null,
    });
    if (existing) {
      return res.status(409).json({ error: `Folder with code "${code}" already exists` });
    }

    const folder = await Folder.create({
      name: name.trim(),
      code: code.toUpperCase(),
      displayLabel: displayLabel.trim(),
      clientId: clientId || null,
      active: true,
    });

    res.status(201).json({ folder });
  } catch (error) {
    next(error);
  }
};

/**
 * PUT /api/folders/:id
 * Update a folder (Super Admin only).
 */
const updateFolder = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { name, code, displayLabel, active } = req.body;

    const folder = await Folder.findById(id);
    if (!folder) {
      return res.status(404).json({ error: 'Folder not found' });
    }

    if (name !== undefined) folder.name = name.trim();
    if (code !== undefined) folder.code = code.toUpperCase();
    if (displayLabel !== undefined) folder.displayLabel = displayLabel.trim();
    if (active !== undefined) folder.active = active;

    await folder.save();
    res.json({ folder });
  } catch (error) {
    next(error);
  }
};

/**
 * DELETE /api/folders/:id
 * Soft-delete a folder (Super Admin only). Sets active=false.
 */
const deleteFolder = async (req, res, next) => {
  try {
    const { id } = req.params;

    const folder = await Folder.findById(id);
    if (!folder) {
      return res.status(404).json({ error: 'Folder not found' });
    }

    folder.active = false;
    await folder.save();
    res.json({ message: 'Folder deactivated', folder });
  } catch (error) {
    next(error);
  }
};

module.exports = { listFolders, createFolder, updateFolder, deleteFolder };
