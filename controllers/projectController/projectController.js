const Project = require('../../models/projectModel/Project');
const db = require('../../config/db');

const getAll = async (req, res, next) => {
    try {
        // Kiểm tra và cập nhật các dự án đã hết hạn trước khi lấy danh sách
        await Project.checkAndUpdateExpiredProjects();

        // Nếu có workspace context, chỉ lấy các dự án trong workspace đó
        const workspaceId = req.workspaceId || null;
        const projects = await Project.findAll(workspaceId);
        res.json({ success: true, data: projects });
    } catch (error) {
        next(error);
    }
};

const getMyProjects = async (req, res, next) => {
    try {
        // Kiểm tra và cập nhật các dự án đã hết hạn trước khi lấy danh sách
        await Project.checkAndUpdateExpiredProjects();

        const userId = req.user.id;
        const currentRole = req.workspaceRole || req.user.role;
        const workspaceId = req.workspaceId;

        let projects;

        if (workspaceId) {
            projects = await Project.findAll(workspaceId);
        } else {

            if (currentRole === 'ad' || currentRole === 'pm') {
                projects = await Project.findAll();
            } else {
                // TL, MB chỉ xem các dự án mà họ được giao
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

        if (project.workspace_id && req.workspaceId) {
            if (project.workspace_id !== req.workspaceId) {
                return res.status(403).json({
                    success: false,
                    message: 'Bạn không có quyền truy cập dự án này'
                });
            }
        }

        // Kiểm tra và cập nhật trạng thái nếu đã vượt quá ngày kết thúc
        await project.checkAndUpdateStatus();

        // Lấy danh sách thành viên của dự án
        const [members] = await db.execute(`
            SELECT pm.id, pm.role, pm.joined_at, u.id as user_id, u.username, u.email
            FROM prj_mb pm
            JOIN users u ON pm.user_id = u.id
            WHERE pm.project_id = ?
            ORDER BY pm.joined_at ASC
        `, [req.params.id]);

        // Thêm thông tin thành viên vào dữ liệu dự án
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
            console.log('Yêu cầu tạo project:', {
                body: req.body,
                user: req.user?.id,
                workspaceId: req.workspaceId,
                contentType: req.get('Content-Type')
            });
        }

        const { name, description, status, start_date, end_date, members = [], workspace_id } = req.body;

        // Kiểm tra backend
        if (!name || !name.trim()) {
            return res.status(400).json({ success: false, message: 'Tên dự án là bắt buộc' });
        }

        // Lấy workspace_id từ request hoặc từ workspace context
        const finalWorkspaceId = workspace_id || req.workspaceId || null;

        // Nếu có context workspace, đảm bảo user là thành viên của workspace
        if (finalWorkspaceId && !req.workspaceMember) {
            return res.status(403).json({
                success: false,
                message: 'Bạn không phải là thành viên của workspace này'
            });
        }

        // Kiểm tra danh sách thành viên
        if (!Array.isArray(members)) {
            return res.status(400).json({ success: false, message: 'Danh sách thành viên không hợp lệ' });
        }

        // Kiểm tra từng thành viên
        for (const member of members) {
            if (!member.user_id || isNaN(parseInt(member.user_id))) {
                return res.status(400).json({ success: false, message: 'ID thành viên không hợp lệ' });
            }
        }

        // Tạo project
        const project = await Project.create({
            name: name.trim(),
            description: description?.trim() || null,
            status: status || 'Not Started',
            start_date: start_date || null,
            end_date: end_date || null,
            owner_id: req.user?.id,
            workspace_id: finalWorkspaceId
        });

        // Thêm thành viên nếu có
        if (Array.isArray(members) && members.length > 0) {
            for (const member of members) {
                const { user_id, role = 'mb' } = member;
                if (user_id && !isNaN(parseInt(user_id))) {
                    try {
                        // Kiểm tra thành viên đã tồn tại chưa
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
                        // Ghi log lỗi nhưng tiếp tục với các thành viên khác
                        if (process.env.NODE_ENV === 'development') {
                            console.error('Lỗi khi thêm thành viên:', err);
                        }
                    }
                }
            }
        }

        // Kiểm tra và cập nhật trạng thái nếu đã vượt quá ngày kết thúc (sau khi tạo)
        await project.checkAndUpdateStatus();

        // Nạp lại project để lấy trạng thái mới nhất nếu đã thay đổi
        const finalProject = await Project.findById(project.id);

        // Lấy project cùng với danh sách thành viên
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
            console.error('Lỗi khi tạo project:', error);
        }
        next(error);
    }
};

const update = async (req, res, next) => {
    try {
        if (process.env.NODE_ENV === 'development') {
            console.log('Yêu cầu cập nhật project:', {
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

        if (project.workspace_id && req.workspaceId) {
            if (project.workspace_id !== req.workspaceId) {
                return res.status(403).json({
                    success: false,
                    message: 'Bạn không có quyền chỉnh sửa dự án này'
                });
            }
        }

        // Kiểm tra backend cho tên dự án
        if (req.body.name !== undefined && (!req.body.name || !req.body.name.trim())) {
            return res.status(400).json({ success: false, message: 'Tên dự án là bắt buộc' });
        }

        // Kiểm tra danh sách thành viên nếu có
        if (req.body.members !== undefined) {
            if (!Array.isArray(req.body.members)) {
                return res.status(400).json({ success: false, message: 'Danh sách thành viên không hợp lệ' });
            }

            // Kiểm tra từng thành viên
            for (const member of req.body.members) {
                if (!member.user_id || isNaN(parseInt(member.user_id))) {
                    return res.status(400).json({ success: false, message: 'ID thành viên không hợp lệ' });
                }
            }
        }

        // Làm sạch dữ liệu trước khi cập nhật
        const updateData = {};
        if (req.body.name !== undefined) updateData.name = req.body.name.trim();
        if (req.body.description !== undefined) updateData.description = req.body.description?.trim() || null;
        if (req.body.status !== undefined) updateData.status = req.body.status;
        if (req.body.workspace_id !== undefined) updateData.workspace_id = req.body.workspace_id;
        if (req.body.start_date !== undefined) updateData.start_date = req.body.start_date;
        if (req.body.end_date !== undefined) updateData.end_date = req.body.end_date;

        await project.update(updateData);

        // Xử lý đồng bộ thành viên nếu có truyền lên
        if (req.body.members !== undefined && Array.isArray(req.body.members)) {
            const projectId = parseInt(req.params.id);
            const newMemberIds = req.body.members
                .map(m => parseInt(m.user_id))
                .filter(id => !isNaN(id));

            // Lấy các thành viên hiện tại
            const [currentMembers] = await db.execute(
                'SELECT user_id FROM prj_mb WHERE project_id = ?',
                [projectId]
            );
            const currentMemberIds = currentMembers.map(m => m.user_id);

            // Tìm thành viên để thêm và để xóa
            const toAdd = newMemberIds.filter(id => !currentMemberIds.includes(id));
            const toRemove = currentMemberIds.filter(id => !newMemberIds.includes(id));

            // Xóa các thành viên không còn trong danh sách mới
            if (toRemove.length > 0) {
                const placeholders = toRemove.map(() => '?').join(',');
                await db.execute(
                    `DELETE FROM prj_mb WHERE project_id = ? AND user_id IN (${placeholders})`,
                    [projectId, ...toRemove]
                );
            }

            // Thêm các thành viên mới
            for (const userId of toAdd) {
                const memberData = req.body.members.find(m => parseInt(m.user_id) === userId);
                const role = memberData?.role || 'mb';

                try {
                    // Kiểm tra thành viên đã tồn tại (kiểm tra lại cho chắc)
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
                        console.error('Lỗi khi thêm thành viên:', err);
                    }
                }
            }

            // Cập nhật role cho các thành viên đã tồn tại nếu có thay đổi
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

        // Lấy dự án và danh sách thành viên sau khi cập nhật
        const [membersList] = await db.execute(`
            SELECT pm.id, pm.role, pm.joined_at, u.id as user_id, u.username, u.email
            FROM prj_mb pm
            JOIN users u ON pm.user_id = u.id
            WHERE pm.project_id = ?
            ORDER BY pm.joined_at ASC
        `, [req.params.id]);

        const updatedProject = await Project.findById(req.params.id);

        // Kiểm tra và cập nhật trạng thái nếu đã vượt quá ngày kết thúc (sau cập nhật)
        await updatedProject.checkAndUpdateStatus();

        // Nạp lại project lấy trạng thái mới nhất nếu thay đổi
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
            console.error('Lỗi khi cập nhật project:', error);
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

// Lấy danh sách thành viên của dự án
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

// Thêm thành viên vào dự án
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

        // Kiểm tra thành viên đã tồn tại trong dự án chưa
        const [existing] = await db.execute(
            'SELECT id FROM prj_mb WHERE project_id = ? AND user_id = ?',
            [projectId, user_id]
        );

        if (existing.length > 0) {
            return res.status(400).json({ success: false, message: 'Thành viên đã tồn tại trong dự án' });
        }

        // Thêm thành viên vào dự án
        await db.execute(
            'INSERT INTO prj_mb (project_id, user_id, role) VALUES (?, ?, ?)',
            [projectId, user_id, role]
        );

        res.json({ success: true, message: 'Đã thêm thành viên vào dự án' });
    } catch (error) {
        next(error);
    }
};

// Xóa thành viên khỏi dự án
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

// Lấy danh sách tất cả người dùng (cho việc chọn thành viên) kèm theo tuỳ chọn tìm kiếm
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
            // Trường hợp không có workspace, chỉ trả về thông tin cơ bản (không có role)
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

        // MySQL không hỗ trợ placeholder cho LIMIT, kiểm tra và dùng trực tiếp limit số nguyên
        const limitNum = parseInt(limit, 10);
        if (isNaN(limitNum) || limitNum < 1) {
            return res.status(400).json({ success: false, message: 'Limit phải là số nguyên dương' });
        }
        sql += ` ORDER BY username ASC LIMIT ${limitNum}`;

        const [rows] = await db.execute(sql, params);
        res.json({ success: true, data: rows });
    } catch (error) {
        next(error);
    }
};

// Lấy trạng thái dự án kèm metadata
const getStatuses = async (req, res, next) => {
    try {
        // Truy vấn CSDL để lấy giá trị ENUM thực tế
        const [rows] = await db.execute(`
            SELECT COLUMN_TYPE 
            FROM INFORMATION_SCHEMA.COLUMNS 
            WHERE TABLE_SCHEMA = DATABASE()
              AND TABLE_NAME = 'prj' 
              AND COLUMN_NAME = 'status'
        `);

        // Phân tích giá trị ENUM từ COLUMN_TYPE
        let statuses = [];
        if (rows.length > 0) {
            const columnType = rows[0].COLUMN_TYPE;
            // Trích xuất giá trị từ ENUM('value1','value2',...)
            const matches = columnType.match(/ENUM\(([^)]+)\)/);
            if (matches) {
                statuses = matches[1]
                    .split(',')
                    .map(s => s.trim().replace(/^'|'$/g, '')); // Xóa dấu nháy đơn
            }
        }

        // Nếu không lấy được trạng thái từ DB, dùng fallback định nghĩa cứng
        if (statuses.length === 0) {
            statuses = ['Not Started', 'In Progress', 'Completed', 'Pending', 'Planned', 'Cancelled', 'Testing', 'In Review', 'Delayed'];
        }

        // Map trạng thái kèm dữ liệu bổ sung (label, icon, class)
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

        // Xây dựng response trả về trạng thái lấy từ DB
        const statusesData = statuses.map(status => ({
            value: status,
            ...(statusMap[status] || {
                label: status,
                icon: 'fa-circle',
                class: status.toLowerCase().replace(/\s+/g, '-')
            })
        }));

        if (process.env.NODE_ENV === 'development') {
            console.log('Trả về danh sách trạng thái:', statusesData);
        }

        res.json({ success: true, data: statusesData });
    } catch (error) {
        if (process.env.NODE_ENV === 'development') {
            console.error('Lỗi khi lấy trạng thái:', error);
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


