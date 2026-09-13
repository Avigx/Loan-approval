const XLSX = require('xlsx');
const Papa = require('papaparse');
const fs = require('fs');
const path = require('path');
const { v4: uuidv4 } = require('uuid');
const Document = require('../models/Document');
const Folder = require('../models/Folder');
const UploadBatch = require('../models/UploadBatch');
const { parseFilename, parseFilenameByUnderscore, buildFullCode, findMatchingIdentifiers, filenameContainsId, normalizeFilename } = require('./fileMapping.service');
const storageService = require('./storage.service');
const { writeAuditLog } = require('./audit.service');

/**
 * Generate a unique batch code.
 */
const generateBatchCode = () => {
  const timestamp = Date.now();
  const random = uuidv4().replace(/-/g, '').slice(0, 12).toUpperCase();
  return `BATCH_${timestamp}_${random}`;
};

/**
 * Parse flexible date values from Excel (strings, numbers, timestamps).
 * Supports: DD.MM.YYYY, DD/MM/YYYY, DD-MM-YYYY, YYYY-MM-DD, Excel serial numbers, Date objects.
 */
const parseFlexibleDate = (val) => {
  if (!val) return null;
  if (val instanceof Date && !isNaN(val.getTime())) return val;
  if (typeof val === 'number') {
    // Excel serial date (days since Dec 30 1899)
    return new Date(Math.round((val - 25569) * 86400 * 1000));
  }
  const str = String(val).trim();
  if (!str) return null;

  // Check DD.MM.YYYY, DD/MM/YYYY, DD-MM-YYYY
  const dmyMatch = str.match(/^(\d{1,2})[\.\/\-](\d{1,2})[\.\/\-](\d{2,4})$/);
  if (dmyMatch) {
    let day = parseInt(dmyMatch[1], 10);
    let month = parseInt(dmyMatch[2], 10) - 1; // 0-indexed in JS
    let year = parseInt(dmyMatch[3], 10);
    if (year < 100) year += 2000;
    const d = new Date(Date.UTC(year, month, day));
    if (!isNaN(d.getTime())) return d;
  }

  // Check DD-MMM-YYYY (e.g. 21-Jul-2026, 29-Aug-2026)
  const monthMap = { jan: 0, feb: 1, mar: 2, apr: 3, may: 4, jun: 5, jul: 6, aug: 7, sep: 8, oct: 9, nov: 10, dec: 11 };
  const dMonYMatch = str.match(/^(\d{1,2})[\.\/\-\s]([A-Za-z]{3,9})[\.\/\-\s](\d{2,4})$/);
  if (dMonYMatch) {
    let day = parseInt(dMonYMatch[1], 10);
    let monKey = dMonYMatch[2].toLowerCase().slice(0, 3);
    if (monthMap[monKey] !== undefined) {
      let month = monthMap[monKey];
      let year = parseInt(dMonYMatch[3], 10);
      if (year < 100) year += 2000;
      const d = new Date(Date.UTC(year, month, day));
      if (!isNaN(d.getTime())) return d;
    }
  }

  // Check YYYY-MM-DD, YYYY/MM/DD, YYYY.MM.DD
  const ymdMatch = str.match(/^(\d{4})[\.\/\-](\d{1,2})[\.\/\-](\d{1,2})$/);
  if (ymdMatch) {
    let year = parseInt(ymdMatch[1], 10);
    let month = parseInt(ymdMatch[2], 10) - 1;
    let day = parseInt(ymdMatch[3], 10);
    const d = new Date(Date.UTC(year, month, day));
    if (!isNaN(d.getTime())) return d;
  }

  const standard = new Date(str);
  return isNaN(standard.getTime()) ? null : standard;
};

/**
 * Map natural folder descriptions to standard system codes.
 */
const mapFolderToCode = (folderName) => {
  if (!folderName || typeof folderName !== 'string') return 'PRE_SALE';
  const lower = folderName.toLowerCase().trim();
  if (lower.includes('pre') && lower.includes('sale')) return 'PRE_SALE';
  if (lower.includes('post') && lower.includes('sale')) return 'POST_SALE';
  if (lower.includes('passa')) return 'PASSA';
  if (lower.includes('vin')) return 'VIN';
  return 'PRE_SALE'; // Default fallback
};

/**
 * Map natural notice type strings to enum.
 */
const mapNoticeTypeToEnum = (noticeTypeStr) => {
  if (!noticeTypeStr || typeof noticeTypeStr !== 'string') return 'NOTICE';
  const lower = noticeTypeStr.toLowerCase().trim();
  if (lower.includes('tracking')) return 'TRACKING';
  if (lower.includes('receipt') || lower.includes('pod')) return 'RECEIPT';
  return 'NOTICE';
};

/**
 * Parse an uploaded template file (xlsx or csv) into an array of row objects.
 * Supports standard template headers and common banking/legal export column names.
 */
const parseTemplate = (filePath) => {
  const ext = path.extname(filePath).toLowerCase();
  let rows = [];

  if (ext === '.xlsx' || ext === '.xls') {
    const workbook = XLSX.readFile(filePath);
    const sheetName = workbook.SheetNames[0];
    const sheet = workbook.Sheets[sheetName];
    rows = XLSX.utils.sheet_to_json(sheet, { defval: '' });
  } else if (ext === '.csv') {
    const csvContent = fs.readFileSync(filePath, 'utf-8');
    const parsed = Papa.parse(csvContent, { header: true, skipEmptyLines: true });
    rows = parsed.data;
  } else {
    throw new Error(`Unsupported template format: ${ext}`);
  }

  // Normalize column names
  return rows.map((row) => {
    const normalized = {};
    for (const [key, value] of Object.entries(row)) {
      const cleanKey = key.trim().replace(/\s+/g, '');
      const cleanLower = cleanKey.toLowerCase();
      const stringVal = typeof value === 'string' ? value.trim() : (value !== undefined && value !== null ? String(value).trim() : '');

      if (cleanLower.includes('loannumber') || cleanLower.includes('loanaccount') || cleanLower.includes('loanno') || cleanLower.includes('accountno')) {
        normalized.loanNumber = stringVal;
      } else if (cleanLower.includes('sourcefile') || cleanLower.includes('filename') || cleanLower === 'file') {
        normalized.sourceFileName = stringVal;
      } else if (cleanLower.includes('folder') || cleanLower.includes('foldercode')) {
        normalized.folder = stringVal;
      } else if (cleanLower.includes('noticetype') || cleanLower === 'type') {
        normalized.noticeType = stringVal;
      } else if (cleanLower.includes('address')) {
        normalized.address = stringVal;
      } else if (cleanLower.includes('coborrower') || cleanLower.includes('co-borrower') || cleanLower.includes('guarantor')) {
        normalized.coBorrower = stringVal;
      } else if (cleanLower.includes('borrowername') || cleanLower.includes('customername') || cleanLower.includes('clientname') || cleanLower.includes('borrower') || cleanLower.includes('customer')) {
        normalized.customerName = stringVal;
      } else if (cleanLower.includes('letterdate') || cleanLower.includes('dispatchdate') || cleanLower.includes('noticedate') || cleanLower === 'date') {
        normalized.dispatchDate = value;
      } else if (cleanLower.includes('tracking') || cleanLower.includes('dispatchmode') || cleanLower.includes('trackingnumber')) {
        normalized.trackingNumber = stringVal;
      } else {
        normalized[cleanKey] = stringVal;
      }
    }

    // Clean multiple loan numbers if comma or ampersand separated
    if (normalized.loanNumber) {
      const loanStr = String(normalized.loanNumber);
      const matches = loanStr.match(/[A-Za-z0-9]+/g);
      if (matches && matches.length > 0) {
        normalized.primaryLoanNumber = matches[0];
        normalized.allLoanNumbers = matches;
      }
    }

    // Infer folder code
    if (normalized.folder) {
      normalized.folderCode = mapFolderToCode(normalized.folder);
    }
    
    // Infer notice type enum
    if (normalized.noticeType) {
      normalized.noticeTypeEnum = mapNoticeTypeToEnum(normalized.noticeType);
    }

    return normalized;
  });
};

/**
 * Process a bulk upload batch.
 *
 * @param {object} params
 * @param {object} params.templateFile - Multer file object for the template
 * @param {object[]} params.documentFiles - Array of multer file objects for documents
 * @param {string} params.clientId - Client/tenant ID
 * @param {string} params.userId - Uploading user's ID
 * @param {string} params.batchName - Optional user-provided batch name
 * @returns {Promise<object>} The created UploadBatch document
 */
const processBulkUpload = async ({ templateFile, documentFiles, clientId, userId, batchName }) => {
  const batchCode = generateBatchCode();

  // Create the batch record
  const batch = await UploadBatch.create({
    batchCode,
    batchName: batchName || '',
    clientId,
    uploadedById: userId,
    templateFilePath: templateFile.path,
    status: 'processing',
  });

  processInBackground(batch, templateFile, documentFiles, clientId, userId).catch((err) => {
    console.error(`Batch ${batchCode} processing failed:`, err);
  });

  return batch;
};

/**
 * Background processing logic for a bulk upload batch.
 * Features intelligent multi-strategy file matching.
 */
const processInBackground = async (batch, templateFile, documentFiles, clientId, userId) => {
  const errors = [];
  const successFiles = [];
  let successCount = 0;
  let failCount = 0;

  try {
    // 1. Parse the template
    const rows = parseTemplate(templateFile.path);
    batch.totalRows = rows.length;
    await batch.save();

    // 2. Prepare indexed pool of candidate document files
    const fileEntries = documentFiles.map((file) => {
      const originalName = file.originalname.trim();
      const ext = path.extname(originalName).toLowerCase();
      const baseName = originalName.slice(0, -ext.length).trim();
      const parsed = parseFilename(originalName);
      const underscoreParsed = parseFilenameByUnderscore(originalName);
      let fullCode = null;
      if (!parsed.error) {
        fullCode = buildFullCode(parsed.noticeCode, parsed.variant);
      }
      return {
        file,
        originalName,
        lowerName: originalName.toLowerCase(),
        baseName,
        lowerBaseName: baseName.toLowerCase(),
        parsed: parsed.error ? null : parsed,
        underscoreParsed: underscoreParsed.error ? null : underscoreParsed,
        fullCode,
        matched: false,
      };
    });

    // 3. Load all active Folders for this client (including global ones)
    const folders = await Folder.find({
      $or: [{ clientId }, { clientId: null }],
      active: true,
    });
    const folderMap = new Map();
    for (const f of folders) {
      folderMap.set(f.code.toUpperCase(), f);
    }

    // 4. Process each template row
    for (let i = 0; i < rows.length; i++) {
      const row = rows[i];
      const rowNum = i + 2; // +2 because row 1 is headers, 0-indexed

      try {
        const effectiveLoanNumber = row.primaryLoanNumber || row.loanNumber;

        // Validate required fields
        if (!effectiveLoanNumber) {
          errors.push({ row: rowNum, fileName: null, error: 'Missing Loan Number in template' });
          failCount++;
          continue;
        }

        const normalizedFolderCode = (row.folderCode || 'PRE_SALE').toUpperCase();
        const noticeTypeEnum = row.noticeTypeEnum || 'NOTICE';

        // Look up folder
        let folder = folderMap.get(normalizedFolderCode);
        if (!folder) {
          // Fallback to first available folder
          folder = folderMap.get('PRE_SALE') || folders[0];
        }

        if (!folder) {
          errors.push({ row: rowNum, fileName: null, error: 'No folders configured in the system' });
          failCount++;
          continue;
        }

        // Multi-strategy file matching (robust — no position-based filename assumptions)
        let matchedEntry = null;

        // Strategy 1: Explicit Source File Name match (preserved from original)
        if (row.sourceFileName) {
          const sTarget = row.sourceFileName.trim().toLowerCase();
          const sBase = sTarget.replace(/\.[^/.]+$/, '');
          matchedEntry = fileEntries.find(
            (e) => !e.matched && (
              e.lowerName === sTarget ||
              e.lowerBaseName === sBase ||
              e.lowerBaseName.replace(/\s+/g, '') === sBase.replace(/\s+/g, '') ||
              e.lowerBaseName.replace(/_+/g, '_') === sBase.replace(/_+/g, '_')
            )
          );
        }

        // Strategy 2: Underscore-based matching — use loan number from filename
        if (!matchedEntry) {
          for (const entry of fileEntries) {
            if (entry.matched) continue;
            if (entry.underscoreParsed && entry.underscoreParsed.loanNumber) {
              if (entry.underscoreParsed.loanNumber.toLowerCase() === effectiveLoanNumber.toLowerCase()) {
                matchedEntry = entry;
                break;
              }
            }
          }
        }

        // Strategy 3: Robust identifier-based matching
        // Find unmatched files whose filename contains this row's loan number
        if (!matchedEntry) {
          const loansToCheck = [effectiveLoanNumber, row.loanNumber, ...(row.allLoanNumbers || [])].filter(Boolean);
          const candidateEntries = [];

          for (const entry of fileEntries) {
            if (entry.matched) continue;

            for (const loan of loansToCheck) {
              const result = filenameContainsId(entry.originalName, loan);
              if (result.found) {
                candidateEntries.push({ entry, loan, confidence: result.confidence });
                break; // This file matches at least one loan; no need to check more loans
              }
            }
          }

          if (candidateEntries.length === 1) {
            matchedEntry = candidateEntries[0].entry;
          } else if (candidateEntries.length > 1) {
            // Multiple files match this loan — try to narrow by folder code
            const narrowed = candidateEntries.filter((c) => {
              if (!c.entry.parsed || !c.entry.parsed.noticeCode) return false;
              return c.entry.parsed.noticeCode === normalizedFolderCode ||
                     c.entry.fullCode === normalizedFolderCode;
            });

            if (narrowed.length === 1) {
              matchedEntry = narrowed[0].entry;
            } else {
              // Prefer exact token matches over substring matches
              const exactMatches = candidateEntries.filter(c => c.confidence === 'exact');
              if (exactMatches.length === 1) {
                matchedEntry = exactMatches[0].entry;
              } else if (exactMatches.length > 1) {
                // Further narrow: pick the one with the fewest extra tokens (closest match)
                exactMatches.sort((a, b) => {
                  const aTokens = a.entry.baseName.split(/[_\-\s]+/).length;
                  const bTokens = b.entry.baseName.split(/[_\-\s]+/).length;
                  return aTokens - bTokens;
                });
                matchedEntry = exactMatches[0].entry;
              } else if (candidateEntries.length > 0) {
                matchedEntry = candidateEntries[0].entry;
              }
            }
          }
        }

        // Strategy 4: Fallback — filename starts with or exactly matches loan number
        if (!matchedEntry) {
          const loansToCheck = [effectiveLoanNumber, row.loanNumber, ...(row.allLoanNumbers || [])].filter(Boolean);
          for (const l of loansToCheck) {
            const cleanL = String(l).trim().toLowerCase();
            matchedEntry = fileEntries.find(
              (e) => !e.matched && (
                e.lowerBaseName === cleanL ||
                e.lowerBaseName.startsWith(cleanL + '_') ||
                e.lowerBaseName.startsWith(cleanL + '-') ||
                e.lowerBaseName.startsWith(cleanL + ' ')
              )
            );
            if (matchedEntry) break;
          }
        }

        if (!matchedEntry) {
          errors.push({
            row: rowNum,
            fileName: row.sourceFileName || null,
            error: `No matching file found for Loan ${effectiveLoanNumber} (Folder: ${normalizedFolderCode}, Type: ${noticeTypeEnum})`,
          });
          failCount++;
          continue;
        }

        // Mark candidate as matched so it won't be used twice
        matchedEntry.matched = true;

        // Extract tracking number from filename if not provided in template
        let trackingNumber = row.trackingNumber || null;
        if (!trackingNumber && matchedEntry.underscoreParsed && matchedEntry.underscoreParsed.trackingNumber) {
          trackingNumber = matchedEntry.underscoreParsed.trackingNumber;
        }

        // Store the file in a batch subdirectory
        const stored = await storageService.moveToSubDir(matchedEntry.file, batch.batchCode);

        // Create Document record
        // UniqueRef logic: loanNumber_folderCode_noticeType
        const uniqueRef = `${effectiveLoanNumber}_${normalizedFolderCode}_${noticeTypeEnum}`;
        
        await Document.create({
          loanNumber: effectiveLoanNumber,
          uniqueRef,
          customerName: row.customerName || null,
          folderId: folder._id,
          noticeType: noticeTypeEnum,
          dispatchDate: parseFlexibleDate(row.dispatchDate),
          trackingNumber,
          filePath: stored.relativePath,
          fileType: path.extname(matchedEntry.file.originalname).replace('.', '').toLowerCase(),
          fileSizeBytes: stored.sizeBytes,
          clientId,
          batchId: batch._id,
        });

        successFiles.push({
          fileName: matchedEntry.originalName,
          loanNumber: effectiveLoanNumber,
        });
        successCount++;
      } catch (rowErr) {
        errors.push({ row: rowNum, fileName: null, error: rowErr.message });
        failCount++;
      }
    }

    // 5. Report any files that were uploaded but not matched to any row
    for (const entry of fileEntries) {
      if (!entry.matched) {
        errors.push({
          fileName: entry.originalName,
          error: 'No matching row in template found for this file',
        });
        failCount++;
      }
    }

    // 6. Update batch status
    batch.successfulRows = successCount;
    batch.failedRows = failCount;
    batch.successFiles = successFiles;
    batch.errorLog = errors;
    batch.status = failCount === batch.totalRows && batch.totalRows > 0 ? 'failed' : 'completed';
    await batch.save();

    // Audit log
    writeAuditLog({
      action: 'upload',
      userId,
      entityType: 'UploadBatch',
      entityId: batch._id,
      clientId,
      details: {
        batchCode: batch.batchCode,
        batchName: batch.batchName,
        totalRows: batch.totalRows,
        successfulRows: successCount,
        failedRows: failCount,
      },
    });
  } catch (err) {
    batch.status = 'failed';
    batch.errorLog = [...errors, { error: `Batch processing error: ${err.message}` }];
    await batch.save();
    throw err;
  }
};

/**
 * Generate a downloadable template with the correct headers.
 * Returns a Buffer of an xlsx file.
 */
const generateTemplate = () => {
  const headers = [
    'Loan Number',
    'Folder',
    'Customer Name',
    'Dispatch Date',
    'Tracking Number',
    'Notice Type'
  ];

  const workbook = XLSX.utils.book_new();
  const worksheet = XLSX.utils.aoa_to_sheet([headers]);
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Template');
  return XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' });
};

module.exports = { processBulkUpload, generateTemplate, generateBatchCode, parseTemplate };
