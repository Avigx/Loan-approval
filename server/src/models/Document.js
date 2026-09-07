const mongoose = require('mongoose');
const { Schema } = mongoose;

const DocumentSchema = new Schema({
  loanNumber: { type: String, required: true },            // PRIMARY SEARCH INDEX
  uniqueRef: { type: String, required: true },              // display id: {loanNumber}_{folderCode}, NOT unique
  customerName: String,
  folderTypeId: { type: Schema.Types.ObjectId, ref: 'FolderType', required: true },
  dispatchDate: Date,
  podStatus: String,
  podDate: Date,
  trackingNumber: String,
  remark: String,
  filePath: { type: String, required: true },
  fileType: { type: String, required: true },               // pdf | jpg | png | xlsx | csv
  fileSizeBytes: Number,
  clientId: { type: Schema.Types.ObjectId, ref: 'Client', required: true },
  batchId: { type: Schema.Types.ObjectId, ref: 'UploadBatch', default: null },
}, { timestamps: true });

// Indexes for efficient searching
DocumentSchema.index({ loanNumber: 1 });
DocumentSchema.index({ clientId: 1, loanNumber: 1 });
DocumentSchema.index({ trackingNumber: 1 });
// Text index for combined free-text search across customerName/remark
DocumentSchema.index({ customerName: 'text', remark: 'text' });

module.exports = mongoose.model('Document', DocumentSchema);
