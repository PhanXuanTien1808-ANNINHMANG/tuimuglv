const mongoose = require('mongoose');

const classMappingSchema = new mongoose.Schema({
  className: { type: String, required: true, unique: true, trim: true }, // Ví dụ: "Nghĩa 3A"
  chidoan: { type: String, required: true, trim: true }                 // Ví dụ: "Chi đoàn Sinai"
}, { timestamps: true });

module.exports = mongoose.model('ClassMapping', classMappingSchema);