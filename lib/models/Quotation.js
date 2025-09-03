const mongoose = require('mongoose');

const quotationItemSchema = new mongoose.Schema({
  itemName: {
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

const quotationSchema = new mongoose.Schema({
  id: {
    type: String,
    required: true,
    unique: true,
  },
  userDefinedId: {
    type: String,
    required: true,
    unique: true,
  },
  date: {
    type: String,
    required: true,
  },
  items: [quotationItemSchema],
  totalAmount: {
    type: Number,
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

module.exports = mongoose.models.Quotation || mongoose.model('Quotation', quotationSchema); 