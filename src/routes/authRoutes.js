const express = require('express');
const router = express.Router();
const User = require('../models/User');

// 1. API ĐĂNG NHẬP
router.post('/login', async (req, res) => {
  try {
    const { username, password } = req.body;

    // Tìm user theo username
    const user = await User.findOne({ username });
    if (!user || user.password !== password) {
      return res.status(400).json({ message: 'Tên đăng nhập hoặc mật khẩu không chính xác!' });
    }

    // Lấy giá trị họ tên chuẩn từ database (bảo vệ cả fullname lẫn fullName)
    const name = user.fullname || user.fullName || '';
    const assignedClass = user.className || user.assignedClass || '';
    const hasOpened = user.opened !== undefined ? user.opened : (user.hasOpenedChest || false);

    // Trả về thông tin user đã đồng bộ tất cả tên biến
    res.json({
      message: 'Đăng nhập thành công!',
      user: {
        id: user._id,
        _id: user._id,
        username: user.username,
        // Trả về cả 2 kiểu viết tên trường để Frontend dùng kiểu nào cũng khớp 100%
        fullname: name,
        fullName: name,
        role: user.role || 'glv',
        className: assignedClass,
        assignedClass: assignedClass,
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

    // Đánh dấu đã mở rương cho cả 2 kiểu biến trong MongoDB
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