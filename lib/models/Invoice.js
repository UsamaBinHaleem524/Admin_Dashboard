const mongoose = require('mongoose');

const invoiceItemSchema = new mongoose.Schema({
  itemName: {
    type: String,
    required: true,
  },
  quantity: {
    type: Number,
    required: true,
  },
  unit: {
    type: String,
    required: true,
  },
  unitPrice: {
    type: Number,
    required: true,
  },
  vatPercentage: {
    type: Number,
    required: true,
  },
  amount: {
    type: Number,
    required: true,
  },
});

const invoiceSchema = new mongoose.Schema({
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
  customer: {
    type: String,
    required: true,
  },
  customerAddress: {
    type: String,
    required: false,
  },
  customerPhone: {
    type: String,
    required: false,
  },
  date: {
    type: String,
    required: true,
  },
  invoiceType: {
    type: String,
    enum: ['Simple', 'Proforma'],
    required: true,
  },
  items: [invoiceItemSchema],
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

module.exports = mongoose.models.Invoice || mongoose.model('Invoice', invoiceSchema); 