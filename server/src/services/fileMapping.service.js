const path = require('path');

/**
 * Normalize a filename for comparison: strip extension, lowercase, collapse separators.
 * @param {string} filename
 * @returns {string}
 */
const normalizeFilename = (filename) => {
  if (!filename || typeof filename !== 'string') return '';
  const ext = path.extname(filename);
  const base = ext ? filename.slice(0, -ext.length) : filename;
  return base.trim().toLowerCase();
};

/**
 * Extract all distinct tokens from a filename by splitting on common separators.
 * Handles underscores, hyphens, spaces, and dots (except file extension dots).
 * @param {string} filename
 * @returns {string[]}
 */
const extractTokens = (filename) => {
  const normalized = normalizeFilename(filename);
  if (!normalized) return [];
  // Split by underscore, hyphen, space, or multiple consecutive separators
  return normalized
    .split(/[_\-\s]+/)
    .filter(Boolean);
};

/**
 * Check whether a filename contains a specific known identifier.
 * Uses word-boundary–aware matching.
 */
const filenameContainsId = (filename, knownId) => {
  if (!knownId || !filename) return { found: false, confidence: 'none' };

  const normalizedId = knownId.trim().toLowerCase();
  if (!normalizedId) return { found: false, confidence: 'none' };

  const tokens = extractTokens(filename);

  // Phase 1: exact token match
  if (tokens.includes(normalizedId)) {
    return { found: true, confidence: 'exact' };
  }

  // Phase 2: substring match in full normalized name
  const normalizedName = normalizeFilename(filename);
  if (normalizedName.includes(normalizedId)) {
    if (/^\d+$/.test(normalizedId)) {
      const re = new RegExp(`(?:^|[^\\d])${escapeRegex(normalizedId)}(?:[^\\d]|$)`);
      if (re.test(normalizedName)) {
        return { found: true, confidence: 'substring' };
      }
      return { found: false, confidence: 'none' };
    }
    return { found: true, confidence: 'substring' };
  }

  return { found: false, confidence: 'none' };
};

const escapeRegex = (str) => str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

const findMatchingIdentifiers = (filename, knownIds) => {
  const matches = [];
  for (const id of knownIds) {
    const result = filenameContainsId(filename, id);
    if (result.found) {
      matches.push({ id, confidence: result.confidence });
    }
  }
  return matches;
};

/**
 * Detect if the filename contains a known folder code (e.g. PRE_SALE, POST_SALE).
 */
const detectFolderCode = (filename, knownCodes) => {
  const tokens = extractTokens(filename);
  const normalizedName = normalizeFilename(filename);

  for (const code of knownCodes) {
    const lowerCode = code.toLowerCase();
    if (tokens.includes(lowerCode)) return code;
    if (normalizedName.includes(lowerCode.replace(/_/g, '_'))) return code;
  }
  return null;
};

/**
 * Detect if the filename ends with or contains a notice type (TRACKING, RECEIPT, NOTICE).
 */
const detectNoticeType = (filename) => {
  const tokens = extractTokens(filename);
  const upper = tokens.map(t => t.toUpperCase());
  if (upper.includes('TRACKING')) return 'TRACKING';
  if (upper.includes('RECEIPT')) return 'RECEIPT';
  if (upper.includes('POD')) return 'RECEIPT'; // Legacy compatibility
  if (upper.includes('NOTICE')) return 'NOTICE';
  return null;
};

// ─── Underscore-based filename parser ─────────────────────────────────────────

const parseFilenameByUnderscore = (filename) => {
  if (!filename || typeof filename !== 'string') {
    return { error: 'Empty or invalid filename' };
  }

  const ext = path.extname(filename).toLowerCase();
  const nameWithoutExt = ext ? filename.slice(0, -ext.length).trim() : filename.trim();

  if (!nameWithoutExt) {
    return { error: 'Filename is just an extension' };
  }

  const underscoreIndex = nameWithoutExt.indexOf('_');
  if (underscoreIndex === -1) {
    return { error: 'Invalid filename format: Missing underscore delimiter' };
  }

  const parts = nameWithoutExt.split('_');
  const loanNumber = parts[0].trim();
  const trackingNumber = parts.slice(1).join('_').trim();

  if (!loanNumber) {
    return { error: 'Invalid filename format: Empty loan number before underscore' };
  }

  return { loanNumber, trackingNumber: trackingNumber || null };
};

// ─── Legacy compatibility ────────────────────────────────────────────────────

/**
 * Parse a filename into component parts using the legacy pattern.
 */
const parseFilename = (filename) => {
  if (!filename || typeof filename !== 'string') {
    return { error: 'Empty or invalid filename' };
  }

  const ext = path.extname(filename).toLowerCase();
  const nameWithoutExt = ext ? filename.slice(0, -ext.length).trim() : filename.trim();

  if (!nameWithoutExt) {
    return { error: 'Filename is just an extension' };
  }

  const parts = nameWithoutExt.split(/[_\-\s]+/).filter(Boolean);

  if (parts.length < 1) {
    return { error: `Cannot parse filename "${filename}"` };
  }

  if (parts.length === 1) {
    return { loanNumber: parts[0], folderCode: null, noticeTypeEnum: null };
  }

  const loanNumber = parts[0];
  const lastPart = parts[parts.length - 1].toUpperCase();
  let noticeTypeEnum = null;
  let folderCodeParts;

  if (lastPart === 'TRACKING' || lastPart === 'RECEIPT' || lastPart === 'POD' || lastPart === 'NOTICE') {
    noticeTypeEnum = lastPart === 'POD' ? 'RECEIPT' : lastPart;
    folderCodeParts = parts.slice(1, -1);
  } else {
    folderCodeParts = parts.slice(1);
  }

  if (folderCodeParts.length === 0) {
    return { loanNumber, folderCode: null, noticeTypeEnum };
  }

  const folderCode = folderCodeParts.join('_').toUpperCase();

  return { loanNumber, folderCode, noticeTypeEnum };
};

const buildFullCode = (folderCode, noticeTypeEnum) => {
  if (!folderCode) return null;
  if (!noticeTypeEnum) return folderCode;
  return `${folderCode}_${noticeTypeEnum}`;
};

module.exports = {
  parseFilename,
  parseFilenameByUnderscore,
  buildFullCode,
  extractTokens,
  normalizeFilename,
  filenameContainsId,
  findMatchingIdentifiers,
  detectFolderCode,
  detectNoticeType,
};
