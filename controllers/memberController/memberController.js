const Member = require('../../models/memberModel/Member');
const User = require('../../models/userModel/User');
const WorkspaceMember = require('../../models/workspaceModel/WorkspaceMember');

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

        // Sử dụng workspace role nếu có, fallback về user role
        const currentRole = req.workspaceRole || currentUser.role;

        // Kiểm tra quyền truy cập
        // Admin, PM, Team Leader: có quyền xem
        // Member: không có quyền (sẽ bị chặn ở middleware)
        if (!['ad', 'pm', 'tl'].includes(currentRole)) {
            return res.status(403).json({
                success: false,
                message: 'Bạn không có quyền truy cập'
            });
        }

        // Lấy tất cả members trong workspace hiện tại
        const workspaceId = req.workspaceId || null;
        const members = await Member.findAll(currentRole, workspaceId);

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
        
        // Nếu có workspace context, đảm bảo member thuộc workspace đó
        if (req.workspaceId && member.workspace_id && member.workspace_id !== req.workspaceId) {
            return res.status(403).json({
                success: false,
                message: 'Thành viên không thuộc workspace hiện tại'
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
        const workspaceId = req.workspaceId || null;
        
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
        
        // Kiểm tra email đã tồn tại trong table members cùng workspace chưa
        const existingMember = await Member.findByEmail(email.trim());
        if (existingMember && (!existingMember.workspace_id || existingMember.workspace_id === workspaceId)) {
            return res.status(400).json({ 
                success: false, 
                message: 'Email này đã được sử dụng trong danh sách thành viên' 
            });
        }
        
        // Tạo member mới, gắn với workspace hiện tại (nếu có)
        const member = await Member.create({
            workspace_id: workspaceId,
            name: name.trim(),
            email: email.trim(),
            date_of_birth: date_of_birth && date_of_birth.trim() ? date_of_birth.trim() : null,
            occupation: occupation && occupation.trim() ? occupation.trim() : null
        });

        // Nếu có workspace context và tồn tại user trong hệ thống với email này,
        // tự động thêm user đó vào workspace_members để khi đăng nhập sẽ thấy workspace.
        if (workspaceId) {
            try {
                const existingUser = await User.findByEmail(email.trim());
                if (existingUser) {
                    // Mặc định role là 'mb' trong workspace; PM có thể chỉnh sau nếu cần
                    await WorkspaceMember.addMember({
                        workspace_id: workspaceId,
                        user_id: existingUser.id,
                        role: 'mb'
                    });
                }
            } catch (linkErr) {
                if (process.env.NODE_ENV === 'development') {
                    console.error('Error linking workspace member from member create:', linkErr);
                }
                // Không làm fail request nếu phần liên kết workspace member lỗi
            }
        }
        
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
        // Nếu có workspace context, đảm bảo member thuộc workspace đó
        if (req.workspaceId && member.workspace_id && member.workspace_id !== req.workspaceId) {
            return res.status(403).json({
                success: false,
                message: 'Thành viên không thuộc workspace hiện tại'
            });
        }

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
        
        const workspaceId = req.workspaceId || null;
        const members = await Member.searchByEmail(query.trim(), limit, workspaceId);

        // Tối ưu: join một lần để lấy luôn user tương ứng (tránh N+1 query)
        const db = require('../../config/db');

        if (!members.length) {
            return res.json({ success: true, data: [] });
        }

        const memberEmails = members.map(m => m.email);
        const placeholders = memberEmails.map(() => '?').join(', ');

        const [users] = await db.execute(
            `SELECT id, username, email FROM users WHERE email IN (${placeholders})`,
            memberEmails
        );

        const userByEmail = new Map(users.map(u => [u.email, u]));

        const results = members.map(member => {
            const user = userByEmail.get(member.email);

            if (user) {
                return {
                    id: user.id,               // user_id dùng cho project members
                    member_id: member.id,      // giữ lại member_id để tham chiếu
                    name: member.name,
                    username: user.username,
                    email: member.email
                };
            }

            // Không có user tương ứng vẫn trả về theo member
            return {
                id: member.id,
                member_id: member.id,
                name: member.name,
                username: member.name,
                email: member.email
            };
        });

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

