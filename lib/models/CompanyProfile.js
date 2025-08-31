const mongoose = require('mongoose');

const companyProfileSchema = new mongoose.Schema({
  id: {
    type: String,
    required: true,
    unique: true,
  },
  name: {
    type: String,
    required: true,
  },
  contact: {
    type: String,
    required: true,
  },
  email: {
    type: String,
    required: true,
  },
  address: {
    type: String,
    required: true,
  },
}, {
  timestamps: true,
});

module.exports = mongoose.models.CompanyProfile || mongoose.model('CompanyProfile', companyProfileSchema); 