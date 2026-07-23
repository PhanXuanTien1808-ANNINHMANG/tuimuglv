const express = require('express');
const router = express.Router();
const User = require('../models/User');
const ClassMapping = require('../models/ClassMapping');

// ==========================================
// HÀM HỖ TRỢ DÙNG CHUNG
// ==========================================

// 1. Chuyển Ngày sinh thành chuỗi Mật khẩu chỉ chứa số (VD: "15/08/1998" -> "15081998")
function formatDobToPassword(dobString) {
  if (!dobString) return '';
  return dobString.toString().replace(/\D/g, '');
}

// 2. Tìm Chi đoàn theo Lớp từ DB ClassMapping
async function getChiDoanFromDB(className) {
  if (!className) return 'Chi đoàn chưa xếp';
  
  const mapping = await ClassMapping.findOne({
    className: { $regex: new RegExp(`^${className.trim()}$`, 'i') }
  });

  return mapping ? mapping.chidoan : 'Chi đoàn chưa xếp';
}

// ==========================================
// CÁC ROUTE PHỤC VỤ TRANG QUẢN LÝ (ADMIN)
// ==========================================

// 1. LẤY DANH SÁCH TẤT CẢ GLV (Xếp theo ID từ cũ tới mới, người mới thêm ở CUỐI BẢNG)
router.get('/users', async (req, res) => {
  try {
    const users = await User.find({ role: 'glv' }).sort({ _id: 1 });
    res.json(users);
  } catch (err) {
    res.status(500).json({ message: 'Lỗi server khi lấy danh sách GLV' });
  }
});

// 2. THÊM GLV MỚI (Mật khẩu tự động lấy theo Ngày sinh nếu không nhập)
router.post('/users', async (req, res) => {
  try {
    const { holyName, fullname, username, password, dateOfBirth, className, chidoan } = req.body;

    if (!fullname || fullname.trim() === '') {
      return res.status(400).json({ message: 'Họ và tên không được để trống!' });
    }

    // Tự sinh username từ tên nếu để trống (VD: "Nguyễn Văn A" -> "nguyenvana")
    const finalUsername = username && username.trim() !== '' 
      ? username.trim() 
      : fullname.toLowerCase().replace(/\s+/g, '');

    // Kiểm tra trùng username
    const existingUser = await User.findOne({ username: finalUsername });
    if (existingUser) {
      return res.status(400).json({ message: 'Tên đăng nhập đã tồn tại! Vui lòng chọn tên khác.' });
    }

    // Tra cứu Chi đoàn nếu chưa nhập thủ công
    const finalChiDoan = chidoan && chidoan.trim() !== '' 
      ? chidoan.trim() 
      : await getChiDoanFromDB(className);

    // 🌟 XỬ LÝ MẬT KHẨU TỰ ĐỘNG DỰA TRÊN NGÀY SINH
    let finalPassword = '123456'; // Mặc định dự phòng cuối cùng
    if (password && password.trim() !== '') {
      finalPassword = password.trim();
    } else if (dateOfBirth && dateOfBirth.trim() !== '') {
      const dobPass = formatDobToPassword(dateOfBirth);
      if (dobPass) finalPassword = dobPass; // Lấy ngày sinh làm mật khẩu
    }

    const newUser = new User({
      holyName: holyName ? holyName.trim() : '',
      fullname: fullname.trim(),
      username: finalUsername,
      password: finalPassword,
      dateOfBirth: dateOfBirth ? dateOfBirth.trim() : '',
      className: className ? className.trim() : '',
      chidoan: finalChiDoan,
      role: 'glv',
      opened: false
    });

    await newUser.save();
    res.json({ message: 'Thêm GLV thành công!', user: newUser });
  } catch (err) {
    res.status(500).json({ message: 'Lỗi server khi thêm GLV', error: err.message });
  }
});

// 3. CẬP NHẬT THÔNG TIN GLV
router.put('/users/:id', async (req, res) => {
  try {
    const { holyName, fullname, username, dateOfBirth, className, chidoan, password } = req.body;
    
    const finalChiDoan = chidoan && chidoan.trim() !== '' 
      ? chidoan.trim() 
      : await getChiDoanFromDB(className);

    const updateData = { 
      holyName: holyName || '', 
      fullname, 
      dateOfBirth: dateOfBirth || '',
      className: className || '', 
      chidoan: finalChiDoan 
    };

    if (username && username.trim() !== '') updateData.username = username.trim();
    
    // Nếu Admin nhập mật khẩu mới thủ công thì cập nhật
    if (password && password.trim() !== '') {
      updateData.password = password.trim();
    } else if (dateOfBirth && dateOfBirth.trim() !== '') {
      // Nếu không nhập mật khẩu thủ công nhưng đổi Ngày sinh -> Cập nhật mật khẩu theo Ngày sinh mới
      const dobPass = formatDobToPassword(dateOfBirth);
      if (dobPass) updateData.password = dobPass;
    }

    const updatedUser = await User.findByIdAndUpdate(req.params.id, updateData, { new: true });
    res.json({ message: 'Cập nhật thông tin thành công!', user: updatedUser });
  } catch (err) {
    res.status(500).json({ message: 'Lỗi server khi cập nhật', error: err.message });
  }
});

// Route Import Excel An Toàn & Tránh Lỗi Trùng Username / Runtime Response
router.post('/import-excel', async (req, res) => {
  try {
    const { users } = req.body;

    if (!users || !Array.isArray(users) || users.length === 0) {
      return res.status(400).json({ message: 'Dữ liệu Excel trống!' });
    }

    const newUsers = [];

    for (let index = 0; index < users.length; index++) {
      const item = users[index];

      // Hàm tìm giá trị theo danh sách tên cột
      const getVal = (possibleKeys) => {
        for (const key of Object.keys(item)) {
          const cleanKey = key.trim().toUpperCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
          for (const p of possibleKeys) {
            if (cleanKey === p.trim().toUpperCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '')) {
              return item[key] ? item[key].toString().trim() : '';
            }
          }
        }
        return '';
      };

      const holyName = getVal(['TÊN THÁNH', 'TEN THANH']);
      const ho = getVal(['HỌ', 'HO']);
      const ten = getVal(['TÊN', 'TEN']);
      let fullname = getVal(['HỌ VÀ TÊN', 'HO VA TEN', 'HỌ TÊN']);

      if (!fullname && (ho || ten)) {
        fullname = `${ho} ${ten}`.trim();
      }

      if (!fullname) continue; // Bỏ qua dòng không có tên

      const dateOfBirth = getVal(['NĂM SINH', 'NAM SINH', 'NGÀY SINH', 'NGAY SINH']);
      const className = getVal(['LỚP', 'LOP']);
      const customChidoan = getVal(['CHI ĐOÀN', 'CHI DOAN']);

      // Tạo username cơ bản không dấu
      let baseUsername = fullname
        .toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/đ/g, 'd')
        .replace(/[^a-z0-9]/g, '');

      // Tránh trùng username nếu cùng tên trong file Excel
      let username = baseUsername || `user${Date.now()}_${index}`;
      let counter = 1;
      while (newUsers.some(u => u.username === username)) {
        username = `${baseUsername}${counter}`;
        counter++;
      }

      // Format password an toàn
      let password = '123456';
      if (typeof formatDobToPassword === 'function' && dateOfBirth) {
        password = formatDobToPassword(dateOfBirth) || '123456';
      } else if (dateOfBirth) {
        password = dateOfBirth.replace(/\D/g, '') || '123456';
      }

      // Lấy chi đoàn
      let chidoan = customChidoan;
      if (!chidoan && typeof getChiDoanFromDB === 'function') {
        chidoan = await getChiDoanFromDB(className);
      }

      newUsers.push({
        holyName,
        fullname,
        username,
        password,
        dateOfBirth,
        className,
        chidoan: chidoan || '',
        role: 'glv',
        opened: false
      });
    }

    if (newUsers.length === 0) {
      return res.status(400).json({ message: 'Không tìm thấy dữ liệu hợp lệ trong file Excel!' });
    }

    // Chèn dữ liệu vào DB
    const insertedUsers = await User.insertMany(newUsers, { ordered: false });

    // Trả về kết quả CHÍNH XÁC & AN TOÀN
    return res.status(200).json({ 
      success: true,
      message: `Đã nhập thành công ${insertedUsers.length} Giáo Lý Viên!` 
    });

  } catch (err) {
    console.error('🔥 LỖI NHẬP EXCEL BACKEND:', err);
    
    // Nếu lỗi do trùng 1 số record nhưng số khác đã vào thành công
    if (err.insertedDocs && err.insertedDocs.length > 0) {
      return res.status(200).json({
        success: true,
        message: `Đã nhập thành công ${err.insertedDocs.length} Giáo Lý Viên (Một số dòng bị trùng đã được bỏ qua).`
      });
    }

    return res.status(500).json({ 
      success: false,
      message: 'Lỗi server khi import Excel: ' + err.message 
    });
  }
});
// 5. RESET TRẠNG THÁI RƯƠNG CÁC MỤC ĐÃ CHỌN (CHECKBOX)
router.post('/reset-selected', async (req, res) => {
  try {
    const { userIds } = req.body;
    
    if (!userIds || !Array.isArray(userIds) || userIds.length === 0) {
      return res.status(400).json({ message: 'Vui lòng tích chọn ít nhất 1 Giáo Lý Viên!' });
    }

    await User.updateMany(
      { _id: { $in: userIds } },
      { $set: { opened: false } }
    );

    res.json({ message: 'Reset các mục đã chọn thành công!' });
  } catch (err) {
    res.status(500).json({ message: 'Lỗi server khi reset rương đã chọn' });
  }
});

// 6. RESET TRẠNG THÁI TẤT CẢ GLV
router.post('/reset-all', async (req, res) => {
  try {
    await User.updateMany({ role: 'glv' }, { $set: { opened: false } });
    res.json({ message: 'Đã reset tất cả GLV!' });
  } catch (err) {
    res.status(500).json({ message: 'Lỗi server khi reset tất cả' });
  }
});
// Route Xóa 1 GLV
router.delete('/users/:id', async (req, res) => {
  try {
    await User.findByIdAndDelete(req.params.id);
    res.json({ message: 'Xóa thành công!' });
  } catch (err) {
    res.status(500).json({ message: 'Lỗi server khi xóa user' });
  }
});
// Route Cập nhật HÀNG LOẠT tất cả các dòng cùng lúc
router.put('/users-bulk', async (req, res) => {
  try {
    const { users } = req.body; // Mảng danh sách user đã sửa từ Frontend

    if (!users || !Array.isArray(users) || users.length === 0) {
      return res.status(400).json({ message: 'Dữ liệu không hợp lệ!' });
    }

    // Lặp qua từng user và cập nhật
    const updatePromises = users.map(async (u) => {
      const finalChiDoan = u.chidoan && u.chidoan.trim() !== '' 
        ? u.chidoan.trim() 
        : await getChiDoanFromDB(u.className);

      const updateData = {
        holyName: u.holyName || '',
        fullname: u.fullname,
        dateOfBirth: u.dateOfBirth || '',
        className: u.className || '',
        chidoan: finalChiDoan
      };

      // Tự cập nhật lại mật khẩu nếu có ngày sinh mới
      if (u.dateOfBirth && u.dateOfBirth.trim() !== '') {
        const dobPass = formatDobToPassword(u.dateOfBirth);
        if (dobPass) updateData.password = dobPass;
      }

      return User.findByIdAndUpdate(u._id, updateData, { returnDocument: 'after' });
    });

    await Promise.all(updatePromises);
    res.json({ message: 'Đã cập nhật tất cả dữ liệu thành công!' });
  } catch (err) {
    res.status(500).json({ message: 'Lỗi server khi cập nhật hàng loạt', error: err.message });
  }
});
// Route XÓA CÁC MỤC ĐÃ CHỌN (Bulk Delete)
router.post('/delete-selected', async (req, res) => {
  try {
    const { userIds } = req.body;
    if (!userIds || !Array.isArray(userIds) || userIds.length === 0) {
      return res.status(400).json({ message: 'Vui lòng chọn ít nhất 1 người để xóa!' });
    }

    await User.deleteMany({ _id: { $in: userIds } });
    res.json({ message: `Đã xóa thành công ${userIds.length} Giáo Lý Viên!` });
  } catch (err) {
    res.status(500).json({ message: 'Lỗi server khi xóa danh sách đã chọn', error: err.message });
  }
});
module.exports = router;