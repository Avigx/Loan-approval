const mongoose = require('mongoose');
const { Schema } = mongoose;

const UploadBatchSchema = new Schema({
  batchCode: { type: String, required: true, unique: true }, // e.g. BATCH_<timestamp>_<random>
  batchName: { type: String, default: '' },                  // user-provided custom batch name
  clientId: { type: Schema.Types.ObjectId, ref: 'Client', required: true },
  uploadedById: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  templateFilePath: String,
  totalRows: { type: Number, default: 0 },
  successfulRows: { type: Number, default: 0 },
  failedRows: { type: Number, default: 0 },
  status: {
    type: String,
    enum: ['processing', 'completed', 'failed'],
    default: 'processing',
  },
  successFiles: { type: [{ fileName: String, loanNumber: String }], default: [] },
  errorLog: { type: Schema.Types.Mixed, default: [] },
}, { timestamps: true });

module.exports = mongoose.model('UploadBatch', UploadBatchSchema);
