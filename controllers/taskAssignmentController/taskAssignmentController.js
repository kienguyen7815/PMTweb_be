const TaskAssignment = require('../../models/taskAssignmentModel/TaskAssignment');

// Get tasks assigned to current user
const getMyTasks = async (req, res, next) => {
    try {
        const userId = req.user.id;
        const tasks = await TaskAssignment.findByUserId(userId);
        res.json({ success: true, data: tasks });
    } catch (err) {
        next(err);
    }
};

// Assign task to user(s)
const assignTask = async (req, res, next) => {
    try {
        const { task_id, user_ids } = req.body;
        if (!task_id || !user_ids || !Array.isArray(user_ids) || user_ids.length === 0) {
            return res.status(400).json({ 
                success: false, 
                message: 'task_id và user_ids (array) là bắt buộc' 
            });
        }

        const assignments = [];
        const errors = [];

        for (const user_id of user_ids) {
            try {
                const assignment = await TaskAssignment.create({ task_id, user_id });
                assignments.push(assignment);
            } catch (err) {
                errors.push({ user_id, error: err.message });
            }
        }

        if (assignments.length === 0) {
            return res.status(400).json({ 
                success: false, 
                message: 'Không thể giao task cho bất kỳ user nào',
                errors 
            });
        }

        res.status(201).json({ 
            success: true, 
            data: assignments,
            errors: errors.length > 0 ? errors : undefined
        });
    } catch (err) {
        next(err);
    }
};

// Get assignments for a task
const getTaskAssignments = async (req, res, next) => {
    try {
        const { taskId } = req.params;
        const assignments = await TaskAssignment.findByTaskId(taskId);
        res.json({ success: true, data: assignments });
    } catch (err) {
        next(err);
    }
};

// Remove assignment
const removeAssignment = async (req, res, next) => {
    try {
        const { id } = req.params;
        const assignment = await TaskAssignment.findById(id);
        if (!assignment) {
            return res.status(404).json({ success: false, message: 'Không tìm thấy assignment' });
        }
        await assignment.delete();
        res.json({ success: true, message: 'Đã xóa assignment' });
    } catch (err) {
        next(err);
    }
};

// Remove assignment by task and user
const removeAssignmentByTaskAndUser = async (req, res, next) => {
    try {
        const { taskId, userId } = req.params;
        await TaskAssignment.deleteByTaskAndUser(taskId, userId);
        res.json({ success: true, message: 'Đã xóa assignment' });
    } catch (err) {
        next(err);
    }
};

module.exports = {
    getMyTasks,
    assignTask,
    getTaskAssignments,
    removeAssignment,
    removeAssignmentByTaskAndUser
};

