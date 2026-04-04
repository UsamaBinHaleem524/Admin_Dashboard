const mongoose = require('mongoose');

const settingSchema = new mongoose.Schema({
  key: {
    type: String,
    required: true,
    unique: true,
  },
  value: {
    type: String,
    required: false,
    default: '',
  },
}, {
  timestamps: true,
});

module.exports = mongoose.models.Setting || mongoose.model('Setting', settingSchema);
