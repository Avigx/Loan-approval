const fs = require('fs');
const path = require('path');
const {
  S3Client,
  PutObjectCommand,
  GetObjectCommand,
  HeadObjectCommand,
  DeleteObjectCommand,
} = require('@aws-sdk/client-s3');
const env = require('../config/env');

const STORAGE_BASE = path.resolve(__dirname, '../../storage');

// Ensure local storage directory exists
if (!fs.existsSync(STORAGE_BASE)) {
  fs.mkdirSync(STORAGE_BASE, { recursive: true });
}

/**
 * Local disk storage implementation.
 */
class LocalStorageService {
  getAbsolutePath(relativePath) {
    return path.resolve(STORAGE_BASE, relativePath);
  }

  async storeFile(file, subDir = '') {
    const targetDir = subDir
      ? path.join(STORAGE_BASE, subDir)
      : STORAGE_BASE;

    if (!fs.existsSync(targetDir)) {
      fs.mkdirSync(targetDir, { recursive: true });
    }

    const relativePath = subDir
      ? path.join(subDir, file.filename)
      : file.filename;

    return {
      relativePath,
      absolutePath: file.path,
      sizeBytes: file.size,
    };
  }

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

  exists(relativePath) {
    return fs.existsSync(path.resolve(STORAGE_BASE, relativePath));
  }

  getReadStream(relativePath) {
    const absPath = path.resolve(STORAGE_BASE, relativePath);
    if (!fs.existsSync(absPath)) {
      throw new Error(`File not found on local storage: ${relativePath}`);
    }
    return fs.createReadStream(absPath);
  }

  async deleteFile(relativePath) {
    const absPath = path.resolve(STORAGE_BASE, relativePath);
    if (fs.existsSync(absPath)) {
      fs.unlinkSync(absPath);
    }
  }
}

/**
 * S3-compatible cloud storage implementation (Cloudflare R2, Supabase Storage, AWS S3, etc.).
 */
class S3StorageService {
  constructor() {
    const clientConfig = {
      region: env.S3_REGION || 'auto',
    };

    if (env.S3_ENDPOINT) {
      clientConfig.endpoint = env.S3_ENDPOINT;
    }

    if (env.S3_ACCESS_KEY_ID && env.S3_SECRET_ACCESS_KEY) {
      clientConfig.credentials = {
        accessKeyId: env.S3_ACCESS_KEY_ID,
        secretAccessKey: env.S3_SECRET_ACCESS_KEY,
      };
    }

    if (env.S3_FORCE_PATH_STYLE) {
      clientConfig.forcePathStyle = true;
    }

    this.client = new S3Client(clientConfig);
    this.bucket = env.S3_BUCKET;
  }

  getAbsolutePath(relativePath) {
    return null; // Not on local disk
  }

  formatKey(relativePath) {
    return relativePath.replace(/\\/g, '/');
  }

  async storeFile(file, subDir = '') {
    const relativePath = subDir
      ? path.join(subDir, file.filename)
      : file.filename;
    const key = this.formatKey(relativePath);

    const fileStream = fs.createReadStream(file.path);
    await this.client.send(
      new PutObjectCommand({
        Bucket: this.bucket,
        Key: key,
        Body: fileStream,
        ContentType: file.mimetype || 'application/octet-stream',
      })
    );

    // Clean up temporary multer upload file
    try {
      if (fs.existsSync(file.path)) fs.unlinkSync(file.path);
    } catch (_) {}

    return {
      relativePath,
      absolutePath: null,
      sizeBytes: file.size,
    };
  }

  async moveToSubDir(file, subDir) {
    const relativePath = path.join(subDir, file.filename);
    const key = this.formatKey(relativePath);

    const fileStream = fs.createReadStream(file.path);
    await this.client.send(
      new PutObjectCommand({
        Bucket: this.bucket,
        Key: key,
        Body: fileStream,
        ContentType: file.mimetype || 'application/octet-stream',
      })
    );

    // Clean up temporary multer upload file
    try {
      if (fs.existsSync(file.path)) fs.unlinkSync(file.path);
    } catch (_) {}

    return {
      relativePath,
      absolutePath: null,
      sizeBytes: file.size,
    };
  }

  async exists(relativePath) {
    try {
      const key = this.formatKey(relativePath);
      await this.client.send(
        new HeadObjectCommand({
          Bucket: this.bucket,
          Key: key,
        })
      );
      return true;
    } catch (err) {
      if (err.name === 'NotFound' || err.$metadata?.httpStatusCode === 404) {
        return false;
      }
      console.warn(`[S3StorageService] Check file exists error for ${relativePath}:`, err.message);
      return false;
    }
  }

  async getReadStream(relativePath) {
    const key = this.formatKey(relativePath);
    const res = await this.client.send(
      new GetObjectCommand({
        Bucket: this.bucket,
        Key: key,
      })
    );
    return res.Body; // In Node.js @aws-sdk/client-s3, res.Body is a readable stream
  }

  async deleteFile(relativePath) {
    const key = this.formatKey(relativePath);
    await this.client.send(
      new DeleteObjectCommand({
        Bucket: this.bucket,
        Key: key,
      })
    );
  }
}

/**
 * Hybrid storage service: writes to local disk AND cloud bucket.
 * Reads from local disk first if available, falls back to cloud.
 */
class HybridStorageService {
  constructor(localService, s3Service) {
    this.local = localService;
    this.s3 = s3Service;
  }

  getAbsolutePath(relativePath) {
    return this.local.getAbsolutePath(relativePath);
  }

  async storeFile(file, subDir = '') {
    const localResult = await this.local.storeFile(file, subDir);
    try {
      const fileStream = fs.createReadStream(localResult.absolutePath);
      const key = this.s3.formatKey(localResult.relativePath);
      await this.s3.client.send(
        new PutObjectCommand({
          Bucket: this.s3.bucket,
          Key: key,
          Body: fileStream,
          ContentType: file.mimetype || 'application/octet-stream',
        })
      );
    } catch (err) {
      console.warn(`[HybridStorage] Upload to cloud backup failed for ${localResult.relativePath}:`, err.message);
    }
    return localResult;
  }

  async moveToSubDir(file, subDir) {
    const localResult = await this.local.moveToSubDir(file, subDir);
    try {
      const fileStream = fs.createReadStream(localResult.absolutePath);
      const key = this.s3.formatKey(localResult.relativePath);
      await this.s3.client.send(
        new PutObjectCommand({
          Bucket: this.s3.bucket,
          Key: key,
          Body: fileStream,
          ContentType: file.mimetype || 'application/octet-stream',
        })
      );
    } catch (err) {
      console.warn(`[HybridStorage] Upload to cloud backup failed for ${localResult.relativePath}:`, err.message);
    }
    return localResult;
  }

  async exists(relativePath) {
    if (this.local.exists(relativePath)) {
      return true;
    }
    return await this.s3.exists(relativePath);
  }

  async getReadStream(relativePath) {
    if (this.local.exists(relativePath)) {
      return this.local.getReadStream(relativePath);
    }
    return await this.s3.getReadStream(relativePath);
  }

  async deleteFile(relativePath) {
    await Promise.allSettled([
      this.local.deleteFile(relativePath),
      this.s3.deleteFile(relativePath),
    ]);
  }
}

// Select active storage service based on environment configuration
let storageService;

if (env.STORAGE_MODE === 's3') {
  if (!env.S3_BUCKET) {
    console.warn('⚠️ [Storage] STORAGE_MODE is "s3" but S3_BUCKET is not configured. Falling back to local storage.');
    storageService = new LocalStorageService();
  } else {
    storageService = new S3StorageService();
  }
} else if (env.STORAGE_MODE === 'both') {
  if (!env.S3_BUCKET) {
    console.warn('⚠️ [Storage] STORAGE_MODE is "both" but S3_BUCKET is not configured. Using local storage until cloud credentials are set.');
    storageService = new LocalStorageService();
  } else {
    storageService = new HybridStorageService(new LocalStorageService(), new S3StorageService());
  }
} else {
  storageService = new LocalStorageService();
}

module.exports = storageService;
