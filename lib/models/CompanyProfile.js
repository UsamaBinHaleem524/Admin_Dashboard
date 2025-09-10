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
  contacts: [{
    type: String,
    required: true,
  }],
  email: {
    type: String,
    required: true,
  },
  address: {
    type: String,
    required: true,
  },
  logo: {
    type: String,
    default: '/logo.jpeg',
  },
}, {
  timestamps: true,
});

module.exports = mongoose.models.CompanyProfile || mongoose.model('CompanyProfile', companyProfileSchema); 