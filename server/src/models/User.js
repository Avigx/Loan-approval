const mongoose = require('mongoose');
const { Schema } = mongoose;

const UserSchema = new Schema({
  fullName: { type: String, required: true },
  email: { type: String, required: true, unique: true, lowercase: true },
  passwordHash: { type: String, required: true },
  role: {
    type: String,
    enum: ['SUPER_ADMIN', 'CLIENT_ADMIN', 'CUSTOMER'],
    default: 'CUSTOMER',
  },
  permission: {
    type: String,
    enum: ['VIEW_DOWNLOAD', 'VIEW_ONLY', 'DOWNLOAD_DISABLED'],
    default: 'VIEW_DOWNLOAD',
  },
  active: { type: Boolean, default: true },
  emailVerified: { type: Boolean, default: false },
  emailVerifyToken: String,
  emailVerifyExpires: Date,
  clientId: { type: Schema.Types.ObjectId, ref: 'Client', default: null },
  lastLoginAt: Date,
}, { timestamps: true });

module.exports = mongoose.model('User', UserSchema);
