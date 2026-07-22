const mongoose = require('mongoose');
require('dotenv').config();

const User = require('./src/models/User');

const initData = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('🍃 Kết nối MongoDB Atlas thành công!');

    await User.deleteMany({});
    console.log('🧹 Đã dọn dẹp Database cũ!');

    const users = [
      {
        username: 'admin',
        password: '123',
        fullName: 'Ban Điều Hành',
        role: 'admin',
        assignedClass: 'Ban Quản Lý',
        hasOpenedChest: false
      },
      {
        username: 'phanxuantien',
        password: '01012000',
        fullName: 'Phan Xuân Tiến',
        role: 'glv',
        assignedClass: 'Nghĩa 1A',
        hasOpenedChest: false
      }
    ];

    await User.insertMany(users);
    console.log('✅ Đã khởi tạo thành công 1 Admin & 1 GLV mẫu!');

    mongoose.connection.close();
    process.exit();
  } catch (error) {
    console.error('❌ Lỗi khởi tạo Database:', error.message);
    process.exit(1);
  }
};

initData();