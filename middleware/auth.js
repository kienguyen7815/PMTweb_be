const jwt = require('jsonwebtoken');
const User = require('../models/userModel/User');

// Cache tạm thời để tránh truy vấn database nhiều lần cho cùng user
const userCache = new Map();
const CACHE_TTL = parseInt(process.env.AUTH_CACHE_TTL || '300000', 10); // Default: 5 minutes
const CACHE_MAX_SIZE = parseInt(process.env.AUTH_CACHE_MAX_SIZE || '100', 10); // Default: 100 entries

// Xác thực JWT token từ header Authorization
const authenticateToken = async (req, res, next) => {
    try {
        const authHeader = req.headers['authorization'];
        const token = authHeader && authHeader.split(' ')[1];

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
        
        // Kiểm tra cache trước khi truy vấn database
        const cacheKey = `user_${decoded.userId}`;
        const cached = userCache.get(cacheKey);
        
        if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
            req.user = cached.user;
            return next();
        }
        
        // Lấy thông tin user từ database để xác nhận tồn tại
        const user = await User.findById(decoded.userId);
        if (!user) {
            return res.status(401).json({
                success: false,
                message: 'Người dùng không tồn tại'
            });
        }

        // Lưu vào cache để giảm tải database
        userCache.set(cacheKey, {
            user,
            timestamp: Date.now()
        });
        
        // Dọn dẹp cache khi vượt quá giới hạn
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

// Lấy role hiện tại của user, ưu tiên workspace role nếu có
const getCurrentRole = (req) => {
    // Workspace role chỉ áp dụng trong phạm vi workspace cụ thể
    if (req.workspaceRole) {
        return req.workspaceRole;
    }
    // Sử dụng user role toàn cục nếu không có workspace context
    return req.user?.role || null;
};

// Kiểm tra quyền admin cấp toàn hệ thống
const requireAdmin = (req, res, next) => {
    // Admin chỉ có hiệu lực ở phạm vi toàn cục
    if (req.workspaceRole) {
        return res.status(403).json({
            success: false,
            message: 'Tính năng này chỉ dành cho Admin ở global scope'
        });
    }
    // Chấp nhận cả viết tắt 'ad' và đầy đủ 'admin'
    const userRole = String(req.user.role).toLowerCase();
    if (userRole !== 'ad' && userRole !== 'admin') {
        return res.status(403).json({
            success: false,
            message: 'Chỉ admin mới có quyền truy cập'
        });
    }
    next();
};

// Kiểm tra quyền PM hoặc Admin để thực hiện thao tác quan trọng
const requirePMOrAdmin = (req, res, next) => {
    const currentRole = getCurrentRole(req);
    // Workspace: chỉ PM mới có quyền
    if (req.workspaceRole) {
        if (currentRole !== 'pm') {
            return res.status(403).json({
                success: false,
                message: 'Chỉ Project Manager trong workspace mới có quyền truy cập'
            });
        }
    } else {
        // Toàn cục: Admin hoặc PM
        if (!['ad', 'pm'].includes(currentRole)) {
            return res.status(403).json({
                success: false,
                message: 'Chỉ Project Manager hoặc Admin mới có quyền truy cập'
            });
        }
    }
    next();
};

// Kiểm tra quyền Team Leader trở lên (TL, PM, Admin)
const requireLeaderOrAbove = (req, res, next) => {
    const currentRole = getCurrentRole(req);
    // Workspace: PM hoặc TL
    if (req.workspaceRole) {
        if (!['pm', 'tl'].includes(currentRole)) {
            return res.status(403).json({
                success: false,
                message: 'Bạn không có quyền truy cập tính năng này'
            });
        }
    } else {
        // Toàn cục: Admin, PM hoặc TL
        if (!['ad', 'pm', 'tl'].includes(currentRole)) {
            return res.status(403).json({
                success: false,
                message: 'Bạn không có quyền truy cập tính năng này'
            });
        }
    }
    next();
};

// Kiểm tra quyền xem, áp dụng cho tất cả role có trong hệ thống
const requireViewPermission = (req, res, next) => {
    const currentRole = getCurrentRole(req);
    // Workspace: PM, TL, MB, CLT
    if (req.workspaceRole) {
        if (!['pm', 'tl', 'mb', 'clt'].includes(currentRole)) {
            return res.status(403).json({
                success: false,
                message: 'Bạn không có quyền xem tính năng này'
            });
        }
    } else {
        // Toàn cục: Admin, PM, TL, MB
        if (!['ad', 'pm', 'tl', 'mb'].includes(currentRole)) {
            return res.status(403).json({
                success: false,
                message: 'Bạn không có quyền xem tính năng này'
            });
        }
    }
    next();
};

// Kiểm tra quyền chỉnh sửa, chỉ TL, PM hoặc Admin
const requireEditPermission = (req, res, next) => {
    const currentRole = getCurrentRole(req);
    // Workspace: PM hoặc TL
    if (req.workspaceRole) {
        if (!['pm', 'tl'].includes(currentRole)) {
            return res.status(403).json({
                success: false,
                message: 'Bạn không có quyền chỉnh sửa tính năng này'
            });
        }
    } else {
        // Toàn cục: Admin, PM hoặc TL
        if (!['ad', 'pm', 'tl'].includes(currentRole)) {
            return res.status(403).json({
                success: false,
                message: 'Bạn không có quyền chỉnh sửa tính năng này'
            });
        }
    }
    next();
};

// Kiểm tra quyền quản lý thành viên trong project/workspace
const requireMemberManagement = (req, res, next) => {
    const currentRole = getCurrentRole(req);
    // Workspace: PM hoặc TL (TL có thể xem danh sách để assign task)
    if (req.workspaceRole) {
        if (!['pm', 'tl'].includes(currentRole)) {
            return res.status(403).json({
                success: false,
                message: 'Chỉ Project Manager hoặc Team Leader trong workspace mới có quyền quản lý thành viên'
            });
        }
    } else {
        // Toàn cục: Admin, PM hoặc TL
        if (!['ad', 'pm', 'tl'].includes(currentRole)) {
            return res.status(403).json({
                success: false,
                message: 'Bạn không có quyền quản lý thành viên'
            });
        }
    }
    next();
};

// Kiểm tra quyền xem danh sách thành viên
const requireViewMembers = (req, res, next) => {
    const currentRole = getCurrentRole(req);
    // Workspace: PM, TL, MB, CLT
    if (req.workspaceRole) {
        if (!['pm', 'tl', 'mb', 'clt'].includes(currentRole)) {
            return res.status(403).json({
                success: false,
                message: 'Bạn không có quyền xem danh sách thành viên'
            });
        }
    } else {
        // Toàn cục: Admin, PM, TL, MB
        if (!['ad', 'pm', 'tl', 'mb'].includes(currentRole)) {
            return res.status(403).json({
                success: false,
                message: 'Bạn không có quyền xem danh sách thành viên'
            });
        }
    }
    next();
};

// Kiểm tra quyền tìm kiếm thành viên (tất cả role đều có quyền)
const requireSearchMembers = (req, res, next) => {
    const currentRole = getCurrentRole(req);
    // Workspace: PM, TL, MB, CLT
    if (req.workspaceRole) {
        if (!['pm', 'tl', 'mb', 'clt'].includes(currentRole)) {
            return res.status(403).json({
                success: false,
                message: 'Bạn không có quyền tìm kiếm thành viên'
            });
        }
    } else {
        // Toàn cục: Admin, PM, TL, MB
        if (!['ad', 'pm', 'tl', 'mb'].includes(currentRole)) {
            return res.status(403).json({
                success: false,
                message: 'Bạn không có quyền tìm kiếm thành viên'
            });
        }
    }
    next();
};

// Tạo JWT token chứa userId với thời gian hết hạn
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
    requireSearchMembers,
    generateToken,
    getCurrentRole
};
