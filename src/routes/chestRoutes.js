const express = require('express');
const router = express.Router();
const User = require('../models/User');

// API Mở Rương
router.post('/open', async (req, res) => {
  try {
    const { userId } = req.body;
    const user = await User.findById(userId);

    if (!user) {
      return res.status(404).json({ message: 'Không tìm thấy người dùng!' });
    }

    if (user.opened) {
      return res.json({
        message: 'Bạn đã mở rương rồi!',
        assignedClass: user.className
      });
    }

    user.opened = true;
    await user.save();

    res.json({
      message: 'Mở rương thành công!',
      assignedClass: user.className
    });

  } catch (error) {
    res.status(500).json({ message: 'Lỗi máy chủ khi mở rương!' });
  }
});

// API Kiểm tra trạng thái hiện tại (phục vụ F5 / Reload)
router.get('/status/:userId', async (req, res) => {
  try {
    const user = await User.findById(req.params.userId);
    if (!user) {
      return res.status(404).json({ message: 'Không tìm thấy người dùng!' });
    }

    res.json({
      hasOpenedChest: user.opened,
      assignedClass: user.className
    });
  } catch (error) {
    res.status(500).json({ message: 'Lỗi máy chủ khi lấy trạng thái!' });
  }
});

module.exports = router;