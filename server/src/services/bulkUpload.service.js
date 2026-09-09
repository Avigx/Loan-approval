const XLSX = require('xlsx');
const Papa = require('papaparse');
const fs = require('fs');
const path = require('path');
const { v4: uuidv4 } = require('uuid');
const Document = require('../models/Document');
const FolderType = require('../models/FolderType');
const UploadBatch = require('../models/UploadBatch');
const { parseFilename, buildFullFolderCode, findMatchingIdentifiers, filenameContainsId, normalizeFilename } = require('./fileMapping.service');
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
 * Map natural document type descriptions to standard system folder codes.
 */
const mapDocumentTypeToFolderCode = (docType) => {
  if (!docType || typeof docType !== 'string') return 'LEGAL';
  const upper = docType.toUpperCase();
  if (upper.includes('SARFAESI') || upper.includes('LEGAL') || upper.includes('13(2)')) return 'LEGAL';
  if (upper.includes('DEMAND')) return 'DEMAND';
  if (upper.includes('REPLY') || upper.includes('ACK') || upper.includes('ACKNOWLEDGEMENT')) return 'ACK';
  if (upper.includes('SETTLEMENT') || upper.includes('OTS')) return 'SETTLE';
  if (upper.includes('RECOVERY') || upper.includes('RECOV')) return 'RECOV';
  if (upper.includes('REMINDER') || upper.includes('REMIND')) return 'REMIND';
  if (upper.includes('ARBITRATION') || upper.includes('ARB')) return 'ARB';
  if (upper.includes('CONCILIATION') || upper.includes('CONC')) return 'CONC';
  if (upper.includes('INVOCATION') || upper.includes('INVO')) return 'INVO';
  if (upper.includes('AGREEMENT') || upper.includes('CONTRACT')) return 'AGREE';
  if (upper.includes('PAYMENT') || upper.includes('PROOF')) return 'PAY';
  if (upper.includes('REFERENCE') || upper.includes('REF')) return 'REF';
  return 'SUPPORT';
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
      } else if (cleanLower.includes('foldercode') || cleanLower === 'folder') {
        normalized.folderCode = stringVal;
      } else if (cleanLower.includes('documenttype') || cleanLower.includes('noticetype') || cleanLower === 'type') {
        normalized.documentType = stringVal;
      } else if (cleanLower.includes('address')) {
        normalized.address = stringVal;
      } else if (cleanLower.includes('coborrower') || cleanLower.includes('co-borrower') || cleanLower.includes('guarantor')) {
        normalized.coBorrower = stringVal;
      } else if (cleanLower.includes('borrowername') || cleanLower.includes('customername') || cleanLower.includes('clientname') || cleanLower.includes('borrower') || cleanLower.includes('customer')) {
        normalized.customerName = stringVal;
      } else if (cleanLower.includes('letterdate') || cleanLower.includes('dispatchdate') || cleanLower.includes('noticedate') || cleanLower === 'date') {
        normalized.dispatchDate = value;
      } else if (cleanLower.includes('tracking') || cleanLower.includes('dispatchmode')) {
        normalized.trackingNumber = stringVal;
      } else if (cleanLower.includes('remark') || cleanLower.includes('notes') || cleanLower.includes('note')) {
        normalized.remark = stringVal;
      } else if (cleanLower.includes('podstatus') || cleanLower.includes('status') || cleanLower.includes('actionrequired')) {
        normalized.podStatus = stringVal;
      } else if (cleanLower.includes('poddate')) {
        normalized.podDate = value;
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

    // Infer folderCode from documentType if folderCode is empty
    if (!normalized.folderCode && normalized.documentType) {
      normalized.folderCode = mapDocumentTypeToFolderCode(normalized.documentType);
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
 * @returns {Promise<object>} The created UploadBatch document
 */
const processBulkUpload = async ({ templateFile, documentFiles, clientId, userId }) => {
  const batchCode = generateBatchCode();

  // Create the batch record
  const batch = await UploadBatch.create({
    batchCode,
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
      let fullCode = null;
      if (!parsed.error) {
        fullCode = buildFullFolderCode(parsed.folderCode, parsed.variant);
      }
      return {
        file,
        originalName,
        lowerName: originalName.toLowerCase(),
        baseName,
        lowerBaseName: baseName.toLowerCase(),
        parsed: parsed.error ? null : parsed,
        fullCode,
        matched: false,
      };
    });

    // 3. Load all active FolderTypes for this client (including global ones)
    const folderTypes = await FolderType.find({
      $or: [{ clientId }, { clientId: null }],
      active: true,
    });
    const folderTypeMap = new Map();
    for (const ft of folderTypes) {
      folderTypeMap.set(ft.folderCode.toUpperCase(), ft);
    }

    // 4. Process each template row
    for (let i = 0; i < rows.length; i++) {
      const row = rows[i];
      const rowNum = i + 2; // +2 because row 1 is headers, 0-indexed

      try {
        const effectiveLoanNumber = row.primaryLoanNumber || row.loanNumber;

        // Validate required fields
        if (!effectiveLoanNumber) {
          errors.push({ row: rowNum, error: 'Missing Loan Number in template' });
          failCount++;
          continue;
        }

        const normalizedFolderCode = (row.folderCode || 'LEGAL').toUpperCase();

        // Look up folder type
        let folderType = folderTypeMap.get(normalizedFolderCode);
        if (!folderType) {
          // Fallback to SUPPORT if folder code isn't recognized
          folderType = folderTypeMap.get('SUPPORT') || folderTypes[0];
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

        // Strategy 2: Robust identifier-based matching
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
              if (!c.entry.parsed || !c.entry.parsed.folderCode) return false;
              return c.entry.parsed.folderCode === normalizedFolderCode ||
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

        // Strategy 3: Fallback — filename starts with or exactly matches loan number
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
            error: `No matching file found for Loan ${effectiveLoanNumber} (Folder: ${normalizedFolderCode}${row.sourceFileName ? `, Source File: ${row.sourceFileName}` : ''})`,
          });
          failCount++;
          continue;
        }

        // Mark candidate as matched so it won't be used twice
        matchedEntry.matched = true;

        // Store the file in a batch subdirectory
        const stored = await storageService.moveToSubDir(matchedEntry.file, batch.batchCode);

        // Create Document record
        const uniqueRef = `${effectiveLoanNumber}_${normalizedFolderCode}`;
        await Document.create({
          loanNumber: effectiveLoanNumber,
          uniqueRef,
          customerName: row.customerName || null,
          folderTypeId: folderType._id,
          dispatchDate: parseFlexibleDate(row.dispatchDate),
          podStatus: row.podStatus || null,
          podDate: parseFlexibleDate(row.podDate),
          trackingNumber: row.trackingNumber || null,
          remark: row.remark || null,
          filePath: stored.relativePath,
          fileType: path.extname(matchedEntry.file.originalname).replace('.', '').toLowerCase(),
          fileSizeBytes: stored.sizeBytes,
          clientId,
          batchId: batch._id,
        });

        successCount++;
      } catch (rowErr) {
        errors.push({ row: rowNum, error: rowErr.message });
        failCount++;
      }
    }

    // 5. Report any files that were uploaded but not matched to any row
    for (const entry of fileEntries) {
      if (!entry.matched) {
        errors.push({
          file: entry.originalName,
          error: 'No matching row in template found for this file',
        });
        failCount++;
      }
    }

    // 6. Update batch status
    batch.successfulRows = successCount;
    batch.failedRows = failCount;
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
    'loanNumber',
    'folderCode',
    'customerName',
    'dispatchDate',
    'podStatus',
    'podDate',
    'trackingNumber',
    'remark',
  ];

  const workbook = XLSX.utils.book_new();
  const worksheet = XLSX.utils.aoa_to_sheet([headers]);
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Template');
  return XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' });
};

module.exports = { processBulkUpload, generateTemplate, generateBatchCode, parseTemplate };
