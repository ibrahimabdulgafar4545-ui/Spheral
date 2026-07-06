const mongoose = require('mongoose');

const systemConfigSchema = new mongoose.Schema({
  maintenanceMode: {
    type: Boolean,
    default: false
  },
  allowRegistrations: {
    type: Boolean,
    default: true
  },
  requireEmailVerification: {
    type: Boolean,
    default: false
  }
}, { timestamps: true });

module.exports = mongoose.model('SystemConfig', systemConfigSchema);
