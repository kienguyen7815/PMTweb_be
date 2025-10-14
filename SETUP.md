# TASK HUB - Backend Setup Guide

## Yêu cầu hệ thống
- Node.js (v14 trở lên)
- MySQL (v8.0 trở lên)
- npm hoặc yarn

## Cài đặt và chạy dự án

### 1. Cài đặt dependencies
```bash
cd Backend
npm install
```

### 2. Cấu hình Database

#### Tạo file .env trong thư mục Backend:
```env
# Database Configuration
DB_HOST=localhost
DB_PORT=3306
DB_USER=root
DB_PASSWORD=your_password_here
DB_NAME=taskhub_db

# JWT Configuration
JWT_SECRET=your_jwt_secret_key_here_change_in_production
JWT_EXPIRE=7d

# Server Configuration
PORT=5000
NODE_ENV=development
```

#### Tạo database và tables:
1. Mở MySQL và tạo database:
```sql
CREATE DATABASE taskhub_db;
```

2. Chạy file SQL để tạo tables:
```bash
mysql -u root -p taskhub_db < database/init.sql
```

### 3. Chạy server
```bash
npm run dev
```

Server sẽ chạy tại: http://localhost:5000

## API Endpoints

### Authentication
- `POST /api/auth/register` - Đăng ký
- `POST /api/auth/login` - Đăng nhập
- `GET /api/auth/profile` - Lấy thông tin profile (cần token)
- `PUT /api/auth/profile` - Cập nhật profile (cần token)
- `PUT /api/auth/change-password` - Đổi mật khẩu (cần token)

### Cấu trúc dữ liệu đăng ký
```json
{
  "username": "string",
  "email": "string",
  "password": "string",
  "role": "mb|tl|pm|ad|clt",
  "phone": "string (optional)"
}
```

### Cấu trúc dữ liệu đăng nhập
```json
{
  "email": "string",
  "password": "string"
}
```

## Dữ liệu mẫu
Sau khi chạy init.sql, bạn có thể đăng nhập với các tài khoản mẫu:

| Role | Email | Password |
|------|-------|----------|
| Admin | admin@taskhub.com | password |
| Project Manager | pm@taskhub.com | password |
| Team Leader | tl@taskhub.com | password |
| Member | member@taskhub.com | password |
| Client | client@taskhub.com | password |

## Lưu ý
- Đảm bảo MySQL đang chạy trước khi start server
- Thay đổi JWT_SECRET trong production
- Cập nhật DB_PASSWORD theo cấu hình MySQL của bạn
