const mongoose = require('mongoose');

const purchaseOrderItemSchema = new mongoose.Schema({
  itemName: {
    type: String,
    required: true,
  },
  quantity: {
    type: Number,
    required: true,
  },
  unitPrice: {
    type: Number,
    required: true,
  },
  amount: {
    type: Number,
    required: true,
  },
});

const purchaseOrderSchema = new mongoose.Schema({
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
  supplier: {
    type: String,
    required: true,
  },
  supplierAddress: {
    type: String,
    required: false,
  },
  supplierPhone: {
    type: String,
    required: false,
  },
  date: {
    type: String,
    required: true,
  },
  items: [purchaseOrderItemSchema],
  currency: {
    type: String,
    enum: ['USD', 'PKR', 'SAR'],
    required: true,
  },
}, {
  timestamps: true,
});

module.exports = mongoose.models.PurchaseOrder || mongoose.model('PurchaseOrder', purchaseOrderSchema); 