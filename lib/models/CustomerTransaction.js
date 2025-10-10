const mongoose = require('mongoose');

const customerTransactionSchema = new mongoose.Schema({
  id: {
    type: String,
    required: true,
    unique: true,
  },
  customer: {
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

module.exports = mongoose.models.CustomerTransaction || mongoose.model('CustomerTransaction', customerTransactionSchema); 