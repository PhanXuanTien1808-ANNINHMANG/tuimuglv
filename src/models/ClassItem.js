const mongoose = require('mongoose');

const classItemSchema = new mongoose.Schema({
  name: { type: String, required: true, unique: true, trim: true },
  createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('ClassItem', classItemSchema);