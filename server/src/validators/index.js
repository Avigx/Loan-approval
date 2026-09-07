const { z } = require('zod');

// ── Auth ──
const loginSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(1, 'Password is required'),
});

const registerSchema = z.object({
  fullName: z.string().min(1, 'Full name is required'),
  email: z.string().email('Invalid email address'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
});

// ── Users ──
const createUserSchema = z.object({
  fullName: z.string().min(1, 'Full name is required'),
  email: z.string().email('Invalid email address'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
  role: z.enum(['SUPER_ADMIN', 'CLIENT_ADMIN', 'CUSTOMER']).optional().default('CUSTOMER'),
  permission: z.enum(['VIEW_DOWNLOAD', 'VIEW_ONLY', 'DOWNLOAD_DISABLED']).optional().default('VIEW_DOWNLOAD'),
  clientId: z.string().optional().nullable(),
});

const updateUserSchema = z.object({
  fullName: z.string().min(1).optional(),
  role: z.enum(['SUPER_ADMIN', 'CLIENT_ADMIN', 'CUSTOMER']).optional(),
  permission: z.enum(['VIEW_DOWNLOAD', 'VIEW_ONLY', 'DOWNLOAD_DISABLED']).optional(),
  active: z.boolean().optional(),
  clientId: z.string().optional().nullable(),
});

// ── Documents ──
const searchDocumentsSchema = z.object({
  loanNumber: z.string().optional(),
  uniqueRef: z.string().optional(),
  customerName: z.string().optional(),
  folderCode: z.string().optional(),
  trackingNumber: z.string().optional(),
  documentType: z.string().optional(),
  dispatchFrom: z.string().optional(),
  dispatchTo: z.string().optional(),
  page: z.string().optional().default('1'),
  limit: z.string().optional().default('50'),
});

// ── Audit Log ──
const auditLogQuerySchema = z.object({
  userId: z.string().optional(),
  action: z.string().optional(),
  loanNumber: z.string().optional(),
  dateFrom: z.string().optional(),
  dateTo: z.string().optional(),
  page: z.string().optional().default('1'),
  limit: z.string().optional().default('50'),
});

module.exports = {
  loginSchema,
  registerSchema,
  createUserSchema,
  updateUserSchema,
  searchDocumentsSchema,
  auditLogQuerySchema,
};
