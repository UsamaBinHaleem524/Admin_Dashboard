const mongoose = require('mongoose');

const personalExpenseSchema = new mongoose.Schema({
  id: {
    type: String,
    required: true,
    unique: true,
  },
  description: {
    type: String,
    required: true,
  },
  amount: {
    type: Number,
    required: true,
  },
  date: {
    type: String,
    required: true,
  },
  currency: {
    type: String,
    required: true,
    enum: ['USD', 'PKR', 'SAR'],
    default: 'USD',
  },
}, {
  timestamps: true,
});

module.exports = mongoose.models.PersonalExpense || mongoose.model('PersonalExpense', personalExpenseSchema); 