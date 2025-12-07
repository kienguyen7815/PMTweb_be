const WorkspaceMember = require('../models/workspaceModel/WorkspaceMember');

/**
 * Lấy role của user trong workspace cụ thể để phân quyền chính xác
 * Workspace ID có thể lấy từ body, query, params hoặc header
 * Nếu không có workspace_id, có thể lấy từ project_id
 */
const getWorkspaceRole = async (req, res, next) => {
    try {
        // Thử lấy workspace_id từ nhiều nguồn khác nhau
        let workspaceId = req.body?.workspace_id || 
                         req.query?.workspace_id || 
                         req.params?.workspace_id ||
                         req.headers['x-workspace-id'];

        // Nếu không có workspace_id, thử lấy từ project_id
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

        // Không có workspace context nào, bỏ qua middleware này
        if (!workspaceId) {
            req.workspaceRole = null;
            req.workspaceId = null;
            return next();
        }

        // Lấy role của user trong workspace này từ bảng workspace_members
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
        // Không chặn request nếu có lỗi, chỉ không set workspaceRole
        req.workspaceRole = null;
        req.workspaceId = null;
        req.workspaceMember = null;
        next();
    }
};

/**
 * Lấy role hiện tại, ưu tiên workspace role nếu có
 */
const getCurrentRole = (req) => {
    return req.workspaceRole || req.user?.role || null;
};

/**
 * Kiểm tra user có phải thành viên của workspace không
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

