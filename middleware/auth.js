const jwt = require('jsonwebtoken');
const User = require('../models/userModel/User');

// Simple in-memory cache for user data (optional optimization)
const userCache = new Map();
const CACHE_TTL = parseInt(process.env.AUTH_CACHE_TTL || '300000', 10); // Default: 5 minutes
const CACHE_MAX_SIZE = parseInt(process.env.AUTH_CACHE_MAX_SIZE || '100', 10); // Default: 100 entries

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

        const JWT_SECRET = process.env.JWT_SECRET;
        if (!JWT_SECRET) {
            console.error('JWT_SECRET is not set in environment variables');
            return res.status(500).json({
                success: false,
                message: 'Server configuration error'
            });
        }

        const decoded = jwt.verify(token, JWT_SECRET);
        
        // Check cache first
        const cacheKey = `user_${decoded.userId}`;
        const cached = userCache.get(cacheKey);
        
        if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
            req.user = cached.user;
            return next();
        }
        
        // Lấy thông tin user từ database
        const user = await User.findById(decoded.userId);
        if (!user) {
            return res.status(401).json({
                success: false,
                message: 'Người dùng không tồn tại'
            });
        }

        // Cache user data
        userCache.set(cacheKey, {
            user,
            timestamp: Date.now()
        });
        
        // Clean old cache entries (simple cleanup)
        if (userCache.size > CACHE_MAX_SIZE) {
            const now = Date.now();
            for (const [key, value] of userCache.entries()) {
                if (now - value.timestamp > CACHE_TTL) {
                    userCache.delete(key);
                }
            }
        }

        req.user = user;
        next();
    } catch (error) {
        if (error.name === 'TokenExpiredError') {
            return res.status(401).json({
                success: false,
                message: 'Token đã hết hạn'
            });
        }
        if (error.name === 'JsonWebTokenError') {
            return res.status(401).json({
                success: false,
                message: 'Token không hợp lệ'
            });
        }
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

// Middleware kiểm tra quyền xem (tất cả role)
const requireViewPermission = (req, res, next) => {
    if (!['ad', 'pm', 'tl', 'mb'].includes(req.user.role)) {
        return res.status(403).json({
            success: false,
            message: 'Bạn không có quyền xem tính năng này'
        });
    }
    next();
};

// Middleware kiểm tra quyền chỉnh sửa (TL, PM, Admin)
const requireEditPermission = (req, res, next) => {
    if (!['ad', 'pm', 'tl'].includes(req.user.role)) {
        return res.status(403).json({
            success: false,
            message: 'Bạn không có quyền chỉnh sửa tính năng này'
        });
    }
    next();
};

// Middleware kiểm tra quyền quản lý thành viên (TL, PM, Admin)
const requireMemberManagement = (req, res, next) => {
    if (!['ad', 'pm', 'tl'].includes(req.user.role)) {
        return res.status(403).json({
            success: false,
            message: 'Bạn không có quyền quản lý thành viên'
        });
    }
    next();
};

// Middleware kiểm tra quyền xem thành viên (tất cả role)
const requireViewMembers = (req, res, next) => {
    if (!['ad', 'pm', 'tl', 'mb'].includes(req.user.role)) {
        return res.status(403).json({
            success: false,
            message: 'Bạn không có quyền xem danh sách thành viên'
        });
    }
    next();
};

// Tạo JWT token
const generateToken = (userId) => {
    const JWT_SECRET = process.env.JWT_SECRET;
    if (!JWT_SECRET) {
        throw new Error('JWT_SECRET is not configured');
    }
    
    return jwt.sign(
        { userId },
        JWT_SECRET,
        { expiresIn: process.env.JWT_EXPIRE || '7d' }
    );
};

module.exports = {
    authenticateToken,
    requireAdmin,
    requirePMOrAdmin,
    requireLeaderOrAbove,
    requireViewPermission,
    requireEditPermission,
    requireMemberManagement,
    requireViewMembers,
    generateToken
};
