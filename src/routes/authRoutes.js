const express = require('express');
const router = express.Router();
const User = require('../models/User');

// 1. API ĐĂNG NHẬP
router.post('/login', async (req, res) => {
  try {
    const { username, password } = req.body;

    // Tìm user theo username
    const user = await User.findOne({ username: username ? username.trim() : '' });
    if (!user || user.password !== password) {
      return res.status(400).json({ message: 'Tên đăng nhập hoặc mật khẩu không chính xác!' });
    }

    // Lấy giá trị họ tên chuẩn từ database
    const name = user.fullname || user.fullName || '';
    const assignedClass = user.className || user.assignedClass || '';
    const hasOpened = user.opened !== undefined ? user.opened : (user.hasOpenedChest || false);

    // 🌟 QUAN TRỌNG: Làm sạch và chuẩn hóa role về chữ thường (ví dụ: 'admin' hoặc 'glv')
    let userRole = (user.role || 'glv').toString().toLowerCase().trim();
    
    // Nếu role trong DB không phải là admin thì chuẩn hóa 100% về glv
    if (userRole !== 'admin') {
      userRole = 'glv';
    }

    // Trả về thông tin user
    res.json({
      message: 'Đăng nhập thành công!',
      user: {
        id: user._id,
        _id: user._id,
        username: user.username,
        fullname: name,
        fullName: name,
        holyName: user.holyName || '',
        role: userRole, // Trả về 'admin' hoặc 'glv' đã được làm sạch
        className: assignedClass,
        assignedClass: assignedClass,
        chidoan: user.chidoan || '',
        opened: hasOpened,
        hasOpenedChest: hasOpened
      }
    });
  } catch (error) {
    res.status(500).json({ message: 'Lỗi máy chủ!' });
  }
});

// 2. API CẬP NHẬT TRẠNG THÁI MỞ RƯƠNG
router.post('/open-chest', async (req, res) => {
  try {
    const { userId } = req.body;

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ message: 'Không tìm thấy tài khoản!' });
    }

    user.opened = true;
    user.hasOpenedChest = true;
    await user.save();

    const resultClass = user.className || user.assignedClass || '';

    res.json({
      message: 'Mở rương thành công!',
      assignedClass: resultClass,
      className: resultClass
    });
  } catch (error) {
    res.status(500).json({ message: 'Lỗi máy chủ!', error: error.message });
  }
});

module.exports = router;