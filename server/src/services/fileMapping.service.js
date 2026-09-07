const path = require('path');

/**
 * Parse a filename into its component parts: loanNumber, folderCode, variant.
 *
 * Expected patterns:
 *   {LoanNumber}_{FolderCode}.{ext}                → variant: null
 *   {LoanNumber}_{FolderCode}_TRACKING.{ext}       → variant: 'TRACKING'
 *   {LoanNumber}_{FolderCode}_POD.{ext}            → variant: 'POD'
 *
 * Examples:
 *   L9001020228468693_INVO.pdf           → { loanNumber: 'L9001020228468693', folderCode: 'INVO', variant: null }
 *   L9001020228468693_INVO_TRACKING.pdf  → { loanNumber: 'L9001020228468693', folderCode: 'INVO', variant: 'TRACKING' }
 *   L9001020228468693_INVO_POD.pdf       → { loanNumber: 'L9001020228468693', folderCode: 'INVO', variant: 'POD' }
 *
 * @param {string} filename - The original filename (with extension)
 * @returns {{ loanNumber: string, folderCode: string, variant: string|null } | { error: string }}
 */
const parseFilename = (filename) => {
  if (!filename || typeof filename !== 'string') {
    return { error: 'Empty or invalid filename' };
  }

  // Strip extension
  const ext = path.extname(filename).toLowerCase();
  const nameWithoutExt = filename.slice(0, -ext.length);

  if (!nameWithoutExt) {
    return { error: 'Filename is just an extension' };
  }

  // Split by underscore
  const parts = nameWithoutExt.split('_');

  if (parts.length < 2) {
    return { error: `Cannot parse filename "${filename}": expected at least LoanNumber_FolderCode` };
  }

  // First part is always the Loan Number
  const loanNumber = parts[0];

  if (!loanNumber) {
    return { error: `Cannot extract Loan Number from "${filename}"` };
  }

  // Check if the last part is a variant suffix (TRACKING or POD)
  const lastPart = parts[parts.length - 1].toUpperCase();
  let variant = null;
  let folderCodeParts;

  if (lastPart === 'TRACKING' || lastPart === 'POD') {
    variant = lastPart;
    // Folder code is everything between loan number and variant
    folderCodeParts = parts.slice(1, -1);
  } else {
    // No variant suffix — everything after loan number is folder code
    folderCodeParts = parts.slice(1);
  }

  if (folderCodeParts.length === 0) {
    return { error: `Cannot extract Folder Code from "${filename}"` };
  }

  const folderCode = folderCodeParts.join('_').toUpperCase();

  return { loanNumber, folderCode, variant };
};

/**
 * Build the full folder code including variant suffix.
 * e.g. folderCode='INVO', variant='TRACKING' → 'INVO_TRACKING'
 */
const buildFullFolderCode = (folderCode, variant) => {
  if (!variant) return folderCode;
  return `${folderCode}_${variant}`;
};

module.exports = { parseFilename, buildFullFolderCode };
