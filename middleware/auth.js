const jwt = require('jsonwebtoken');
const User = require('../models/userModel/User');

// Middleware xác thực JWT
const authenticateToken = async (req, res, next) => {
    try {
        const authHeader = req.headers['authorization'];
        const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN

        if (!token) {
            return res.status(401).json({
                success: false,
                message: 'Token truy cập không được cung cấp'
            });
        }

        const decoded = jwt.verify(token, process.env.JWT_SECRET || 'your_jwt_secret_key_here_change_in_production');
        
        // Lấy thông tin user từ database
        const user = await User.findById(decoded.userId);
        if (!user) {
            return res.status(401).json({
                success: false,
                message: 'Người dùng không tồn tại'
            });
        }

        req.user = user;
        next();
    } catch (error) {
        return res.status(403).json({
            success: false,
            message: 'Token không hợp lệ hoặc đã hết hạn'
        });
    }
};

// Middleware kiểm tra quyền admin
const requireAdmin = (req, res, next) => {
    if (req.user.role !== 'ad') {
        return res.status(403).json({
            success: false,
            message: 'Chỉ admin mới có quyền truy cập'
        });
    }
    next();
};

// Middleware kiểm tra quyền PM hoặc Admin
const requirePMOrAdmin = (req, res, next) => {
    if (!['ad', 'pm'].includes(req.user.role)) {
        return res.status(403).json({
            success: false,
            message: 'Chỉ Project Manager hoặc Admin mới có quyền truy cập'
        });
    }
    next();
};

// Middleware kiểm tra quyền Team Leader, PM hoặc Admin
const requireLeaderOrAbove = (req, res, next) => {
    if (!['ad', 'pm', 'tl'].includes(req.user.role)) {
        return res.status(403).json({
            success: false,
            message: 'Bạn không có quyền truy cập tính năng này'
        });
    }
    next();
};

// Tạo JWT token
const generateToken = (userId) => {
    return jwt.sign(
        { userId },
        process.env.JWT_SECRET || 'your_jwt_secret_key_here_change_in_production',
        { expiresIn: process.env.JWT_EXPIRE || '7d' }
    );
};

module.exports = {
    authenticateToken,
    requireAdmin,
    requirePMOrAdmin,
    requireLeaderOrAbove,
    generateToken
};
