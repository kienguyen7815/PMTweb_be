const Member = require('../../models/memberModel/Member');
const User = require('../../models/userModel/User');

// Lấy danh sách members theo phân quyền
const getAll = async (req, res, next) => {
    try {
        const currentUser = req.user;
        if (!currentUser) {
            return res.status(401).json({
                success: false,
                message: 'Người dùng chưa đăng nhập'
            });
        }

        const currentRole = currentUser.role;

        // Kiểm tra quyền truy cập
        // Admin, PM, Team Leader: có quyền xem
        // Member: không có quyền (sẽ bị chặn ở middleware)
        if (!['ad', 'pm', 'tl'].includes(currentRole)) {
            return res.status(403).json({
                success: false,
                message: 'Bạn không có quyền truy cập'
            });
        }

        // Lấy tất cả members (table members không có role, nên không cần lọc)
        const members = await Member.findAll(currentRole);

        res.json({
            success: true,
            data: members.map(member => member.toJSON())
        });
    } catch (error) {
        next(error);
    }
};

// Lấy thông tin member theo ID
const getById = async (req, res, next) => {
    try {
        const member = await Member.findById(req.params.id);
        if (!member) {
            return res.status(404).json({
                success: false,
                message: 'Không tìm thấy thành viên'
            });
        }
        
        res.json({
            success: true,
            data: member.toJSON()
        });
    } catch (error) {
        next(error);
    }
};

// Tạo member mới
const create = async (req, res, next) => {
    try {
        if (process.env.NODE_ENV === 'development') {
            console.log('Member create request:', {
                body: req.body,
                user: req.user?.id
            });
        }
        
        const { name, email, date_of_birth, occupation } = req.body;
        
        // Backend validation - Xử lý toàn bộ nghiệp vụ
        if (!name || !name.trim()) {
            return res.status(400).json({ 
                success: false, 
                message: 'Tên thành viên là bắt buộc' 
            });
        }
        
        if (!email || !email.trim()) {
            return res.status(400).json({ 
                success: false, 
                message: 'Email là bắt buộc' 
            });
        }
        
        // Validate email format
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(email.trim())) {
            return res.status(400).json({ 
                success: false, 
                message: 'Email không hợp lệ' 
            });
        }
        
        // Validate date_of_birth format nếu có
        if (date_of_birth && date_of_birth.trim()) {
            const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
            if (!dateRegex.test(date_of_birth.trim())) {
                return res.status(400).json({ 
                    success: false, 
                    message: 'Ngày sinh không hợp lệ (định dạng: YYYY-MM-DD)' 
                });
            }
        }
        
        // Validate occupation length nếu có
        if (occupation && occupation.trim() && occupation.trim().length > 100) {
            return res.status(400).json({ 
                success: false, 
                message: 'Nghề nghiệp không được vượt quá 100 ký tự' 
            });
        }
        
        // Kiểm tra email đã tồn tại trong table members chưa
        const existingMember = await Member.findByEmail(email.trim());
        if (existingMember) {
            return res.status(400).json({ 
                success: false, 
                message: 'Email này đã được sử dụng trong danh sách thành viên' 
            });
        }
        
        // Tạo member mới
        const member = await Member.create({
            name: name.trim(),
            email: email.trim(),
            date_of_birth: date_of_birth && date_of_birth.trim() ? date_of_birth.trim() : null,
            occupation: occupation && occupation.trim() ? occupation.trim() : null
        });
        
        res.status(201).json({
            success: true,
            message: 'Đã thêm thành viên mới',
            data: member.toJSON()
        });
    } catch (error) {
        if (process.env.NODE_ENV === 'development') {
            console.error('Error creating member:', error);
        }
        
        if (error.message === 'Email đã được sử dụng') {
            return res.status(400).json({
                success: false,
                message: error.message
            });
        }
        
        next(error);
    }
};

// Cập nhật thông tin member
const update = async (req, res, next) => {
    try {
        if (process.env.NODE_ENV === 'development') {
            console.log('Member update request:', {
                id: req.params.id,
                body: req.body,
                user: req.user?.id
            });
        }
        
        const member = await Member.findById(req.params.id);
        if (!member) {
            return res.status(404).json({
                success: false,
                message: 'Không tìm thấy thành viên'
            });
        }

        const { name, email, date_of_birth, occupation } = req.body;
        
        // Backend validation - Xử lý toàn bộ nghiệp vụ
        if (!name || !name.trim()) {
            return res.status(400).json({ 
                success: false, 
                message: 'Tên thành viên là bắt buộc' 
            });
        }
        
        // Validate email nếu có thay đổi
        if (email && email.trim() !== member.email) {
            const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
            if (!emailRegex.test(email.trim())) {
                return res.status(400).json({ 
                    success: false, 
                    message: 'Email không hợp lệ' 
                });
            }
            
            // Kiểm tra email mới đã tồn tại chưa
            const existingMember = await Member.findByEmail(email.trim());
            if (existingMember && existingMember.id !== member.id) {
                return res.status(400).json({ 
                    success: false, 
                    message: 'Email này đã được sử dụng bởi thành viên khác' 
                });
            }
        }
        
        // Validate date_of_birth format nếu có
        if (date_of_birth !== undefined && date_of_birth && date_of_birth.trim()) {
            const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
            if (!dateRegex.test(date_of_birth.trim())) {
                return res.status(400).json({ 
                    success: false, 
                    message: 'Ngày sinh không hợp lệ (định dạng: YYYY-MM-DD)' 
                });
            }
        }
        
        // Validate occupation length nếu có
        if (occupation !== undefined && occupation && occupation.trim() && occupation.trim().length > 100) {
            return res.status(400).json({ 
                success: false, 
                message: 'Nghề nghiệp không được vượt quá 100 ký tự' 
            });
        }
        
        // Chuẩn bị dữ liệu cập nhật
        const updateData = {
            name: name.trim()
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
        await member.update(updateData);
        
        res.json({
            success: true,
            message: 'Cập nhật thông tin thành viên thành công',
            data: member.toJSON()
        });
    } catch (error) {
        if (process.env.NODE_ENV === 'development') {
            console.error('Error updating member:', error);
        }
        next(error);
    }
};

// Xóa member
const remove = async (req, res, next) => {
    try {
        const member = await Member.findById(req.params.id);
        if (!member) {
            return res.status(404).json({
                success: false,
                message: 'Không tìm thấy thành viên'
            });
        }

        await member.delete();
        
        res.json({
            success: true,
            message: 'Xóa thành viên thành công'
        });
    } catch (error) {
        next(error);
    }
};

// Tìm kiếm email theo pattern (cho autocomplete)
// Trả về member info kèm user_id nếu tìm thấy user tương ứng trong bảng users
const searchEmails = async (req, res, next) => {
    try {
        const query = req.query.q || '';
        const limit = parseInt(req.query.limit) || 10;
        
        if (!query.trim()) {
            return res.json({ success: true, data: [] });
        }
        
        const members = await Member.searchByEmail(query.trim(), limit);
        
        // Find corresponding user_id from users table based on email
        const db = require('../../config/db');
        const results = [];
        
        for (const member of members) {
            try {
                // Try to find user with same email
                const [users] = await db.execute(
                    'SELECT id, username FROM users WHERE email = ? LIMIT 1',
                    [member.email]
                );
                
                if (users.length > 0) {
                    // Member has corresponding user
                    results.push({
                        id: users[0].id, // Use user_id for project members
                        member_id: member.id, // Keep member_id for reference
                        name: member.name,
                        username: users[0].username,
                        email: member.email
                    });
                } else {
                    // Member doesn't have corresponding user - still return but with member_id
                    results.push({
                        id: member.id, // Use member_id as fallback
                        member_id: member.id,
                        name: member.name,
                        username: member.name, // Use name as username fallback
                        email: member.email
                    });
                }
            } catch (err) {
                // If error finding user, still return member
                results.push({
                    id: member.id,
                    member_id: member.id,
                    name: member.name,
                    username: member.name,
                    email: member.email
                });
            }
        }
        
        res.json({ 
            success: true, 
            data: results
        });
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
    searchEmails
};

