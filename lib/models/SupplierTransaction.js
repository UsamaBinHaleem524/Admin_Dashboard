const mongoose = require('mongoose');

const supplierTransactionSchema = new mongoose.Schema({
  id: {
    type: String,
    required: true,
    unique: true,
  },
  supplier: {
    type: String,
    required: true,
  },
  description: {
    type: String,
    required: true,
  },
  date: {
    type: String,
    required: true,
  },
  currency: {
    type: String,
    enum: ['USD', 'PKR', 'SAR', 'CNY'],
    required: true,
  },
  debit: {
    type: Number,
    required: false,
    default: 0,
  },
  credit: {
    type: Number,
    required: false,
    default: 0,
  },
  balance: {
    type: Number,
    required: false,
    default: 0,
  },
}, {
  timestamps: true,
});

module.exports = mongoose.models.SupplierTransaction || mongoose.model('SupplierTransaction', supplierTransactionSchema); 