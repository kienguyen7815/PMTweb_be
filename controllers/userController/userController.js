const User = require('../../models/userModel/User');
const db = require('../../config/db');
const bcrypt = require('bcryptjs');

// Lấy danh sách users theo phân quyền
const getAll = async (req, res, next) => {
    try {
        const currentUser = req.user;
        if (!currentUser) {
            return res.status(401).json({
                success: false,
                message: 'Người dùng chưa đăng nhập'
            });
        }

        // Sử dụng workspace role nếu có, fallback về user role (global)
        const currentRole = req.workspaceRole || currentUser.role;
        const workspaceId = req.workspaceId;
        let users;

        // Admin: hiển thị toàn bộ (chỉ ở global scope)
        if (currentRole === 'ad' && !workspaceId) {
            users = await User.findAll();
        }
        // PM: hiển thị role là tl, mb, clt (không hiển thị ad, pm)
        else if (currentRole === 'pm') {
            if (workspaceId) {
                // Trong workspace context, lấy users từ workspace_members với role tl, mb, clt
                const sql = `
                    SELECT DISTINCT u.*
                    FROM users u
                    INNER JOIN workspace_members wm ON u.id = wm.user_id
                    WHERE wm.workspace_id = ? AND wm.role IN (?, ?, ?)
                    ORDER BY u.created_at DESC
                `;
                const [rows] = await db.execute(sql, [workspaceId, 'tl', 'mb', 'clt']);
                users = rows.map(row => new User(row));
            } else {
                // Global context, lấy từ users table
                const sql = 'SELECT * FROM users WHERE role IN (?, ?, ?) ORDER BY created_at DESC';
                const [rows] = await db.execute(sql, ['tl', 'mb', 'clt']);
                users = rows.map(row => new User(row));
            }
        }
        // Team Leader: hiển thị role là mb, clt (không hiển thị ad, pm, tl)
        else if (currentRole === 'tl') {
            if (workspaceId) {
                // Trong workspace context, lấy users từ workspace_members với role mb, clt
                const sql = `
                    SELECT DISTINCT u.*
                    FROM users u
                    INNER JOIN workspace_members wm ON u.id = wm.user_id
                    WHERE wm.workspace_id = ? AND wm.role IN (?, ?)
                    ORDER BY u.created_at DESC
                `;
                const [rows] = await db.execute(sql, [workspaceId, 'mb', 'clt']);
                users = rows.map(row => new User(row));
            } else {
                // Global context, lấy từ users table
                const sql = 'SELECT * FROM users WHERE role IN (?, ?) ORDER BY created_at DESC';
                const [rows] = await db.execute(sql, ['mb', 'clt']);
                users = rows.map(row => new User(row));
            }
        }
        // Member: không có quyền (sẽ bị chặn ở middleware)
        else {
            return res.status(403).json({
                success: false,
                message: 'Bạn không có quyền truy cập'
            });
        }

        res.json({
            success: true,
            data: users.map(user => user.toJSON())
        });
    } catch (error) {
        next(error);
    }
};

// Lấy thông tin user theo ID
const getById = async (req, res, next) => {
    try {
        const user = await User.findById(req.params.id);
        if (!user) {
            return res.status(404).json({
                success: false,
                message: 'Không tìm thấy người dùng'
            });
        }
        
        res.json({
            success: true,
            data: user.toJSON()
        });
    } catch (error) {
        next(error);
    }
};

// Tạo user mới (chỉ thêm thành viên với email đã đăng ký)
const create = async (req, res, next) => {
    try {
        if (process.env.NODE_ENV === 'development') {
            console.log('User create request:', {
                body: req.body,
                user: req.user?.id
            });
        }
        
        const { username, email, date_of_birth, occupation } = req.body;
        
        // Backend validation
        if (!username || !username.trim()) {
            return res.status(400).json({ success: false, message: 'Tên người dùng là bắt buộc' });
        }
        
        if (!email || !email.trim()) {
            return res.status(400).json({ success: false, message: 'Email là bắt buộc' });
        }
        
        // Validate email format
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(email)) {
            return res.status(400).json({ success: false, message: 'Email không hợp lệ' });
        }
        
        // Validate date_of_birth format nếu có
        if (date_of_birth && date_of_birth.trim()) {
            const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
            if (!dateRegex.test(date_of_birth.trim())) {
                return res.status(400).json({ success: false, message: 'Ngày sinh không hợp lệ (định dạng: YYYY-MM-DD)' });
            }
        }
        
        // Kiểm tra email phải thuộc user đã đăng ký với role tl, mb, clt
        const existingUser = await User.findByEmail(email.trim());
        if (!existingUser) {
            return res.status(400).json({ success: false, message: 'Email chưa được đăng ký trong hệ thống' });
        }
        
        // Kiểm tra role phải là tl, mb, hoặc clt
        const allowedRoles = ['tl', 'mb', 'clt'];
        if (!allowedRoles.includes(existingUser.role)) {
            return res.status(400).json({ success: false, message: 'Email này không thuộc Team Leader, Member hoặc Client' });
        }
        
        // Chuẩn bị dữ liệu cập nhật
        const updateData = {};
        if (existingUser.username !== username.trim()) {
            updateData.username = username.trim();
        }
        if (date_of_birth !== undefined) {
            updateData.date_of_birth = date_of_birth && date_of_birth.trim() ? date_of_birth.trim() : null;
        }
        if (occupation !== undefined) {
            updateData.occupation = occupation && occupation.trim() ? occupation.trim() : null;
        }
        
        // Cập nhật thông tin nếu có thay đổi
        if (Object.keys(updateData).length > 0) {
            await existingUser.update(updateData);
        }
        
        res.status(201).json({
            success: true,
            message: 'Đã thêm thành viên',
            data: existingUser.toJSON()
        });
    } catch (error) {
        if (process.env.NODE_ENV === 'development') {
            console.error('Error creating user:', error);
        }
        next(error);
    }
};

// Cập nhật thông tin user (chỉ username và email)
const update = async (req, res, next) => {
    try {
        if (process.env.NODE_ENV === 'development') {
            console.log('User update request:', {
                id: req.params.id,
                body: req.body,
                user: req.user?.id
            });
        }
        
        const user = await User.findById(req.params.id);
        if (!user) {
            return res.status(404).json({
                success: false,
                message: 'Không tìm thấy người dùng'
            });
        }

        const { username, email, date_of_birth, occupation } = req.body;
        
        // Validate username
        if (!username || !username.trim()) {
            return res.status(400).json({ success: false, message: 'Tên người dùng là bắt buộc' });
        }
        
        // Validate email if provided
        if (email) {
            const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
            if (!emailRegex.test(email)) {
                return res.status(400).json({ success: false, message: 'Email không hợp lệ' });
            }
            
            // Kiểm tra email phải thuộc user đã đăng ký với role tl, mb, clt
            const existingUser = await User.findByEmail(email.trim());
            if (!existingUser) {
                return res.status(400).json({ success: false, message: 'Email chưa được đăng ký trong hệ thống' });
            }
            
            // Kiểm tra role phải là tl, mb, hoặc clt
            const allowedRoles = ['tl', 'mb', 'clt'];
            if (!allowedRoles.includes(existingUser.role)) {
                return res.status(400).json({ success: false, message: 'Email này không thuộc Team Leader, Member hoặc Client' });
            }
            
            // Nếu email khác với email hiện tại, kiểm tra xem email mới có phải là user khác không
            if (existingUser.id !== parseInt(req.params.id)) {
                return res.status(400).json({ success: false, message: 'Email này đã được sử dụng bởi người dùng khác' });
            }
        }
        
        // Validate date_of_birth format nếu có
        if (date_of_birth && date_of_birth.trim()) {
            const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
            if (!dateRegex.test(date_of_birth.trim())) {
                return res.status(400).json({ success: false, message: 'Ngày sinh không hợp lệ (định dạng: YYYY-MM-DD)' });
            }
        }
        
        // Chuẩn bị dữ liệu cập nhật
        const updateData = {
            username: username.trim()
        };
        
        if (email) {
            updateData.email = email.trim();
        }
        
        if (date_of_birth !== undefined) {
            updateData.date_of_birth = date_of_birth && date_of_birth.trim() ? date_of_birth.trim() : null;
        }
        
        if (occupation !== undefined) {
            updateData.occupation = occupation && occupation.trim() ? occupation.trim() : null;
        }
        
        // Cập nhật thông tin
        await user.update(updateData);
        
        res.json({
            success: true,
            message: 'Cập nhật thông tin thành viên thành công',
            data: user.toJSON()
        });
    } catch (error) {
        if (process.env.NODE_ENV === 'development') {
            console.error('Error updating user:', error);
        }
        next(error);
    }
};

// Xóa user
const remove = async (req, res, next) => {
    try {
        const user = await User.findById(req.params.id);
        if (!user) {
            return res.status(404).json({
                success: false,
                message: 'Không tìm thấy người dùng'
            });
        }

        // Không cho phép xóa chính mình
        if (user.id === req.user.id) {
            return res.status(400).json({
                success: false,
                message: 'Không thể xóa tài khoản của chính mình'
            });
        }

        await user.delete();
        
        res.json({
            success: true,
            message: 'Xóa người dùng thành công'
        });
    } catch (error) {
        next(error);
    }
};

// Lấy danh sách users cho việc thêm vào project (với tìm kiếm)
const getAvailableMembers = async (req, res, next) => {
    try {
        const query = req.query.q || '';
        const limit = parseInt(req.query.limit) || 50;
        const workspaceId = req.workspaceId;
        
        let sql;
        const params = [];
        
        // Nếu có workspace context, join với workspace_members để lấy role
        if (workspaceId) {
            sql = `
                SELECT u.id, u.username, u.email, u.phone, u.avatar,
                       COALESCE(wm.role, NULL) as role
                FROM users u
                LEFT JOIN workspace_members wm ON u.id = wm.user_id AND wm.workspace_id = ?
            `;
            params.push(workspaceId);
            
            // If query provided, search by username or email
            if (query.trim()) {
                sql += ` WHERE (u.username LIKE ? OR u.email LIKE ?)`;
                const searchPattern = `%${query.trim()}%`;
                params.push(searchPattern, searchPattern);
            }
            
            sql += ` ORDER BY u.username ASC`;
        } else {
            // Không có workspace context, chỉ lấy thông tin cơ bản
            sql = `
                SELECT id, username, email, phone, avatar
                FROM users 
            `;
            
            // If query provided, search by username or email
            if (query.trim()) {
                sql += ` WHERE username LIKE ? OR email LIKE ?`;
                const searchPattern = `%${query.trim()}%`;
                params.push(searchPattern, searchPattern);
            }
            
            sql += ` ORDER BY username ASC`;
        }
        
        // MySQL doesn't support placeholder for LIMIT, validate and use string interpolation
        const limitNum = parseInt(limit, 10);
        if (isNaN(limitNum) || limitNum < 1) {
            return res.status(400).json({ success: false, message: 'Limit must be a positive integer' });
        }
        sql += ` LIMIT ${limitNum}`;
        
        const [rows] = await db.execute(sql, params);
        res.json({ success: true, data: rows });
    } catch (error) {
        next(error);
    }
};

// Tìm kiếm email theo pattern (chỉ các role tl, mb)
const searchEmails = async (req, res, next) => {
    try {
        const query = req.query.q || '';
        const limit = parseInt(req.query.limit) || 10;
        const workspaceId = req.workspaceId;
        
        if (!query.trim()) {
            return res.json({ success: true, data: [] });
        }
        
        // Ensure limit is a valid positive integer
        const limitValue = Number.isInteger(limit) && limit > 0 ? limit : 10;
        
        const searchPattern = `%${query.trim()}%`;
        let sql;
        let params;
        
        if (workspaceId) {
            // Trong workspace context, lấy role từ workspace_members
            sql = `
                SELECT u.id, u.username, u.email, wm.role
                FROM users u
                INNER JOIN workspace_members wm ON u.id = wm.user_id
                WHERE wm.workspace_id = ? AND u.email LIKE ? AND wm.role IN ('tl', 'mb')
                ORDER BY u.email
            `;
            params = [workspaceId, searchPattern];
        } else {
            // Global context, lấy role từ users table
            sql = `SELECT id, username, email, role FROM users WHERE email LIKE ? AND role IN ('tl', 'mb') ORDER BY email`;
            params = [searchPattern];
        }
        
        // LIMIT cannot use placeholder in some MySQL versions, so we include it directly in SQL
        sql += ` LIMIT ${limitValue}`;
        
        const [rows] = await db.execute(sql, params);
        res.json({ success: true, data: rows });
    } catch (error) {
        next(error);
    }
};

module.exports = {
    getAll,
    getById,
    create,
    update,
    remove,
    getAvailableMembers,
    searchEmails
};

