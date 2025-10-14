const db = require('./config/db');

async function testConnection() {
    try {
        console.log('🔍 Đang kiểm tra kết nối database...');
        
        const connection = await db.getConnection();
        console.log('✅ Kết nối database thành công!');
        
        // Test query
        const [rows] = await connection.execute('SELECT 1 as test');
        console.log('✅ Test query thành công:', rows);
        
        connection.release();
        
        // Test tạo bảng users nếu chưa có
        console.log('🔍 Kiểm tra bảng users...');
        const [tables] = await db.execute("SHOW TABLES LIKE 'users'");
        
        if (tables.length === 0) {
            console.log('⚠️  Bảng users chưa tồn tại. Vui lòng chạy file database/init.sql');
        } else {
            console.log('✅ Bảng users đã tồn tại');
            
            // Đếm số users
            const [count] = await db.execute('SELECT COUNT(*) as count FROM users');
            console.log(`📊 Số lượng users: ${count[0].count}`);
        }
        
        console.log('\n🎉 Database setup hoàn tất!');
        process.exit(0);
        
    } catch (error) {
        console.error('❌ Lỗi kết nối database:', error.message);
        console.log('\n💡 Hướng dẫn khắc phục:');
        console.log('1. Đảm bảo MySQL đang chạy');
        console.log('2. Kiểm tra thông tin kết nối trong file .env');
        console.log('3. Tạo database taskhub_db');
        console.log('4. Chạy file database/init.sql để tạo tables');
        process.exit(1);
    }
}

testConnection();
