const express = require('express');
const router = express.Router();
const User = require('../models/User');
const SystemSetting = require('../models/SystemSetting');

// 🛠️ Hàm kiểm tra Lớp/Chi đoàn có hợp lệ hay không (Tránh gom nhóm 'Chi đoàn chưa xếp')
function isValidClass(classVal) {
  if (!classVal) return false;
  const val = classVal.toString().trim().toLowerCase();
  const invalidValues = ['chi đoàn chưa xếp', 'chi doan chua xep', 'chưa xếp', 'chua xep', '—', '-', 'none', 'null', 'undefined'];
  return !invalidValues.includes(val);
}

// ==========================================
// 1. CÁC API DÀNH CHO USER (MỞ RƯƠNG & TRẠNG THÁI)
// ==========================================

// API Mở Rương & Lấy thông tin phân công + danh sách Anh/Chị cùng lớp
router.post('/open', async (req, res) => {
  try {
    const { userId } = req.body;

    // 1. Tìm thông tin GLV đang mở rương
    const currentUser = await User.findById(userId);
    if (!currentUser) {
      return res.status(404).json({ message: 'Không tìm thấy người dùng!' });
    }

    // 2. Kiểm tra xem Hệ thống có đang BỊ KHÓA không
    if (!currentUser.opened) {
      let setting = await SystemSetting.findOne({ key: 'isChestLocked' });
      if (setting && setting.isLocked) {
        return res.status(403).json({ 
          message: 'Hệ thống hiện đang khóa cổng mở rương! Vui lòng chờ thông báo từ Ban Hành Giáo / Admin.' 
        });
      }
    }

    // 3. Cập nhật trạng thái đã mở rương
    currentUser.opened = true;
    await currentUser.save();

    // 🌟 4. LỌC ĐỒNG ĐỘI/ANH CHỊ CÙNG LỚP
    const isTruong = currentUser.role === 'admin' || currentUser.role === 'truong' || currentUser.isTruong;
    const rawClass = currentUser.className || currentUser.chidoan;
    const validClass = isValidClass(rawClass) ? rawClass.trim() : null;

    let teammates = [];
    let hideClassmates = false;

    // Nếu là Trưởng HOẶC Lớp chưa hợp lệ -> Không lấy danh sách đồng đội
    if (isTruong || !validClass) {
      teammates = [];
      hideClassmates = true;
    } else {
      // Tìm đồng đội cùng Lớp (So sánh khớp lớp validClass và loại trừ chính mình)
      teammates = await User.find({
        _id: { $ne: currentUser._id },
        $or: [
          { className: validClass },
          { chidoan: validClass }
        ]
      }).select('holyName holyname fullname fullName name subrole className chidoan opened');
    }

    // 5. Trả kết quả về Frontend
    res.json({
      message: 'Mở rương thành công!',
      user: {
        holyName: currentUser.holyName || currentUser.holyname,
        fullname: currentUser.fullname || currentUser.fullName || currentUser.name,
        className: validClass || '',
        subrole: currentUser.subrole,
        chidoan: currentUser.chidoan,
        opened: currentUser.opened,
        role: currentUser.role
      },
      teammates: teammates,
      hideClassmates: hideClassmates
    });

  } catch (err) {
    res.status(500).json({ message: 'Lỗi máy chủ', error: err.message });
  }
});

// API Kiểm tra trạng thái hiện tại (phục vụ F5 / Reload)
router.get('/status/:userId', async (req, res) => {
  try {
    const user = await User.findById(req.params.userId);
    if (!user) {
      return res.status(404).json({ message: 'Không tìm thấy người dùng!' });
    }

    const isTruong = user.role === 'admin' || user.role === 'truong' || user.isTruong;
    const rawClass = user.className || user.chidoan;
    const validClass = isValidClass(rawClass) ? rawClass.trim() : null;

    let teammates = [];
    let hideClassmates = false;

    // Lọc danh sách đồng đội khi Reload
    if (isTruong || !validClass) {
      teammates = [];
      hideClassmates = true;
    } else {
      teammates = await User.find({
        _id: { $ne: user._id },
        $or: [
          { className: validClass },
          { chidoan: validClass }
        ]
      }).select('holyName holyname fullname fullName name subrole className chidoan opened');
    }

    // Lấy trạng thái Khóa của Hệ thống
    let setting = await SystemSetting.findOne({ key: 'isChestLocked' });
    const isLocked = setting ? setting.isLocked : true;

    res.json({
      user: {
        holyName: user.holyName || user.holyname,
        fullname: user.fullname || user.fullName || user.name,
        className: validClass || '',
        subrole: user.subrole,
        chidoan: user.chidoan,
        opened: user.opened,
        role: user.role
      },
      teammates: teammates,
      hideClassmates: hideClassmates,
      isSystemLocked: isLocked
    });

  } catch (error) {
    res.status(500).json({ message: 'Lỗi máy chủ khi lấy trạng thái!' });
  }
});


// ==========================================
// 2. CÁC API DÀNH CHO ADMIN (KHÓA RƯƠNG & RESET)
// ==========================================

// Lấy trạng thái Khóa Cổng Rương hiện tại
router.get('/system-status', async (req, res) => {
  try {
    let setting = await SystemSetting.findOne({ key: 'isChestLocked' });
    if (!setting) {
      setting = await SystemSetting.create({ key: 'isChestLocked', isLocked: true });
    }
    res.json({ isLocked: setting.isLocked });
  } catch (err) {
    res.status(500).json({ message: 'Lỗi khi lấy trạng thái hệ thống!' });
  }
});

// Bật / Tắt Khóa Cổng Rương
router.post('/toggle-lock', async (req, res) => {
  try {
    const { isLocked } = req.body;
    let setting = await SystemSetting.findOneAndUpdate(
      { key: 'isChestLocked' },
      { isLocked: isLocked },
      { upsert: true, new: true }
    );
    res.json({ 
      message: 'Cập nhật trạng thái khóa thành công!', 
      isLocked: setting.isLocked 
    });
  } catch (err) {
    res.status(500).json({ message: 'Lỗi khi cập nhật trạng thái khóa!' });
  }
});

// Reset Rương (Chọn từng người hoặc Reset toàn bộ)
router.post('/reset-chests', async (req, res) => {
  try {
    const { userIds, resetAll } = req.body;

    if (resetAll) {
      await User.updateMany({}, { opened: false });
      return res.json({ message: 'Đã reset rương cho TẤT CẢ Giáo Lý Viên!' });
    } 
    
    if (userIds && userIds.length > 0) {
      await User.updateMany({ _id: { $in: userIds } }, { opened: false });
      return res.json({ message: `Đã reset rương cho ${userIds.length} GLV được chọn!` });
    }

    res.status(400).json({ message: 'Không có dữ liệu yêu cầu reset!' });
  } catch (err) {
    res.status(500).json({ message: 'Lỗi khi reset rương!' });
  }
});

module.exports = router;