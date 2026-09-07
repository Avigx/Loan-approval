const FolderType = require('../models/FolderType');
const { scopeToClient } = require('../middleware/permissions.middleware');

/**
 * GET /api/folders
 * List all folder types. Returns global + client-specific folder types.
 */
const listFolders = async (req, res, next) => {
  try {
    const clientFilter = scopeToClient(req);
    const filter = {
      active: true,
      $or: [
        { clientId: null }, // Global folder types
        clientFilter.clientId ? { clientId: clientFilter.clientId } : {},
      ],
    };

    const folders = await FolderType.find(filter).sort({ familyName: 1, variant: 1 });
    res.json({ folders });
  } catch (error) {
    next(error);
  }
};

module.exports = { listFolders };
