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
  quantity: {
    type: Number,
    required: true,
    default: 1,
  },
  unit: {
    type: String,
    required: true,
    enum: ['yard', 'meter'],
    default: 'yard',
  },
  amount: {
    type: Number,
    required: true,
  },
  totalAmount: {
    type: Number,
    required: true,
  },
  date: {
    type: String,
    required: true,
  },
}, {
  timestamps: true,
});

module.exports = mongoose.models.Purchase || mongoose.model('Purchase', purchaseSchema); 