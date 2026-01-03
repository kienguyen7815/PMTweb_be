const Task = require('../../models/taskModel/Task');
const Notification = require('../../models/notificationModel/Notification');
const Project = require('../../models/projectModel/Project');
const db = require('../../config/db');

const DEFAULT_STATUS = 'In Progress';

const normalizeProgress = (value) => {
    if (value === undefined || value === null || value === '') return 0;
    const parsed = Number(value);
    if (!Number.isFinite(parsed)) return 0;
    return Math.max(0, Math.min(100, parsed));
};

// Chuẩn hóa trạng thái dựa vào các giá trị hợp lệ trong DB
const normalizeStatus = async (status) => {
    if (!status) return DEFAULT_STATUS;
    const statuses = await Task.getStatusOptions();
    if (!statuses.length) return status;
    return statuses.includes(status) ? status : DEFAULT_STATUS;
};

// Lấy danh sách task theo project
const listByProject = async (req, res, next) => {
    try {
        const { projectId } = req.params;
        
        // Kiểm tra project có tồn tại và user có quyền truy cập không
        const project = await Project.findById(projectId);
        if (!project) {
            return res.status(404).json({ success: false, message: 'Không tìm thấy dự án' });
        }
        
        // Nếu project có workspace_id và user đang ở workspace context
        if (project.workspace_id && req.workspaceId) {
            if (project.workspace_id !== req.workspaceId) {
                return res.status(403).json({
                    success: false,
                    message: 'Bạn không có quyền xem tasks của dự án này'
                });
            }
        }
        
        const tasks = await Task.findAllByProject(projectId);
        res.json({ success: true, data: tasks });
    } catch (err) {
        next(err);
    }
};

// Tạo task mới
const create = async (req, res, next) => {
    try {
        const { project_id, name, description, status, progress, due_date } = req.body;
        if (!project_id || !name) return res.status(400).json({ success: false, message: 'project_id và name là bắt buộc' });
        
        // Kiểm tra project có tồn tại và user có quyền truy cập không
        const project = await Project.findById(project_id);
        if (!project) {
            return res.status(404).json({ success: false, message: 'Không tìm thấy dự án' });
        }
        
        // Nếu project có workspace_id và user đang ở workspace context
        if (project.workspace_id && req.workspaceId) {
            if (project.workspace_id !== req.workspaceId) {
                return res.status(403).json({
                    success: false,
                    message: 'Bạn không có quyền tạo task trong dự án này'
                });
            }
        }
        
        const normalizedProgress = normalizeProgress(progress);
        const normalizedStatus = await normalizeStatus(status);
        const task = await Task.create({ project_id, name, description, status: normalizedStatus, progress: normalizedProgress, due_date });
        
        // Tạo thông báo cho tất cả thành viên của project (trừ người tạo task)
        try {
            // Lấy thông tin project
            const project = await Project.findById(project_id);
            if (!project) {
                throw new Error('Project not found');
            }
            
            // Lấy danh sách thành viên của project
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
            
            // Đẩy thông báo hàng loạt
            if (notifications.length > 0) {
                await Notification.createMultiple(notifications);
            }
        } catch (notifError) {
            // Ghi log lỗi nhưng không làm thất bại request tạo task
            if (process.env.NODE_ENV === 'development') {
                console.error('Lỗi khi tạo notification cho task:', notifError);
            }
        }
        
        res.status(201).json({ success: true, data: task });
    } catch (err) {
        next(err);
    }
};

// Lấy task theo ID
const getById = async (req, res, next) => {
    try {
        const task = await Task.findById(req.params.id);
        if (!task) return res.status(404).json({ success: false, message: 'Không tìm thấy task' });
        
        // Kiểm tra workspace nếu có
        const project = await Project.findById(task.project_id);
        if (project && project.workspace_id && req.workspaceId) {
            if (project.workspace_id !== req.workspaceId) {
                return res.status(403).json({
                    success: false,
                    message: 'Bạn không có quyền xem task này'
                });
            }
        }
        
        res.json({ success: true, data: task });
    } catch (err) {
        next(err);
    }
};

// Cập nhật thông tin task (chung)
const update = async (req, res, next) => {
    try {
        const task = await Task.findById(req.params.id);
        if (!task) return res.status(404).json({ success: false, message: 'Không tìm thấy task' });
        
        // Kiểm tra workspace nếu có
        const project = await Project.findById(task.project_id);
        if (project && project.workspace_id && req.workspaceId) {
            if (project.workspace_id !== req.workspaceId) {
                return res.status(403).json({
                    success: false,
                    message: 'Bạn không có quyền chỉnh sửa task này'
                });
            }
        }
        
        await task.update(req.body || {});
        res.json({ success: true, data: task });
    } catch (err) {
        next(err);
    }
};

// Lấy danh sách trạng thái hợp lệ của task
const getStatuses = async (req, res, next) => {
    try {
        const statuses = await Task.getStatusOptions();
        res.json({ success: true, data: statuses });
    } catch (err) {
        next(err);
    }
};

// Chỉ cập nhật tiến độ task
const updateProgress = async (req, res, next) => {
    try {
        const { progress } = req.body;
        const userId = req.user.id;
        const currentRole = req.workspaceRole || req.user.role;
        
        if (progress === undefined || progress === null) {
            return res.status(400).json({ success: false, message: 'progress là bắt buộc' });
        }
        if (typeof progress !== 'number' || progress < 0 || progress > 100) {
            return res.status(400).json({ success: false, message: 'progress phải là số từ 0 đến 100' });
        }
        
        const task = await Task.findById(req.params.id);
        if (!task) return res.status(404).json({ success: false, message: 'Không tìm thấy task' });
        
        // Lấy project để kiểm tra workspace
        const project = await Project.findById(task.project_id);
        if (project && project.workspace_id && req.workspaceId) {
            if (project.workspace_id !== req.workspaceId) {
                return res.status(403).json({
                    success: false,
                    message: 'Bạn không có quyền chỉnh sửa task này'
                });
            }
        }
        
        if (currentRole !== 'ad' && currentRole !== 'pm') {
            // Kiểm tra user có được giao task này không
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
        
        // Chỉ cập nhật progress
        await task.update({ progress });
        const updatedTask = await Task.findById(req.params.id);
        res.json({ success: true, data: updatedTask });
    } catch (err) {
        next(err);
    }
};

// Cập nhật trạng thái task với quyền kiểm tra như updateProgress
const updateStatus = async (req, res, next) => {
    try {
        const { status } = req.body;
        const userId = req.user.id;
        const currentRole = req.workspaceRole || req.user.role;

        if (!status || typeof status !== 'string') {
            return res.status(400).json({ success: false, message: 'status là bắt buộc' });
        }

        const task = await Task.findById(req.params.id);
        if (!task) {
            return res.status(404).json({ success: false, message: 'Không tìm thấy task' });
        }

        // Lấy project để kiểm tra workspace
        const project = await Project.findById(task.project_id);
        if (project && project.workspace_id && req.workspaceId) {
            if (project.workspace_id !== req.workspaceId) {
                return res.status(403).json({
                    success: false,
                    message: 'Bạn không có quyền cập nhật task này'
                });
            }
        }

        if (currentRole !== 'ad' && currentRole !== 'pm') {
            // Kiểm tra user có được giao task không
            const [assignments] = await db.execute(
                'SELECT * FROM tsk_asg WHERE task_id = ? AND user_id = ?',
                [task.id, userId]
            );

            if (assignments.length === 0) {
                return res.status(403).json({
                    success: false,
                    message: 'Bạn chỉ có thể cập nhật trạng thái của task được giao cho bạn'
                });
            }
        }

        // Chuẩn hóa status theo enum trong DB
        const normalizedStatus = await normalizeStatus(status);
        await task.update({ status: normalizedStatus });
        const updatedTask = await Task.findById(req.params.id);

        res.json({ success: true, data: updatedTask });
    } catch (err) {
        next(err);
    }
};

// Xóa task
const remove = async (req, res, next) => {
    try {
        const task = await Task.findById(req.params.id);
        if (!task) return res.status(404).json({ success: false, message: 'Không tìm thấy task' });
        
        // Kiểm tra workspace nếu có
        const project = await Project.findById(task.project_id);
        if (project && project.workspace_id && req.workspaceId) {
            if (project.workspace_id !== req.workspaceId) {
                return res.status(403).json({
                    success: false,
                    message: 'Bạn không có quyền xóa task này'
                });
            }
        }
        
        await task.delete();
        res.json({ success: true, message: 'Đã xóa task' });
    } catch (err) {
        next(err);
    }
};

module.exports = { listByProject, create, getById, update, updateProgress, updateStatus, remove, getStatuses };


