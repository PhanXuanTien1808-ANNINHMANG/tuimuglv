const express = require('express');
const mongoose = require('mongoose');
require('dotenv').config();

const app = express();

// Middleware đọc JSON và static files
app.use(express.json());
app.use(express.static('public'));

// IMPORT MODELS (Cần thiết cho các route trực tiếp bên dưới)
const User = require('./src/models/User'); // 👈 Nhớ kiểm tra lại đúng đường dẫn file User model của bạn

// 1. IMPORT CÁC ROUTES
const authRoutes = require('./src/routes/authRoutes');
const chestRoutes = require('./src/routes/chestRoutes');
const adminRoutes = require('./src/routes/adminRoutes');

// 2. KẾT NỐI MONGODB ATLAS (Chấp nhận cả MONGODB_URI lẫn MONGO_URI)
const mongoURI = process.env.MONGODB_URI || process.env.MONGO_URI;

mongoose.connect(mongoURI)
  .then(() => console.log('✅ Đã kết nối MongoDB Atlas thành công!'))
  .catch(err => console.error('❌ Lỗi kết nối MongoDB:', err));

// 3. ĐĂNG KÝ CÁC API ENDPOINTS
app.use('/api/auth', authRoutes);
app.use('/api/chest', chestRoutes);
app.use('/api/admin', adminRoutes);

// --- CÁC API ADMIN TRỰC TIẾP ---

// 1. API Reset theo danh sách ID đã chọn (Checkbox)
app.post('/api/admin/reset-selected', async (req, res) => {
  const { userIds } = req.body; // Mảng chứa các ID cần reset
  try {
    await User.updateMany({ _id: { $in: userIds } }, { $set: { opened: false } });
    res.json({ message: 'Thành công' });
  } catch (err) {
    res.status(500).json({ message: 'Lỗi server', error: err.message });
  }
});

// 2. API Lấy toàn bộ danh sách GLV
app.get('/api/admin/users', async (req, res) => {
  try {
    const users = await User.find({});
    res.json(users);
  } catch (err) {
    res.status(500).json({ message: 'Lỗi server', error: err.message });
  }
});

// 3. API Thêm GLV Mới
app.post('/api/admin/users', async (req, res) => {
  const { fullname, username, password, className } = req.body;
  try {
    const newUser = new User({ fullname, username, password, className, role: 'glv', opened: false });
    await newUser.save();
    res.json({ message: 'Đã thêm thành công' });
  } catch (err) {
    res.status(500).json({ message: 'Lỗi server', error: err.message });
  }
});

// 4. API Chỉnh Sửa Họ tên, Username, Lớp phân công
app.put('/api/admin/users/:id', async (req, res) => {
  const { id } = req.params;
  const { fullname, username, className, password } = req.body;
  
  try {
    const updateData = { fullname, username, className };
    if (password) updateData.password = password; // Đổi mật khẩu nếu có nhập

    await User.findByIdAndUpdate(id, updateData);
    res.json({ message: 'Đã cập nhật' });
  } catch (err) {
    res.status(500).json({ message: 'Lỗi server', error: err.message });
  }
});

// 4. CHẠY SERVER
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`🚀 Server đang chạy tại http://localhost:${PORT}`);
});