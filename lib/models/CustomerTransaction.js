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
  unit: {
    type: String,
    enum: ['yard', 'meter'],
    required: true,
  },
  item: {
    type: String,
    required: false,
    default: "",
  },
  description: {
    type: String,
    required: true,
  },
  totalAmount: {
    type: Number,
    required: true,
  },
  givenAmount: {
    type: Number,
    required: true,
  },
  remainingAmount: {
    type: Number,
    required: true,
  },
  date: {
    type: String,
    required: true,
  },
  currency: {
    type: String,
    enum: ['USD', 'PKR', 'SAR'],
    required: true,
  },
}, {
  timestamps: true,
});

module.exports = mongoose.models.CustomerTransaction || mongoose.model('CustomerTransaction', customerTransactionSchema); 