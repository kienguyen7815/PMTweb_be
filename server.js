const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const authRoutes = require('./routes/authRoutes');
const projectRoutes = require('./routes/projectRoutes');
const taskRoutes = require('./routes/taskRoutes');
const userRoutes = require('./routes/userRoutes');
const commentRoutes = require('./routes/commentRoutes');
const documentRoutes = require('./routes/documentRoutes');
const logRoutes = require('./routes/logRoutes');
const notificationRoutes = require('./routes/notificationRoutes');
const { errorHandler } = require('./middleware/errorHandler');

dotenv.config();
const app = express();

// Middleware configuration
app.use(cors());
app.use(express.json({ limit: '10mb' })); // Thêm limit để tránh lỗi với body lớn
app.use(express.urlencoded({ extended: true, limit: '10mb' })); // Thêm urlencoded parser

// Debug middleware để log requests
app.use((req, res, next) => {
    console.log(`${req.method} ${req.path}`);
    console.log('Content-Type:', req.get('Content-Type'));
    next();
});

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/projects', projectRoutes);
app.use('/api/tasks', taskRoutes);
app.use('/api/users', userRoutes);
app.use('/api/comments', commentRoutes);
app.use('/api/documents', documentRoutes);
app.use('/api/logs', logRoutes);
app.use('/api/notifications', notificationRoutes);

// Middleware xử lý lỗi
app.use(errorHandler);

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
