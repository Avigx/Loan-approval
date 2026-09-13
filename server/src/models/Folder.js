const mongoose = require('mongoose');
const { Schema } = mongoose;

const FolderSchema = new Schema({
  name: { type: String, required: true },                  // e.g. "Pre sale", "Post sale"
  code: { type: String, required: true },                  // e.g. "PRE_SALE", "POST_SALE"
  displayLabel: { type: String, required: true },          // e.g. "Pre Sale"
  clientId: { type: Schema.Types.ObjectId, ref: 'Client', default: null }, // null = global/shared
  active: { type: Boolean, default: true },
}, { timestamps: true });

FolderSchema.index({ clientId: 1, code: 1 }, { unique: true });

module.exports = mongoose.model('Folder', FolderSchema);
