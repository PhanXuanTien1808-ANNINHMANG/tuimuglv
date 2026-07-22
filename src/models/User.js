const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
  // Tên đăng nhập (ví dụ: xuantien)
  username: {
    type: String,
    required: true,
    unique: true,
    trim: true
  },
  
  // Mật khẩu
  password: {
    type: String,
    required: true
  },

  // Họ và tên đầy đủ hiển thị trên lá thư (ví dụ: Phan Xuân Tiến)
  fullname: {
    type: String,
    required: true
  },

  // Tên lớp phân công đợt này (ví dụ: Nghĩa 1A)
  className: {
    type: String,
    default: ''
  },

  // Vai trò: 'admin' hoặc 'glv'
  role: {
    type: String,
    enum: ['admin', 'glv'],
    default: 'glv'
  },

  // Trạng thái mở rương: true (Đã mở), false (Chưa mở/Đã reset)
  opened: {
    type: Boolean,
    default: false
  }
}, {
  timestamps: true // Tự động lưu thời gian khởi tạo và cập nhật
});

module.exports = mongoose.model('User', userSchema);