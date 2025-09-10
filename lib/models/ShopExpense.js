const mongoose = require('mongoose');

const shopExpenseSchema = new mongoose.Schema({
  id: {
    type: String,
    required: true,
    unique: true,
  },
  incomingDescription: {
    type: String,
    required: false,
  },
  outgoingDescription: {
    type: String,
    required: false,
  },
  date: {
    type: String,
    required: true,
  },
  previousAmount: {
    type: Number,
    required: true,
    default: 0,
  },
  income: {
    type: Number,
    required: true,
    default: 0,
  },
  outgoingAmount: {
    type: Number,
    required: true,
    default: 0,
  },
  totalCash: {
    type: Number,
    required: true,
    default: 0,
  },
  currency: {
    type: String,
    enum: ['USD', 'PKR', 'SAR'],
    required: true,
    default: 'USD',
  },
}, {
  timestamps: true,
});

module.exports = mongoose.models.ShopExpense || mongoose.model('ShopExpense', shopExpenseSchema); 