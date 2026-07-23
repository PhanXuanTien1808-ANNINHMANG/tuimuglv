const mongoose = require('mongoose');

const systemSettingSchema = new mongoose.Schema({
  key: { type: String, default: 'isChestLocked' },
  isLocked: { type: Boolean, default: true } // Mặc định khóa
});

module.exports = mongoose.model('SystemSetting', systemSettingSchema);