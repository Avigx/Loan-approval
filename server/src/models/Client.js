const mongoose = require('mongoose');
const { Schema } = mongoose;

const ClientSchema = new Schema({
  name: { type: String, required: true, unique: true },   // e.g. "AU BANK"
  code: { type: String, required: true, unique: true },   // e.g. "AUBANK"
  active: { type: Boolean, default: true },
}, { timestamps: true });

module.exports = mongoose.model('Client', ClientSchema);
