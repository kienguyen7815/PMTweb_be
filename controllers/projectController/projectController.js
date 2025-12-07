const Project = require('../../models/projectModel/Project');
const db = require('../../config/db');

const getAll = async (req, res, next) => {
    try {
        // Check and update expired projects before fetching
        await Project.checkAndUpdateExpiredProjects();
        
        // Nếu có workspace context, chỉ lấy projects trong workspace đó
        const workspaceId = req.workspaceId || null;
        const projects = await Project.findAll(workspaceId);
        res.json({ success: true, data: projects });
    } catch (error) {
        next(error);
    }
};

// Get projects for current user (with permission filtering)
const getMyProjects = async (req, res, next) => {
    try {
        // Check and update expired projects before fetching
        await Project.checkAndUpdateExpiredProjects();
        
        const userId = req.user.id;
        const currentRole = req.workspaceRole || req.user.role;
        const workspaceId = req.workspaceId;
        
        let projects;
        
        // Trong workspace context
        if (workspaceId) {
            // Nếu user là member của workspace, cho phép xem tất cả projects trong workspace
            // Điều này cho phép member chat và collaborate trong tất cả projects
            projects = await Project.findAll(workspaceId);
        } else {
            // Global context (không có workspace)
            // PM và Admin có thể xem tất cả projects
            if (currentRole === 'ad' || currentRole === 'pm') {
                projects = await Project.findAll();
            } else {
                // TL, MB chỉ xem projects họ được assign
                const [rows] = await db.execute(`
                    SELECT DISTINCT p.*
                    FROM prj p
                    INNER JOIN prj_mb pm ON p.id = pm.project_id
                    WHERE pm.user_id = ?
                    ORDER BY p.created_at DESC
                `, [userId]);
                projects = rows.map(r => new Project(r));
            }
        }
        
        res.json({ success: true, data: projects });
    } catch (error) {
        next(error);
    }
};

const getById = async (req, res, next) => {
    try {
        const project = await Project.findById(req.params.id);
        if (!project) {
            return res.status(404).json({ success: false, message: 'Không tìm thấy dự án' });
        }
        
        // Nếu project có workspace_id và user đang trong workspace context
        // Kiểm tra xem project có thuộc workspace đó không
        if (project.workspace_id && req.workspaceId) {
            if (project.workspace_id !== req.workspaceId) {
                return res.status(403).json({
                    success: false,
                    message: 'Bạn không có quyền truy cập dự án này'
                });
            }
        }
        
        // Check and update status if end_date has passed
        await project.checkAndUpdateStatus();
        
        // Get members for this project
        const [members] = await db.execute(`
            SELECT pm.id, pm.role, pm.joined_at, u.id as user_id, u.username, u.email
            FROM prj_mb pm
            JOIN users u ON pm.user_id = u.id
            WHERE pm.project_id = ?
            ORDER BY pm.joined_at ASC
        `, [req.params.id]);
        
        // Add members to project data
        const projectData = {
            ...project,
            members: members.map(m => ({
                id: m.id,
                user_id: m.user_id,
                username: m.username,
                email: m.email,
                role: m.role,
                joined_at: m.joined_at
            }))
        };
        
        res.json({ success: true, data: projectData });
    } catch (error) {
        next(error);
    }
};

const create = async (req, res, next) => {
    try {
        if (process.env.NODE_ENV === 'development') {
            console.log('Project create request:', {
                body: req.body,
                user: req.user?.id,
                workspaceId: req.workspaceId,
                contentType: req.get('Content-Type')
            });
        }
        
        const { name, description, status, start_date, end_date, members = [], workspace_id } = req.body;
        
        // Backend validation
        if (!name || !name.trim()) {
            return res.status(400).json({ success: false, message: 'Tên dự án là bắt buộc' });
        }
        
        // Lấy workspace_id từ request hoặc từ workspace context
        const finalWorkspaceId = workspace_id || req.workspaceId || null;
        
        // Nếu có workspace context, đảm bảo user là thành viên của workspace
        if (finalWorkspaceId && !req.workspaceMember) {
            return res.status(403).json({
                success: false,
                message: 'Bạn không phải là thành viên của workspace này'
            });
        }
        
        // Validate members array
        if (!Array.isArray(members)) {
            return res.status(400).json({ success: false, message: 'Danh sách thành viên không hợp lệ' });
        }
        
        // Validate each member
        for (const member of members) {
            if (!member.user_id || isNaN(parseInt(member.user_id))) {
                return res.status(400).json({ success: false, message: 'ID thành viên không hợp lệ' });
            }
        }
        
        // Create project
        const project = await Project.create({ 
            name: name.trim(), 
            description: description?.trim() || null, 
            status: status || 'Not Started', 
            start_date: start_date || null,
            end_date: end_date || null,
            owner_id: req.user?.id,
            workspace_id: finalWorkspaceId
        });
        
        // Add members if provided
        if (Array.isArray(members) && members.length > 0) {
            for (const member of members) {
                const { user_id, role = 'mb' } = member;
                if (user_id && !isNaN(parseInt(user_id))) {
                    try {
                        // Check if member already exists
                        const [existing] = await db.execute(
                            'SELECT id FROM prj_mb WHERE project_id = ? AND user_id = ?',
                            [project.id, user_id]
                        );
                        
                        if (existing.length === 0) {
                            await db.execute(
                                'INSERT INTO prj_mb (project_id, user_id, role) VALUES (?, ?, ?)',
                                [project.id, user_id, role]
                            );
                        }
                    } catch (err) {
                        // Log error but continue with other members
                        if (process.env.NODE_ENV === 'development') {
                            console.error('Error adding member:', err);
                        }
                    }
                }
            }
        }
        
        // Check and update status if end_date has passed (after creation)
        await project.checkAndUpdateStatus();
        
        // Reload project to get updated status if it was changed
        const finalProject = await Project.findById(project.id);
        
        // Get project with members
        const [membersList] = await db.execute(`
            SELECT pm.id, pm.role, pm.joined_at, u.id as user_id, u.username, u.email
            FROM prj_mb pm
            JOIN users u ON pm.user_id = u.id
            WHERE pm.project_id = ?
            ORDER BY pm.joined_at ASC
        `, [project.id]);
        
        const projectData = {
            ...finalProject,
            members: membersList.map(m => ({
                id: m.id,
                user_id: m.user_id,
                username: m.username,
                email: m.email,
                role: m.role,
                joined_at: m.joined_at
            }))
        };
        
        res.status(201).json({ success: true, data: projectData });
    } catch (error) {
        if (process.env.NODE_ENV === 'development') {
            console.error('Error creating project:', error);
        }
        next(error);
    }
};

const update = async (req, res, next) => {
    try {
        if (process.env.NODE_ENV === 'development') {
            console.log('Project update request:', {
                id: req.params.id,
                body: req.body,
                user: req.user?.id,
                workspaceId: req.workspaceId
            });
        }
        
        const project = await Project.findById(req.params.id);
        if (!project) {
            return res.status(404).json({ success: false, message: 'Không tìm thấy dự án' });
        }
        
        // Nếu project có workspace_id và user đang trong workspace context
        // Kiểm tra xem project có thuộc workspace đó không
        if (project.workspace_id && req.workspaceId) {
            if (project.workspace_id !== req.workspaceId) {
                return res.status(403).json({
                    success: false,
                    message: 'Bạn không có quyền chỉnh sửa dự án này'
                });
            }
        }
        
        // Backend validation
        if (req.body.name !== undefined && (!req.body.name || !req.body.name.trim())) {
            return res.status(400).json({ success: false, message: 'Tên dự án là bắt buộc' });
        }
        
        // Validate members array if provided
        if (req.body.members !== undefined) {
            if (!Array.isArray(req.body.members)) {
                return res.status(400).json({ success: false, message: 'Danh sách thành viên không hợp lệ' });
            }
            
            // Validate each member
            for (const member of req.body.members) {
                if (!member.user_id || isNaN(parseInt(member.user_id))) {
                    return res.status(400).json({ success: false, message: 'ID thành viên không hợp lệ' });
                }
            }
        }
        
        // Clean up data before update
        const updateData = {};
        if (req.body.name !== undefined) updateData.name = req.body.name.trim();
        if (req.body.description !== undefined) updateData.description = req.body.description?.trim() || null;
        if (req.body.status !== undefined) updateData.status = req.body.status;
        if (req.body.workspace_id !== undefined) updateData.workspace_id = req.body.workspace_id;
        if (req.body.start_date !== undefined) updateData.start_date = req.body.start_date;
        if (req.body.end_date !== undefined) updateData.end_date = req.body.end_date;
        
        await project.update(updateData);
        
        // Handle members sync if provided
        if (req.body.members !== undefined && Array.isArray(req.body.members)) {
            const projectId = parseInt(req.params.id);
            const newMemberIds = req.body.members
                .map(m => parseInt(m.user_id))
                .filter(id => !isNaN(id));
            
            // Get current members
            const [currentMembers] = await db.execute(
                'SELECT user_id FROM prj_mb WHERE project_id = ?',
                [projectId]
            );
            const currentMemberIds = currentMembers.map(m => m.user_id);
            
            // Find members to add and remove
            const toAdd = newMemberIds.filter(id => !currentMemberIds.includes(id));
            const toRemove = currentMemberIds.filter(id => !newMemberIds.includes(id));
            
            // Remove members
            if (toRemove.length > 0) {
                const placeholders = toRemove.map(() => '?').join(',');
                await db.execute(
                    `DELETE FROM prj_mb WHERE project_id = ? AND user_id IN (${placeholders})`,
                    [projectId, ...toRemove]
                );
            }
            
            // Add new members
            for (const userId of toAdd) {
                const memberData = req.body.members.find(m => parseInt(m.user_id) === userId);
                const role = memberData?.role || 'mb';
                
                try {
                    // Check if member already exists (double check)
                    const [existing] = await db.execute(
                        'SELECT id FROM prj_mb WHERE project_id = ? AND user_id = ?',
                        [projectId, userId]
                    );
                    
                    if (existing.length === 0) {
                        await db.execute(
                            'INSERT INTO prj_mb (project_id, user_id, role) VALUES (?, ?, ?)',
                            [projectId, userId, role]
                        );
                    }
                } catch (err) {
                    if (process.env.NODE_ENV === 'development') {
                        console.error('Error adding member:', err);
                    }
                }
            }
            
            // Update roles for existing members if changed
            for (const member of req.body.members) {
                const userId = parseInt(member.user_id);
                const role = member.role || 'mb';
                
                if (!isNaN(userId) && newMemberIds.includes(userId)) {
                    await db.execute(
                        'UPDATE prj_mb SET role = ? WHERE project_id = ? AND user_id = ?',
                        [role, projectId, userId]
                    );
                }
            }
        }
        
        // Get updated project with members
        const [membersList] = await db.execute(`
            SELECT pm.id, pm.role, pm.joined_at, u.id as user_id, u.username, u.email
            FROM prj_mb pm
            JOIN users u ON pm.user_id = u.id
            WHERE pm.project_id = ?
            ORDER BY pm.joined_at ASC
        `, [req.params.id]);
        
        const updatedProject = await Project.findById(req.params.id);
        
        // Check and update status if end_date has passed (after update)
        await updatedProject.checkAndUpdateStatus();
        
        // Reload project to get updated status if it was changed
        const finalProject = await Project.findById(req.params.id);
        
        const projectData = {
            ...finalProject,
            members: membersList.map(m => ({
                id: m.id,
                user_id: m.user_id,
                username: m.username,
                email: m.email,
                role: m.role,
                joined_at: m.joined_at
            }))
        };
        
        res.json({ success: true, data: projectData });
    } catch (error) {
        if (process.env.NODE_ENV === 'development') {
            console.error('Error updating project:', error);
        }
        next(error);
    }
};

const remove = async (req, res, next) => {
    try {
        const project = await Project.findById(req.params.id);
        if (!project) {
            return res.status(404).json({ success: false, message: 'Không tìm thấy dự án' });
        }
        
        // Nếu project có workspace_id và user đang trong workspace context
        // Kiểm tra xem project có thuộc workspace đó không
        if (project.workspace_id && req.workspaceId) {
            if (project.workspace_id !== req.workspaceId) {
                return res.status(403).json({
                    success: false,
                    message: 'Bạn không có quyền xóa dự án này'
                });
            }
        }
        
        await project.delete();
        res.json({ success: true, message: 'Đã xóa dự án' });
    } catch (error) {
        next(error);
    }
};

// Get project members
const getMembers = async (req, res, next) => {
    try {
        const projectId = req.params.id;
        if (!projectId || isNaN(parseInt(projectId))) {
            return res.status(400).json({ success: false, message: 'ID dự án không hợp lệ' });
        }
        
        const [rows] = await db.execute(`
            SELECT pm.id, pm.role, pm.joined_at, u.id as user_id, u.username, u.email
            FROM prj_mb pm
            JOIN users u ON pm.user_id = u.id
            WHERE pm.project_id = ?
            ORDER BY pm.joined_at ASC
        `, [projectId]);
        
        res.json({ success: true, data: rows });
    } catch (error) {
        next(error);
    }
};

// Add member to project
const addMember = async (req, res, next) => {
    try {
        const projectId = req.params.id;
        const { user_id, role = 'mb' } = req.body;
        
        if (!projectId || isNaN(parseInt(projectId))) {
            return res.status(400).json({ success: false, message: 'ID dự án không hợp lệ' });
        }
        
        if (!user_id || isNaN(parseInt(user_id))) {
            return res.status(400).json({ success: false, message: 'User ID là bắt buộc và phải hợp lệ' });
        }
        
        // Check if member already exists
        const [existing] = await db.execute(
            'SELECT id FROM prj_mb WHERE project_id = ? AND user_id = ?',
            [projectId, user_id]
        );
        
        if (existing.length > 0) {
            return res.status(400).json({ success: false, message: 'Thành viên đã tồn tại trong dự án' });
        }
        
        // Add member
        await db.execute(
            'INSERT INTO prj_mb (project_id, user_id, role) VALUES (?, ?, ?)',
            [projectId, user_id, role]
        );
        
        res.json({ success: true, message: 'Đã thêm thành viên vào dự án' });
    } catch (error) {
        next(error);
    }
};

// Remove member from project
const removeMember = async (req, res, next) => {
    try {
        const { projectId, memberId } = req.params;
        
        if (!projectId || !memberId) {
            return res.status(400).json({ success: false, message: 'ID dự án hoặc ID thành viên không hợp lệ' });
        }
        
        const [result] = await db.execute(
            'DELETE FROM prj_mb WHERE project_id = ? AND id = ?',
            [projectId, memberId]
        );
        
        if (result.affectedRows === 0) {
            return res.status(404).json({ success: false, message: 'Không tìm thấy thành viên trong dự án' });
        }
        
        res.json({ success: true, message: 'Đã xóa thành viên khỏi dự án' });
    } catch (error) {
        next(error);
    }
};

// Get all users (for member selection) with optional search query
const getUsers = async (req, res, next) => {
    try {
        const query = req.query.q || '';
        const limit = parseInt(req.query.limit) || 8;
        const workspaceId = req.workspaceId || null;
        
        let sql;
        const params = [];

        // Nếu có workspace context -> join workspace_members để lấy role trong workspace
        if (workspaceId) {
            sql = `
                SELECT u.id, u.username, u.email, wm.role as workspace_role
                FROM users u
                LEFT JOIN workspace_members wm 
                    ON u.id = wm.user_id AND wm.workspace_id = ?
            `;
            params.push(workspaceId);

            if (query.trim()) {
                sql += ` WHERE (u.username LIKE ? OR u.email LIKE ?)`;
                const searchPattern = `%${query.trim()}%`;
                params.push(searchPattern, searchPattern);
            }
        } else {
            // Global context: không có workspace, chỉ trả basic info, không có role
            sql = `
                SELECT id, username, email
                FROM users
            `;

            if (query.trim()) {
                sql += ` WHERE username LIKE ? OR email LIKE ?`;
                const searchPattern = `%${query.trim()}%`;
                params.push(searchPattern, searchPattern);
            }
        }
        
        // MySQL doesn't support placeholder for LIMIT, validate and use string interpolation
        const limitNum = parseInt(limit, 10);
        if (isNaN(limitNum) || limitNum < 1) {
            return res.status(400).json({ success: false, message: 'Limit must be a positive integer' });
        }
        sql += ` ORDER BY username ASC LIMIT ${limitNum}`;
        
        const [rows] = await db.execute(sql, params);
        res.json({ success: true, data: rows });
    } catch (error) {
        next(error);
    }
};

// Get project statuses with metadata
const getStatuses = async (req, res, next) => {
    try {
        // Query database to get the actual ENUM values
        const [rows] = await db.execute(`
            SELECT COLUMN_TYPE 
            FROM INFORMATION_SCHEMA.COLUMNS 
            WHERE TABLE_SCHEMA = DATABASE()
              AND TABLE_NAME = 'prj' 
              AND COLUMN_NAME = 'status'
        `);
        
        // Parse ENUM values from COLUMN_TYPE
        let statuses = [];
        if (rows.length > 0) {
            const columnType = rows[0].COLUMN_TYPE;
            // Extract values from ENUM('value1','value2',...)
            const matches = columnType.match(/ENUM\(([^)]+)\)/);
            if (matches) {
                statuses = matches[1]
                    .split(',')
                    .map(s => s.trim().replace(/^'|'$/g, '')); // Remove quotes
            }
        }
        
        // If no statuses found from database, use fallback from schema
        if (statuses.length === 0) {
            statuses = ['Not Started', 'In Progress', 'Completed', 'Pending', 'Planned', 'Cancelled', 'Testing', 'In Review', 'Delayed'];
        }
        
        // Map statuses with metadata (label, icon, class)
        const statusMap = {
            'Not Started': { label: 'Chưa bắt đầu', icon: 'fa-clock', class: 'not-started' },
            'In Progress': { label: 'Đang thực hiện', icon: 'fa-spinner fa-spin', class: 'in-progress' },
            'Completed': { label: 'Hoàn thành', icon: 'fa-check-circle', class: 'completed' },
            'Pending': { label: 'Đang chờ', icon: 'fa-hourglass-half', class: 'pending' },
            'Planned': { label: 'Đã lên kế hoạch', icon: 'fa-calendar-check', class: 'planned' },
            'Cancelled': { label: 'Đã hủy', icon: 'fa-times-circle', class: 'cancelled' },
            'Testing': { label: 'Đang kiểm thử', icon: 'fa-flask', class: 'testing' },
            'In Review': { label: 'Đang xem xét', icon: 'fa-eye', class: 'in-review' },
            'Delayed': { label: 'Bị trì hoãn', icon: 'fa-exclamation-triangle', class: 'delayed' },
        };
        
        // Build response with statuses from database
        const statusesData = statuses.map(status => ({
            value: status,
            ...(statusMap[status] || { 
                label: status, 
                icon: 'fa-circle', 
                class: status.toLowerCase().replace(/\s+/g, '-') 
            })
        }));
        
        if (process.env.NODE_ENV === 'development') {
            console.log('Returning statuses:', statusesData);
        }
        
        res.json({ success: true, data: statusesData });
    } catch (error) {
        if (process.env.NODE_ENV === 'development') {
            console.error('Error getting statuses:', error);
        }
        next(error);
    }
};

module.exports = { 
    getAll,
    getMyProjects,
    getById, 
    create, 
    update, 
    remove, 
    getMembers, 
    addMember, 
    removeMember, 
    getUsers,
    getStatuses
};


