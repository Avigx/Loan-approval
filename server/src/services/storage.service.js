const fs = require('fs');
const path = require('path');
const env = require('../config/env');

const STORAGE_BASE = path.resolve(__dirname, '../../storage');

// Ensure storage directory exists
if (!fs.existsSync(STORAGE_BASE)) {
  fs.mkdirSync(STORAGE_BASE, { recursive: true });
}

/**
 * Storage interface — local disk implementation.
 * Designed to be swapped for S3-compatible object storage in production
 * without touching calling code. To add S3:
 *   1. Create an S3StorageService with the same method signatures
 *   2. Switch the export based on env.STORAGE_MODE
 *
 * TODO: For production, implement S3StorageService using @aws-sdk/client-s3
 */
class LocalStorageService {
  /**
   * Get the absolute path of a stored file.
   * @param {string} relativePath - Path relative to storage base
   * @returns {string}
   */
  getAbsolutePath(relativePath) {
    return path.resolve(STORAGE_BASE, relativePath);
  }

  /**
   * Store a file (already written to disk by multer).
   * Returns the relative path for DB storage.
   * @param {object} file - Multer file object
   * @param {string} subDir - Optional subdirectory (e.g. batch ID)
   * @returns {{ relativePath: string, absolutePath: string, sizeBytes: number }}
   */
  async storeFile(file, subDir = '') {
    const targetDir = subDir
      ? path.join(STORAGE_BASE, subDir)
      : STORAGE_BASE;

    if (!fs.existsSync(targetDir)) {
      fs.mkdirSync(targetDir, { recursive: true });
    }

    // Multer has already written the file; just return the paths
    const relativePath = subDir
      ? path.join(subDir, file.filename)
      : file.filename;

    return {
      relativePath,
      absolutePath: file.path,
      sizeBytes: file.size,
    };
  }

  /**
   * Move a file from its current multer location to a batch subdirectory.
   * @param {object} file - Multer file object
   * @param {string} subDir - Subdirectory name (e.g. batch code)
   * @returns {{ relativePath: string, absolutePath: string, sizeBytes: number }}
   */
  async moveToSubDir(file, subDir) {
    const targetDir = path.join(STORAGE_BASE, subDir);
    if (!fs.existsSync(targetDir)) {
      fs.mkdirSync(targetDir, { recursive: true });
    }

    const newPath = path.join(targetDir, file.filename);
    fs.renameSync(file.path, newPath);

    return {
      relativePath: path.join(subDir, file.filename),
      absolutePath: newPath,
      sizeBytes: file.size,
    };
  }

  /**
   * Check if a file exists.
   * @param {string} relativePath
   * @returns {boolean}
   */
  exists(relativePath) {
    return fs.existsSync(path.resolve(STORAGE_BASE, relativePath));
  }

  /**
   * Get a read stream for file download.
   * @param {string} relativePath
   * @returns {fs.ReadStream}
   */
  getReadStream(relativePath) {
    const absPath = path.resolve(STORAGE_BASE, relativePath);
    if (!fs.existsSync(absPath)) {
      throw new Error(`File not found: ${relativePath}`);
    }
    return fs.createReadStream(absPath);
  }

  /**
   * Delete a stored file.
   * @param {string} relativePath
   */
  async deleteFile(relativePath) {
    const absPath = path.resolve(STORAGE_BASE, relativePath);
    if (fs.existsSync(absPath)) {
      fs.unlinkSync(absPath);
    }
  }
}

// Export the appropriate implementation based on env
// TODO: Add S3StorageService when STORAGE_MODE === 's3'
const storageService = new LocalStorageService();

module.exports = storageService;
