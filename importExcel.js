const XLSX = require('xlsx');
const mongoose = require('mongoose');
const User = require('./models/User'); // Model User bạn đã khai báo

// Hàm xóa dấu tiếng Việt để tạo username (vd: "Nguyễn Văn An" -> "nguyenvanan")
function removeAccents(str) {
  return str
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/đ/g, 'd')
    .replace(/Đ/g, 'D')
    .toLowerCase()
    .replace(/\s+/g, ''); // Xóa khoảng trắng
}

async function importFromExcel(filePath) {
  try {
    // 1. Đọc file Excel
    const workbook = XLSX.readFile(filePath);
    const sheetName = workbook.SheetNames[0]; // Lấy sheet đầu tiên
    const rawData = XLSX.utils.sheet_to_json(workbook.Sheets[sheetName]);

    const usersToInsert = [];

    // 2. Chuyển đổi từng dòng Excel sang định dạng Document MongoDB
    for (const row of rawData) {
      const fullname = row['Họ tên'] || row['fullname'];
      const dob = row['Ngày sinh'] || row['dob']; // Ví dụ: 15/08/2000
      const className = row['Lớp'] || row['className'] || '';

      if (!fullname) continue; // Bỏ qua nếu dòng đó trống tên

      // Tạo username: viết liền, không dấu, không hoa
      const username = removeAccents(fullname);

      // Định dạng password từ Ngày sinh (Ví dụ: 15/08/2000 -> 15082000)
      const password = String(dob).replace(/[/.-]/g, ''); 

      usersToInsert.push({
        fullname: fullname,
        username: username,
        password: password,
        className: className,
        role: 'glv',
        opened: false
      });
    }

    // 3. Đẩy tất cả dữ liệu vào MongoDB
    // (Dùng insertMany để lưu hàng loạt rất nhanh)
    await User.insertMany(usersToInsert);
    console.log(`✅ Đã thêm thành công ${usersToInsert.length} Giáo Lý Viên vào MongoDB!`);

  } catch (error) {
    console.error('❌ Lỗi import Excel:', error);
  }
}

module.exports = importFromExcel;