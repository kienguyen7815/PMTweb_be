const WorkspaceMember = require('../models/workspaceModel/WorkspaceMember');

/**
 * Middleware để lấy role của user trong workspace từ bảng workspace_members
 * Role sẽ được lưu vào req.workspaceRole
 * 
 * Có thể lấy workspace_id từ:
 * - req.body.workspace_id
 * - req.query.workspace_id
 * - req.params.workspace_id
 * - req.headers['x-workspace-id']
 * 
 * Hoặc từ project_id nếu có (thông qua project.workspace_id)
 */
const getWorkspaceRole = async (req, res, next) => {
    try {
        // Lấy workspace_id từ các nguồn khác nhau
        let workspaceId = req.body?.workspace_id || 
                         req.query?.workspace_id || 
                         req.params?.workspace_id ||
                         req.headers['x-workspace-id'];

        // Nếu không có workspace_id trực tiếp, thử lấy từ project_id
        if (!workspaceId) {
            const projectId = req.body?.project_id || 
                             req.query?.project_id || 
                             req.params?.projectId ||
                             req.params?.id; // Có thể là project id trong task routes

            if (projectId) {
                const db = require('../config/db');
                const [rows] = await db.execute(
                    'SELECT workspace_id FROM prj WHERE id = ?',
                    [projectId]
                );
                if (rows.length > 0 && rows[0].workspace_id) {
                    workspaceId = rows[0].workspace_id;
                }
            }
        }

        // Nếu vẫn không có workspace_id, không set workspaceRole
        if (!workspaceId) {
            req.workspaceRole = null;
            req.workspaceId = null;
            return next();
        }

        // Lấy role từ workspace_members
        const member = await WorkspaceMember.findByWorkspaceAndUser(
            parseInt(workspaceId),
            req.user.id
        );

        if (member) {
            req.workspaceRole = member.role;
            req.workspaceId = parseInt(workspaceId);
            req.workspaceMember = member;
        } else {
            req.workspaceRole = null;
            req.workspaceId = parseInt(workspaceId);
            req.workspaceMember = null;
        }

        next();
    } catch (error) {
        // Nếu có lỗi, không block request, chỉ không set workspaceRole
        req.workspaceRole = null;
        req.workspaceId = null;
        req.workspaceMember = null;
        next();
    }
};

/**
 * Helper function để lấy role hiện tại (ưu tiên workspace role, fallback về user role)
 */
const getCurrentRole = (req) => {
    return req.workspaceRole || req.user?.role || null;
};

/**
 * Middleware kiểm tra user có phải là thành viên của workspace không
 */
const requireWorkspaceMember = async (req, res, next) => {
    if (!req.workspaceId) {
        return res.status(400).json({
            success: false,
            message: 'Workspace ID là bắt buộc'
        });
    }

    if (!req.workspaceMember) {
        return res.status(403).json({
            success: false,
            message: 'Bạn không phải là thành viên của workspace này'
        });
    }

    next();
};

module.exports = {
    getWorkspaceRole,
    getCurrentRole,
    requireWorkspaceMember
};

