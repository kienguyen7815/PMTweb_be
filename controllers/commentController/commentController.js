const Comment = require('../../models/commentModel/Comment');

// Get comments for a task
const getTaskComments = async (req, res, next) => {
    try {
        const { taskId } = req.params;
        const comments = await Comment.findByTaskId(taskId);
        res.json({ success: true, data: comments });
    } catch (err) {
        next(err);
    }
};

// Create a comment
const createComment = async (req, res, next) => {
    try {
        const { task_id, comment } = req.body;
        const user_id = req.user.id;

        if (!task_id || !comment || !comment.trim()) {
            return res.status(400).json({ 
                success: false, 
                message: 'task_id và comment là bắt buộc' 
            });
        }

        const newComment = await Comment.create({ task_id, user_id, comment });
        const fullComment = await Comment.findById(newComment.id);
        
        res.status(201).json({ success: true, data: fullComment });
    } catch (err) {
        next(err);
    }
};

// Update a comment
const updateComment = async (req, res, next) => {
    try {
        const { id } = req.params;
        const { comment } = req.body;
        const user_id = req.user.id;

        const commentObj = await Comment.findById(id);
        if (!commentObj) {
            return res.status(404).json({ success: false, message: 'Không tìm thấy comment' });
        }

        // Only the comment owner can update
        if (commentObj.user_id !== user_id && req.user.role !== 'ad') {
            return res.status(403).json({ success: false, message: 'Không có quyền chỉnh sửa comment này' });
        }

        await commentObj.update({ comment });
        const updated = await Comment.findById(id);
        
        res.json({ success: true, data: updated });
    } catch (err) {
        next(err);
    }
};

// Delete a comment
const deleteComment = async (req, res, next) => {
    try {
        const { id } = req.params;
        const user_id = req.user.id;

        const commentObj = await Comment.findById(id);
        if (!commentObj) {
            return res.status(404).json({ success: false, message: 'Không tìm thấy comment' });
        }

        // Only the comment owner or admin can delete
        if (commentObj.user_id !== user_id && req.user.role !== 'ad') {
            return res.status(403).json({ success: false, message: 'Không có quyền xóa comment này' });
        }

        await commentObj.delete();
        res.json({ success: true, message: 'Đã xóa comment' });
    } catch (err) {
        next(err);
    }
};

module.exports = {
    getTaskComments,
    createComment,
    updateComment,
    deleteComment
};

