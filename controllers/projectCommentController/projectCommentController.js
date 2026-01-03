const ProjectComment = require('../../models/projectCommentModel/ProjectComment');

// Lấy danh sách bình luận của một dự án
const getProjectComments = async (req, res, next) => {
    try {
        const { projectId } = req.params;
        const comments = await ProjectComment.findByProjectId(projectId);
        res.json({ success: true, data: comments });
    } catch (err) {
        next(err);
    }
};

// Tạo bình luận cho dự án
const createComment = async (req, res, next) => {
    try {
        const { project_id, comment } = req.body;
        const user_id = req.user.id;

        if (!project_id || !comment || !comment.trim()) {
            return res.status(400).json({ 
                success: false, 
                message: 'project_id và comment là bắt buộc' 
            });
        }

        const newComment = await ProjectComment.create({ project_id, user_id, comment });
        const fullComment = await ProjectComment.findById(newComment.id);
        
        res.status(201).json({ success: true, data: fullComment });
    } catch (err) {
        next(err);
    }
};

// Cập nhật bình luận dự án
const updateComment = async (req, res, next) => {
    try {
        const { id } = req.params;
        const { comment } = req.body;
        const user_id = req.user.id;

        const commentObj = await ProjectComment.findById(id);
        if (!commentObj) {
            return res.status(404).json({ success: false, message: 'Không tìm thấy comment' });
        }

        const currentRole = req.workspaceRole || req.user.role;
        const isAdmin = !req.workspaceRole && req.user.role === 'ad';
        if (commentObj.user_id !== user_id && !isAdmin) {
            return res.status(403).json({ success: false, message: 'Không có quyền chỉnh sửa comment này' });
        }

        await commentObj.update({ comment });
        const updated = await ProjectComment.findById(id);
        
        res.json({ success: true, data: updated });
    } catch (err) {
        next(err);
    }
};

// Xóa bình luận dự án
const deleteComment = async (req, res, next) => {
    try {
        const { id } = req.params;
        const user_id = req.user.id;

        const commentObj = await ProjectComment.findById(id);
        if (!commentObj) {
            return res.status(404).json({ success: false, message: 'Không tìm thấy comment' });
        }

        const currentRole = req.workspaceRole || req.user.role;
        const isAdmin = !req.workspaceRole && req.user.role === 'ad';
        if (commentObj.user_id !== user_id && !isAdmin) {
            return res.status(403).json({ success: false, message: 'Không có quyền xóa comment này' });
        }

        await commentObj.delete();
        res.json({ success: true, message: 'Đã xóa comment' });
    } catch (err) {
        next(err);
    }
};

module.exports = {
    getProjectComments,
    createComment,
    updateComment,
    deleteComment
};

