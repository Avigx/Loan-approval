// permissions.test.js
// Using vitest globals (configured in vitest.config.js with globals: true)
const { scopeToClient, requireRole, requireDownloadPermission } = require('../src/middleware/permissions.middleware');

describe('permissions.middleware', () => {
  describe('scopeToClient', () => {
    it('should return empty filter for SUPER_ADMIN', () => {
      const req = { user: { role: 'SUPER_ADMIN', clientId: 'abc123' } };
      expect(scopeToClient(req)).toEqual({});
    });

    it('should return clientId filter for CLIENT_ADMIN', () => {
      const req = { user: { role: 'CLIENT_ADMIN', clientId: 'abc123' } };
      expect(scopeToClient(req)).toEqual({ clientId: 'abc123' });
    });

    it('should return clientId filter for CUSTOMER', () => {
      const req = { user: { role: 'CUSTOMER', clientId: 'xyz789' } };
      expect(scopeToClient(req)).toEqual({ clientId: 'xyz789' });
    });
  });

  describe('requireRole', () => {
    it('should call next() when user has required role', () => {
      const req = { user: { role: 'CLIENT_ADMIN' } };
      const res = { status: () => ({ json: () => {} }) };
      let nextCalled = false;
      const next = () => { nextCalled = true; };

      const middleware = requireRole('SUPER_ADMIN', 'CLIENT_ADMIN');
      middleware(req, res, next);
      expect(nextCalled).toBe(true);
    });

    it('should return 403 when user lacks required role', () => {
      const req = { user: { role: 'CUSTOMER' } };
      let statusCode;
      let jsonBody;
      const res = {
        status: (code) => {
          statusCode = code;
          return { json: (body) => { jsonBody = body; } };
        },
      };
      const next = () => {};

      const middleware = requireRole('SUPER_ADMIN', 'CLIENT_ADMIN');
      middleware(req, res, next);

      expect(statusCode).toBe(403);
      expect(jsonBody.error).toBe('Insufficient role');
    });

    it('should return 401 when user is not authenticated', () => {
      const req = {};
      let statusCode;
      const res = {
        status: (code) => {
          statusCode = code;
          return { json: () => {} };
        },
      };
      const next = () => {};

      const middleware = requireRole('SUPER_ADMIN');
      middleware(req, res, next);

      expect(statusCode).toBe(401);
    });
  });

  describe('requireDownloadPermission', () => {
    it('should call next() for VIEW_DOWNLOAD permission', () => {
      const req = { user: { permission: 'VIEW_DOWNLOAD' } };
      let nextCalled = false;
      const next = () => { nextCalled = true; };
      const res = {};

      requireDownloadPermission(req, res, next);
      expect(nextCalled).toBe(true);
    });

    it('should call next() for VIEW_ONLY permission', () => {
      const req = { user: { permission: 'VIEW_ONLY' } };
      let nextCalled = false;
      const next = () => { nextCalled = true; };
      const res = {};

      requireDownloadPermission(req, res, next);
      expect(nextCalled).toBe(true);
    });

    it('should return 403 for DOWNLOAD_DISABLED permission', () => {
      const req = { user: { permission: 'DOWNLOAD_DISABLED' } };
      let statusCode;
      let jsonBody;
      const res = {
        status: (code) => {
          statusCode = code;
          return { json: (body) => { jsonBody = body; } };
        },
      };
      const next = () => {};

      requireDownloadPermission(req, res, next);
      expect(statusCode).toBe(403);
      expect(jsonBody.error).toBe('Download permission disabled');
    });
  });
});
