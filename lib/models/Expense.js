const mongoose = require('mongoose');

const expenseItemSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
  },
  description: {
    type: String,
    required: true,
  },
  amount: {
    type: Number,
    required: true,
  },
});

const dailyExpenseSchema = new mongoose.Schema({
  date: {
    type: String,
    required: true,
    unique: true,
  },
  totalAmount: {
    type: Number,
    required: true,
    default: 0,
  },
  expenses: [expenseItemSchema],
}, {
  timestamps: true,
});

module.exports = mongoose.models.DailyExpense || mongoose.model('DailyExpense', dailyExpenseSchema); 