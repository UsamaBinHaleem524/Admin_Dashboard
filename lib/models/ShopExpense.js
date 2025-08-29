const mongoose = require('mongoose');

const shopExpenseSchema = new mongoose.Schema({
  id: {
    type: String,
    required: true,
    unique: true,
  },
  description: {
    type: String,
    required: true,
  },
  date: {
    type: String,
    required: true,
  },
  amount: {
    type: Number,
    required: true,
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