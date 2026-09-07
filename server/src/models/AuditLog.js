const mongoose = require('mongoose');
const { Schema } = mongoose;

const AuditLogSchema = new Schema({
  userId: { type: Schema.Types.ObjectId, ref: 'User', default: null },
  action: { type: String, required: true },
  // Possible actions: upload, view, download, search, login, create_user,
  // edit_permission, deactivate_user, edit_role, activate_user
  entityType: String,     // "Document" | "UploadBatch" | "User" | ...
  entityId: Schema.Types.ObjectId,
  clientId: { type: Schema.Types.ObjectId, ref: 'Client', default: null },
  ipAddress: String,
  details: Schema.Types.Mixed,
}, { timestamps: { createdAt: true, updatedAt: false } });

AuditLogSchema.index({ createdAt: -1 });
AuditLogSchema.index({ userId: 1 });

module.exports = mongoose.model('AuditLog', AuditLogSchema);
