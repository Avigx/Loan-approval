const mongoose = require('mongoose');
const { Schema } = mongoose;

const FolderTypeSchema = new Schema({
  familyName: { type: String, required: true },          // e.g. "Invocation", "Demand Notice"
  variant: {
    type: String,
    enum: ['NOTICE', 'POD', 'TRACKING'],
    required: true,
  },
  folderCode: { type: String, required: true },           // e.g. "INVO", "INVO_POD", "INVO_TRACKING"
  displayLabel: { type: String, required: true },         // e.g. "Invocation Notice"
  clientId: { type: Schema.Types.ObjectId, ref: 'Client', default: null }, // null = global/shared
  active: { type: Boolean, default: true },
}, { timestamps: true });

FolderTypeSchema.index({ clientId: 1, folderCode: 1 }, { unique: true });

module.exports = mongoose.model('FolderType', FolderTypeSchema);
