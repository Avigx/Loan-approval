// fileMapping.test.js
// Using vitest globals (configured in vitest.config.js with globals: true)
const { parseFilename, buildFullFolderCode } = require('../src/services/fileMapping.service');

describe('fileMapping.service', () => {
  describe('parseFilename', () => {
    it('should parse a basic filename: LoanNumber_FolderCode.ext', () => {
      const result = parseFilename('L9001020228468693_INVO.pdf');
      expect(result).toEqual({
        loanNumber: 'L9001020228468693',
        folderCode: 'INVO',
        variant: null,
      });
    });

    it('should parse a TRACKING filename', () => {
      const result = parseFilename('L9001020228468693_INVO_TRACKING.pdf');
      expect(result).toEqual({
        loanNumber: 'L9001020228468693',
        folderCode: 'INVO',
        variant: 'TRACKING',
      });
    });

    it('should parse a POD filename', () => {
      const result = parseFilename('L9001020228468693_INVO_POD.pdf');
      expect(result).toEqual({
        loanNumber: 'L9001020228468693',
        folderCode: 'INVO',
        variant: 'POD',
      });
    });

    it('should handle case-insensitive variant suffixes', () => {
      const result = parseFilename('L9001020228468693_INVO_tracking.pdf');
      expect(result).toEqual({
        loanNumber: 'L9001020228468693',
        folderCode: 'INVO',
        variant: 'TRACKING',
      });
    });

    it('should handle multi-part folder codes like DEMAND_NOTICE', () => {
      const result = parseFilename('L9001020228468693_DEMAND_NOTICE.pdf');
      expect(result.loanNumber).toBe('L9001020228468693');
      expect(result.folderCode).toBe('DEMAND_NOTICE');
      expect(result.variant).toBe(null);
    });

    it('should handle multi-part folder codes with TRACKING suffix', () => {
      const result = parseFilename('L9001020228468693_DEMAND_TRACKING.pdf');
      expect(result).toEqual({
        loanNumber: 'L9001020228468693',
        folderCode: 'DEMAND',
        variant: 'TRACKING',
      });
    });

    it('should return error for empty filename', () => {
      const result = parseFilename('');
      expect(result.error).toBeDefined();
    });

    it('should return error for null', () => {
      const result = parseFilename(null);
      expect(result.error).toBeDefined();
    });

    it('should return error for filename without underscore', () => {
      const result = parseFilename('nodashes.pdf');
      expect(result.error).toBeDefined();
    });

    it('should handle jpg extensions', () => {
      const result = parseFilename('L123456_REF.jpg');
      expect(result).toEqual({
        loanNumber: 'L123456',
        folderCode: 'REF',
        variant: null,
      });
    });

    it('should handle png extensions', () => {
      const result = parseFilename('L123456_LEGAL_POD.png');
      expect(result).toEqual({
        loanNumber: 'L123456',
        folderCode: 'LEGAL',
        variant: 'POD',
      });
    });

    it('should uppercase the folder code regardless of input casing', () => {
      const result = parseFilename('L9001020228468693_invo.pdf');
      expect(result.folderCode).toBe('INVO');
    });
  });

  describe('buildFullFolderCode', () => {
    it('should return folderCode when no variant', () => {
      expect(buildFullFolderCode('INVO', null)).toBe('INVO');
    });

    it('should append TRACKING variant', () => {
      expect(buildFullFolderCode('INVO', 'TRACKING')).toBe('INVO_TRACKING');
    });

    it('should append POD variant', () => {
      expect(buildFullFolderCode('INVO', 'POD')).toBe('INVO_POD');
    });
  });
});
