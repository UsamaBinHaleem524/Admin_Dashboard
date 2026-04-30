const mongoose = require('mongoose');

const purchaseKhataSchema = new mongoose.Schema({
  id: {
    type: String,
    required: true,
    unique: true,
  },
  name: {
    type: String,
    required: true,
  },
  startDate: {
    type: String,
    required: true,
  },
  endDate: {
    type: String,
    required: true,
  },
  status: {
    type: String,
    enum: ['active', 'closed'],
    default: 'active',
  },
}, {
  timestamps: true,
});

module.exports = mongoose.models.PurchaseKhata || mongoose.model('PurchaseKhata', purchaseKhataSchema);
