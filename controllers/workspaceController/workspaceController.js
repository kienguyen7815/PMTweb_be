const Workspace = require('../../models/workspaceModel/Workspace');
const WorkspaceMember = require('../../models/workspaceModel/WorkspaceMember');
const User = require('../../models/userModel/User');

// Tạo workspace mới, user tạo sẽ trở thành PM trong workspace đó
const createWorkspace = async (req, res, next) => {
    try {
        const { name, description } = req.body;
        const ownerId = req.user.id;

        if (!name || !name.trim()) {
            return res.status(400).json({
                success: false,
                message: 'Tên không gian làm việc là bắt buộc'
            });
        }

        const workspace = await Workspace.create({
            name: name.trim(),
            description: description?.trim() || null,
            owner_id: ownerId
        });

        // Thêm owner vào workspace_members với role PM
        const member = await WorkspaceMember.addMember({
            workspace_id: workspace.id,
            user_id: ownerId,
            role: 'pm'
        });

        return res.status(201).json({
            success: true,
            data: {
                workspace,
                member
            }
        });
    } catch (error) {
        next(error);
    }
};

// Lấy danh sách workspace mà user hiện tại là thành viên
const listMyWorkspaces = async (req, res, next) => {
    try {
        const userId = req.user.id;
        const items = await Workspace.findByUserId(userId);

        return res.json({
            success: true,
            data: items.map(item => ({
                id: item.workspace.id,
                name: item.workspace.name,
                description: item.workspace.description,
                owner_id: item.workspace.owner_id,
                created_at: item.workspace.created_at,
                role: item.role
            }))
        });
    } catch (error) {
        next(error);
    }
};

// Lấy chi tiết 1 workspace + members, chỉ thành viên mới xem được
const getWorkspaceDetail = async (req, res, next) => {
    try {
        const workspaceId = parseInt(req.params.id, 10);
        if (isNaN(workspaceId)) {
            return res.status(400).json({
                success: false,
                message: 'ID workspace không hợp lệ'
            });
        }

        const workspace = await Workspace.findById(workspaceId);
        if (!workspace) {
            return res.status(404).json({
                success: false,
                message: 'Không tìm thấy workspace'
            });
        }

        // Chỉ cho phép thành viên trong workspace xem
        const member = await WorkspaceMember.findByWorkspaceAndUser(
            workspaceId,
            req.user.id
        );

        if (!member) {
            return res.status(403).json({
                success: false,
                message: 'Bạn không có quyền truy cập workspace này'
            });
        }

        const members = await WorkspaceMember.listMembers(workspaceId);

        return res.json({
            success: true,
            data: {
                workspace,
                members,
                currentRole: member.role
            }
        });
    } catch (error) {
        next(error);
    }
};

// Thêm thành viên vào workspace (chỉ PM trong workspace mới được thêm)
const addMember = async (req, res, next) => {
    try {
        const workspaceId = parseInt(req.params.id, 10);
        const { user_id, role = 'mb' } = req.body;

        if (isNaN(workspaceId)) {
            return res.status(400).json({
                success: false,
                message: 'ID workspace không hợp lệ'
            });
        }

        if (!user_id || isNaN(parseInt(user_id, 10))) {
            return res.status(400).json({
                success: false,
                message: 'user_id không hợp lệ'
            });
        }

        // Kiểm tra workspace tồn tại
        const workspace = await Workspace.findById(workspaceId);
        if (!workspace) {
            return res.status(404).json({
                success: false,
                message: 'Không tìm thấy workspace'
            });
        }

        // Chỉ PM trong workspace này mới có quyền thêm
        const currentMember = await WorkspaceMember.findByWorkspaceAndUser(
            workspaceId,
            req.user.id
        );

        if (!currentMember || currentMember.role !== 'pm') {
            return res.status(403).json({
                success: false,
                message: 'Chỉ PM của workspace mới được thêm thành viên'
            });
        }

        // Kiểm tra user tồn tại
        const targetUser = await User.findById(user_id);
        if (!targetUser) {
            return res.status(404).json({
                success: false,
                message: 'Người dùng không tồn tại'
            });
        }

        const member = await WorkspaceMember.addMember({
            workspace_id: workspaceId,
            user_id,
            role
        });

        return res.status(201).json({
            success: true,
            data: member
        });
    } catch (error) {
        next(error);
    }
};

// Cập nhật role của thành viên trong workspace (chỉ PM)
const updateMemberRole = async (req, res, next) => {
    try {
        const workspaceId = parseInt(req.params.id, 10);
        const memberUserId = parseInt(req.params.userId, 10);
        const { role } = req.body;

        if (isNaN(workspaceId) || isNaN(memberUserId)) {
            return res.status(400).json({
                success: false,
                message: 'ID không hợp lệ'
            });
        }

        if (!role) {
            return res.status(400).json({
                success: false,
                message: 'role là bắt buộc'
            });
        }

        const workspace = await Workspace.findById(workspaceId);
        if (!workspace) {
            return res.status(404).json({
                success: false,
                message: 'Không tìm thấy workspace'
            });
        }

        // Chỉ PM trong workspace này mới có quyền chỉnh sửa role
        const currentMember = await WorkspaceMember.findByWorkspaceAndUser(
            workspaceId,
            req.user.id
        );

        if (!currentMember || currentMember.role !== 'pm') {
            return res.status(403).json({
                success: false,
                message: 'Chỉ PM của workspace mới được chỉnh sửa role'
            });
        }

        const existing = await WorkspaceMember.findByWorkspaceAndUser(
            workspaceId,
            memberUserId
        );

        if (!existing) {
            return res.status(404).json({
                success: false,
                message: 'Thành viên không tồn tại trong workspace'
            });
        }

        const updated = await WorkspaceMember.updateRole({
            workspace_id: workspaceId,
            user_id: memberUserId,
            role
        });

        return res.json({
            success: true,
            data: updated
        });
    } catch (error) {
        next(error);
    }
};

module.exports = {
    createWorkspace,
    listMyWorkspaces,
    getWorkspaceDetail,
    addMember,
    updateMemberRole
};


