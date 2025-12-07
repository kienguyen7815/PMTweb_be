const http = require('http');
const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const helmet = require('helmet');
const morgan = require('morgan');
const compression = require('compression');
const rateLimit = require('express-rate-limit');
const path = require('path');
const { initializeSocket } = require('./socket/socketServer');

const authRoutes = require('./routes/authRoutes');
const projectRoutes = require('./routes/projectRoutes');
const taskRoutes = require('./routes/taskRoutes');
const taskAssignmentRoutes = require('./routes/taskAssignmentRoutes');
const userRoutes = require('./routes/userRoutes');
const memberRoutes = require('./routes/memberRoutes');
const commentRoutes = require('./routes/commentRoutes');
const projectCommentRoutes = require('./routes/projectCommentRoutes');
const notificationRoutes = require('./routes/notificationRoutes');
const reportRoutes = require('./routes/reportRoutes');
const aiRoutes = require('./routes/aiRoutes');
const workspaceRoutes = require('./routes/workspaceRoutes');
const adminRoutes = require('./routes/adminRoutes');
const errorHandler = require('./middleware/errorHandler');



dotenv.config();

const app = express();
const PORT = process.env.PORT || 3036;
const NODE_ENV = process.env.NODE_ENV || 'development';

// Bảo mật headers HTTP để tránh các lỗ hổng phổ biến
app.use(helmet());

// Cấu hình CORS cho phép frontend truy cập
const corsOptions = {
  origin: process.env.FRONTEND_URL || 'http://localhost:3000',
  credentials: true,
  optionsSuccessStatus: 200
};
app.use(cors(corsOptions));

// Nén response để giảm băng thông
app.use(compression());


// Xử lý JSON và URL-encoded data từ request body
const bodySizeLimit = process.env.BODY_SIZE_LIMIT || '10mb';
app.use(express.json({ limit: bodySizeLimit }));
app.use(express.urlencoded({ extended: true, limit: bodySizeLimit }));

// Phục vụ file tĩnh như ảnh avatar
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Ghi log request để debug và giám sát
if (NODE_ENV === 'development') {
  app.use(morgan('dev'));
} else {
  app.use(morgan('combined'));
}

// Endpoint kiểm tra tình trạng server
app.get('/health', (req, res) => {
  res.status(200).json({ 
    status: 'ok', 
    timestamp: new Date().toISOString(),
    environment: NODE_ENV 
  });
});

// Định tuyến các API endpoints
app.use('/api/auth', authRoutes);
app.use('/api/projects', projectRoutes);
app.use('/api/tasks', taskRoutes);
app.use('/api/task-assignments', taskAssignmentRoutes);
app.use('/api/users', userRoutes);
app.use('/api/members', memberRoutes);
app.use('/api/comments', commentRoutes);
app.use('/api/project-comments', projectCommentRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/reports', reportRoutes);
app.use('/api/ai', aiRoutes);
app.use('/api/workspaces', workspaceRoutes);
app.use('/api/admin', adminRoutes);

// Xử lý route không tồn tại
app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: 'Route not found'
  });
});

// Middleware xử lý lỗi tập trung, phải đặt cuối cùng
app.use(errorHandler);

// Tạo HTTP server để tích hợp Socket.io
const server = http.createServer(app);

// Khởi tạo WebSocket để giao tiếp real-time
initializeSocket(server);

// Khởi động server trên port đã cấu hình
server.listen(PORT, () => {
  console.log(`Server running on port ${PORT} in ${NODE_ENV} mode`);
  console.log(`Socket.io initialized and ready for connections`);
});

// Tắt server khi nhận tín hiệu kết thúc từ hệ điều hành
process.on('SIGTERM', () => {
  console.log('SIGTERM signal received: closing HTTP server');
  process.exit(0);
});

process.on('SIGINT', () => {
  console.log('SIGINT signal received: closing HTTP server');
  process.exit(0);
});
