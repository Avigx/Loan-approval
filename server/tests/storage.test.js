import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import fs from 'fs';
import path from 'path';
import storageService from '../src/services/storage.service';

describe('Storage Service', () => {
  const testSubDir = 'test-batch';
  const testFileName = 'test-doc.txt';
  const testContent = 'Hello Legal Notice DMS Storage';
  let tempFilePath;

  beforeEach(() => {
    tempFilePath = path.resolve(__dirname, 'temp-test-file.txt');
    fs.writeFileSync(tempFilePath, testContent, 'utf-8');
  });

  afterEach(async () => {
    if (fs.existsSync(tempFilePath)) {
      fs.unlinkSync(tempFilePath);
    }
    const relativePath = path.join(testSubDir, testFileName);
    await storageService.deleteFile(relativePath);
    const dir = path.resolve(__dirname, '../../storage', testSubDir);
    if (fs.existsSync(dir)) {
      try {
        fs.rmdirSync(dir);
      } catch (_) {}
    }
  });

  it('should store and read back a file locally', async () => {
    const mockFile = {
      filename: testFileName,
      path: tempFilePath,
      size: Buffer.byteLength(testContent),
      mimetype: 'text/plain',
    };

    const stored = await storageService.moveToSubDir(mockFile, testSubDir);
    expect(stored.relativePath).toBe(path.join(testSubDir, testFileName));

    const exists = await storageService.exists(stored.relativePath);
    expect(exists).toBe(true);

    const stream = await storageService.getReadStream(stored.relativePath);
    let chunks = '';
    for await (const chunk of stream) {
      chunks += chunk.toString();
    }
    expect(chunks).toBe(testContent);
  });
});
