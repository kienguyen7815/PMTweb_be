const TaskAssignment = require('../../models/taskAssignmentModel/TaskAssignment');

// Get tasks assigned to current user
const getMyTasks = async (req, res, next) => {
    try {
        const userId = req.user.id;
        const workspaceId = req.workspaceId;
        let tasks;

        // Nếu có workspace context -> chỉ lấy các task thuộc projects trong workspace đó
        if (workspaceId) {
            const db = require('../../config/db');
            const query = `
                SELECT ta.*, 
                       t.id as task_id, t.name as task_name, t.description as task_description,
                       t.status as task_status, t.progress as task_progress,
                       t.due_date as task_due_date, t.project_id, t.created_at as task_created_at,
                       p.name as project_name,
                       u.username as assigned_by_username
                FROM tsk_asg ta
                JOIN tasks t ON ta.task_id = t.id
                JOIN prj p ON t.project_id = p.id
                LEFT JOIN users u ON ta.user_id = u.id
                WHERE ta.user_id = ? AND p.workspace_id = ?
                ORDER BY ta.assigned_at DESC
            `;
            const [rows] = await db.execute(query, [userId, workspaceId]);
            tasks = rows;
        } else {
            // Không có workspace context -> giữ behavior cũ (tất cả task được assign)
            tasks = await TaskAssignment.findByUserId(userId);
        }
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
        
        // Kiểm tra workspace nếu có
        if (req.workspaceId) {
            const db = require('../../config/db');
            const Project = require('../../models/projectModel/Project');
            const Task = require('../../models/taskModel/Task');
            
            // Lấy task để kiểm tra project workspace
            const task = await Task.findById(taskId);
            if (!task) {
                return res.status(404).json({ success: false, message: 'Không tìm thấy task' });
            }
            
            // Lấy project để kiểm tra workspace
            const project = await Project.findById(task.project_id);
            if (project && project.workspace_id) {
                if (project.workspace_id !== req.workspaceId) {
                    return res.status(403).json({
                        success: false,
                        message: 'Bạn không có quyền xem assignments của task này'
                    });
                }
            }
        }
        
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

