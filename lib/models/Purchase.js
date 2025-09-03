const mongoose = require('mongoose');

const purchaseSchema = new mongoose.Schema({
  id: {
    type: String,
    required: true,
    unique: true,
  },
  supplier: {
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
  currency: {
    type: String,
    enum: ['USD', 'PKR', 'SAR'],
    required: true,
    default: 'USD',
  },
  date: {
    type: String,
    required: true,
  },
}, {
  timestamps: true,
});

module.exports = mongoose.models.Purchase || mongoose.model('Purchase', purchaseSchema); 