const mongoose = require('mongoose');

const SettingSchema = new mongoose.Schema({
  key: {
    type: String,
    required: true,
    unique: true,
    index: true
  },
  value: mongoose.Schema.Types.Mixed
}, { timestamps: true });

module.exports = mongoose.model('Setting', SettingSchema);
