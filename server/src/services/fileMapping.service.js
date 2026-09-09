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
 * Uses word-boundary–aware matching: the identifier must appear as a distinct
 * substring, not buried inside a larger unrelated token.
 *
 * For example, if knownId = "12345":
 *   "12345_NOTICE.pdf"      → true
 *   "NOTICE_12345_FINAL.pdf" → true
 *   "X12345Y.pdf"           → true  (substring match — intentionally permissive)
 *   "123456.pdf"            → false (longer number containing 12345)
 *
 * We use a two-phase approach:
 *   1. Exact token match (high confidence)
 *   2. Substring match in the full normalized name (lower confidence)
 *
 * @param {string} filename
 * @param {string} knownId
 * @returns {{ found: boolean, confidence: 'exact'|'substring'|'none' }}
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
    // Guard against partial numeric matches: if the ID is purely numeric,
    // verify it's not part of a longer number in the filename
    if (/^\d+$/.test(normalizedId)) {
      // Build a regex that ensures the ID is bounded by non-digit or string edge
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

/**
 * Escape a string for use in a RegExp.
 */
const escapeRegex = (str) => str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

/**
 * Given a filename and a set of known identifiers (e.g. loan numbers from the
 * template), find which known IDs appear in the filename.
 *
 * @param {string} filename
 * @param {string[]} knownIds - Array of known identifiers
 * @returns {{ id: string, confidence: string }[]} Matched identifiers
 */
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
 * Detect if the filename contains a known folder code (e.g. INVO, LEGAL, DEMAND).
 * @param {string} filename
 * @param {string[]} knownFolderCodes
 * @returns {string|null} The matched folder code, or null
 */
const detectFolderCode = (filename, knownFolderCodes) => {
  const tokens = extractTokens(filename);
  const normalizedName = normalizeFilename(filename);

  for (const code of knownFolderCodes) {
    const lowerCode = code.toLowerCase();
    // Exact token match
    if (tokens.includes(lowerCode)) return code;
    // Check compound codes like INVO_POD
    if (normalizedName.includes(lowerCode.replace(/_/g, '_'))) return code;
  }
  return null;
};

/**
 * Detect if the filename ends with or contains a variant suffix (TRACKING or POD).
 * @param {string} filename
 * @returns {string|null}
 */
const detectVariant = (filename) => {
  const tokens = extractTokens(filename);
  const upper = tokens.map(t => t.toUpperCase());
  if (upper.includes('TRACKING')) return 'TRACKING';
  if (upper.includes('POD')) return 'POD';
  return null;
};

// ─── Legacy compatibility ────────────────────────────────────────────────────

/**
 * Parse a filename into component parts using the legacy pattern.
 * Retained for backward compatibility with existing callers.
 *
 * Enhanced: now handles arbitrary filename structures gracefully instead of
 * returning hard errors. Falls back to best-effort extraction.
 *
 * @param {string} filename
 * @returns {{ loanNumber: string, folderCode: string, variant: string|null } | { error: string }}
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

  // Split by common separators
  const parts = nameWithoutExt.split(/[_\-\s]+/).filter(Boolean);

  if (parts.length < 1) {
    return { error: `Cannot parse filename "${filename}"` };
  }

  // If only one part, treat it as the loan number with no folder code
  if (parts.length === 1) {
    return { loanNumber: parts[0], folderCode: null, variant: null };
  }

  // First part is the best guess for Loan Number
  const loanNumber = parts[0];

  // Check if the last part is a known variant suffix
  const lastPart = parts[parts.length - 1].toUpperCase();
  let variant = null;
  let folderCodeParts;

  if (lastPart === 'TRACKING' || lastPart === 'POD') {
    variant = lastPart;
    folderCodeParts = parts.slice(1, -1);
  } else {
    folderCodeParts = parts.slice(1);
  }

  // If no folder code parts remain after removing variant, return what we have
  if (folderCodeParts.length === 0) {
    return { loanNumber, folderCode: null, variant };
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

module.exports = {
  parseFilename,
  buildFullFolderCode,
  extractTokens,
  normalizeFilename,
  filenameContainsId,
  findMatchingIdentifiers,
  detectFolderCode,
  detectVariant,
};
