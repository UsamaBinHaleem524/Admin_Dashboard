const mongoose = require('mongoose');

const quotationItemSchema = new mongoose.Schema({
  itemName: {
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
  customerSupplierDetails: {
    type: String,
    enum: ['customer', 'supplier'],
    required: true,
  },
  customerSupplierName: {
    type: String,
    required: true,
  },
  customerSupplierAddress: {
    type: String,
    required: false,
  },
  customerSupplierPhone: {
    type: String,
    required: false,
  },
  items: [quotationItemSchema],
  totalAmount: {
    type: Number,
    required: true,
  },
  currency: {
    type: String,
    enum: ['USD', 'PKR', 'SAR', 'CNY'],
    required: true,
  },
}, {
  timestamps: true,
});

module.exports = mongoose.models.Quotation || mongoose.model('Quotation', quotationSchema); 