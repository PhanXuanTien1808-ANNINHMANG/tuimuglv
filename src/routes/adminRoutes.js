const express = require('express');
const router = express.Router();
const User = require('../models/User');

// 1. Lấy danh sách tất cả GLV
router.get('/users', async (req, res) => {
  try {
    const users = await User.find({ role: 'glv' }).sort({ createdAt: -1 });
    res.json(users);
  } catch (err) {
    res.status(500).json({ message: 'Lỗi server khi lấy danh sách' });
  }
});

// 2. Thêm GLV mới
router.post('/users', async (req, res) => {
  try {
    const { fullname, username, password, className } = req.body;

    const existingUser = await User.findOne({ username });
    if (existingUser) {
      return res.status(400).json({ message: 'Tên đăng nhập đã tồn tại!' });
    }

    const newUser = new User({
      fullname,
      username,
      password,
      className,
      role: 'glv',
      opened: false
    });

    await newUser.save();
    res.json({ message: 'Thêm GLV thành công!' });
  } catch (err) {
    res.status(500).json({ message: 'Lỗi server khi thêm GLV' });
  }
});

// 3. Cập nhật thông tin / Đổi lớp GLV
router.put('/users/:id', async (req, res) => {
  try {
    const { fullname, username, className, password } = req.body;
    const updateData = { fullname, username, className };

    if (password) {
      updateData.password = password;
    }

    await User.findByIdAndUpdate(req.params.id, updateData);
    res.json({ message: 'Cập nhật thành công!' });
  } catch (err) {
    res.status(500).json({ message: 'Lỗi server khi cập nhật' });
  }
});

// 4. Reset trạng thái rương các mục ĐÃ CHỌN (Checkbox)
router.post('/reset-selected', async (req, res) => {
  try {
    const { userIds } = req.body; // Mảng chứa các ID được tích chọn
    
    if (!userIds || !Array.isArray(userIds) || userIds.length === 0) {
      return res.status(400).json({ message: 'Vui lòng chọn ít nhất 1 người' });
    }

    await User.updateMany(
      { _id: { $in: userIds } },
      { $set: { opened: false } }
    );

    res.json({ message: 'Reset các mục đã chọn thành công!' });
  } catch (err) {
    res.status(500).json({ message: 'Lỗi server khi reset' });
  }
});

// 5. Reset trạng thái tất cả GLV
router.post('/reset-all', async (req, res) => {
  try {
    await User.updateMany({ role: 'glv' }, { $set: { opened: false } });
    res.json({ message: 'Đã reset tất cả GLV!' });
  } catch (err) {
    res.status(500).json({ message: 'Lỗi server khi reset tất cả' });
  }
});

module.exports = router;