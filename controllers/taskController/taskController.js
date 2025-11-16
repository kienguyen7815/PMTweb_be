const Task = require('../../models/taskModel/Task');
const Notification = require('../../models/notificationModel/Notification');
const Project = require('../../models/projectModel/Project');
const db = require('../../config/db');

const listByProject = async (req, res, next) => {
    try {
        const { projectId } = req.params;
        const tasks = await Task.findAllByProject(projectId);
        res.json({ success: true, data: tasks });
    } catch (err) {
        next(err);
    }
};

const create = async (req, res, next) => {
    try {
        const { project_id, name, description, status, progress, due_date } = req.body;
        if (!project_id || !name) return res.status(400).json({ success: false, message: 'project_id và name là bắt buộc' });
        const task = await Task.create({ project_id, name, description, status, progress, due_date });
        
        // Tạo thông báo cho tất cả members của project (trừ người tạo task)
        try {
            // Lấy thông tin project
            const project = await Project.findById(project_id);
            if (!project) {
                throw new Error('Project not found');
            }
            
            // Lấy danh sách members của project
            const [membersList] = await db.execute(`
                SELECT pm.user_id, u.username
                FROM prj_mb pm
                JOIN users u ON pm.user_id = u.id
                WHERE pm.project_id = ?
            `, [project_id]);
            
            // Thêm owner vào danh sách nếu có
            if (project.owner_id) {
                const [ownerRows] = await db.execute(
                    'SELECT id as user_id, username FROM users WHERE id = ?',
                    [project.owner_id]
                );
                if (ownerRows.length > 0) {
                    const ownerInList = membersList.find(m => m.user_id === project.owner_id);
                    if (!ownerInList) {
                        membersList.push(ownerRows[0]);
                    }
                }
            }
            
            const notifications = [];
            const creatorId = req.user?.id;
            
            for (const member of membersList) {
                // Bỏ qua người tạo task
                if (member.user_id !== creatorId) {
                    notifications.push({
                        user_id: member.user_id,
                        message: `Công việc mới "${task.name}" đã được thêm vào dự án "${project.name}".`
                    });
                }
            }
            
            // Tạo notifications hàng loạt
            if (notifications.length > 0) {
                await Notification.createMultiple(notifications);
            }
        } catch (notifError) {
            // Log error nhưng không làm fail request
            if (process.env.NODE_ENV === 'development') {
                console.error('Error creating notifications for task:', notifError);
            }
        }
        
        res.status(201).json({ success: true, data: task });
    } catch (err) {
        next(err);
    }
};

const getById = async (req, res, next) => {
    try {
        const task = await Task.findById(req.params.id);
        if (!task) return res.status(404).json({ success: false, message: 'Không tìm thấy task' });
        res.json({ success: true, data: task });
    } catch (err) {
        next(err);
    }
};

const update = async (req, res, next) => {
    try {
        const task = await Task.findById(req.params.id);
        if (!task) return res.status(404).json({ success: false, message: 'Không tìm thấy task' });
        await task.update(req.body || {});
        res.json({ success: true, data: task });
    } catch (err) {
        next(err);
    }
};

const updateProgress = async (req, res, next) => {
    try {
        const { progress } = req.body;
        const userId = req.user.id;
        const userRole = req.user.role;
        
        if (progress === undefined || progress === null) {
            return res.status(400).json({ success: false, message: 'progress là bắt buộc' });
        }
        if (typeof progress !== 'number' || progress < 0 || progress > 100) {
            return res.status(400).json({ success: false, message: 'progress phải là số từ 0 đến 100' });
        }
        
        const task = await Task.findById(req.params.id);
        if (!task) return res.status(404).json({ success: false, message: 'Không tìm thấy task' });
        
        // Check permission: Admin và PM có thể sửa progress của mọi task
        // TL, MB chỉ có thể sửa progress của task được assign cho họ
        if (userRole !== 'ad' && userRole !== 'pm') {
            // Check if user is assigned to this task
            const [assignments] = await db.execute(
                'SELECT * FROM tsk_asg WHERE task_id = ? AND user_id = ?',
                [task.id, userId]
            );
            
            if (assignments.length === 0) {
                return res.status(403).json({ 
                    success: false, 
                    message: 'Bạn chỉ có thể chỉnh sửa tiến độ của task được giao cho bạn' 
                });
            }
        }
        
        // Chỉ update progress
        await task.update({ progress });
        const updatedTask = await Task.findById(req.params.id);
        res.json({ success: true, data: updatedTask });
    } catch (err) {
        next(err);
    }
};

const remove = async (req, res, next) => {
    try {
        const task = await Task.findById(req.params.id);
        if (!task) return res.status(404).json({ success: false, message: 'Không tìm thấy task' });
        await task.delete();
        res.json({ success: true, message: 'Đã xóa task' });
    } catch (err) {
        next(err);
    }
};

module.exports = { listByProject, create, getById, update, updateProgress, remove };


