const db = require('../../config/db');
const User = require('../../models/userModel/User');
const Workspace = require('../../models/workspaceModel/Workspace');
const Project = require('../../models/projectModel/Project');


// Lấy thống kê tổng quan dashboard
const getDashboardStats = async (req, res, next) => {
    try {
        const [userCount] = await db.execute('SELECT COUNT(*) as count FROM users');
        const [workspaceCount] = await db.execute('SELECT COUNT(*) as count FROM workspaces');
        const [projectCount] = await db.execute('SELECT COUNT(*) as count FROM prj');
        const [taskCount] = await db.execute('SELECT COUNT(*) as count FROM tasks');

        // Người dùng theo vai trò
        const [usersByRole] = await db.execute(`
            SELECT role, COUNT(*) as count 
            FROM users 
            GROUP BY role
        `);

        // Dự án theo trạng thái
        const [projectsByStatus] = await db.execute(`
            SELECT status, COUNT(*) as count 
            FROM prj 
            GROUP BY status
        `);

        // Công việc theo trạng thái
        const [tasksByStatus] = await db.execute(`
            SELECT status, COUNT(*) as count 
            FROM tasks 
            GROUP BY status
        `);

        // Hoạt động gần đây (10 hoạt động mới nhất)
        const [recentActivities] = await db.execute(`
            SELECT l.*, u.username, u.email
            FROM logs l
            LEFT JOIN users u ON l.user_id = u.id
            ORDER BY l.created_at DESC
            LIMIT 10
        `);

        // Tăng trưởng người dùng (6 tháng gần nhất)
        const [userGrowth] = await db.execute(`
            SELECT 
                DATE_FORMAT(created_at, '%Y-%m') as month,
                COUNT(*) as count
            FROM users
            WHERE created_at >= DATE_SUB(NOW(), INTERVAL 6 MONTH)
            GROUP BY DATE_FORMAT(created_at, '%Y-%m')
            ORDER BY month ASC
        `);

        // Người dùng hoạt động nhiều nhất (theo số lượng công việc được giao)
        const [topUsers] = await db.execute(`
            SELECT 
                u.id,
                u.username,
                u.email,
                COUNT(DISTINCT ta.task_id) as assigned_tasks,
                COUNT(DISTINCT pm.project_id) as projects_count
            FROM users u
            LEFT JOIN tsk_asg ta ON u.id = ta.user_id
            LEFT JOIN prj_mb pm ON u.id = pm.user_id
            GROUP BY u.id, u.username, u.email
            ORDER BY assigned_tasks DESC
            LIMIT 5
        `);

        res.json({
            success: true,
            data: {
                summary,
                totals: {
                    users: userCount[0].count,
                    workspaces: workspaceCount[0].count,
                    projects: projectCount[0].count,
                    tasks: taskCount[0].count
                },
                usersByRole,
                projectsByStatus,
                tasksByStatus,
                recentActivities,
                userGrowth,
                topUsers
            }
        });
    } catch (error) {
        next(error);
    }
};

// Lấy tất cả người dùng với thông tin chi tiết
const getAllUsers = async (req, res, next) => {
    try {
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 20;
        const search = req.query.search || '';
        const role = req.query.role || '';
        const offset = (page - 1) * limit;

        let whereClause = 'WHERE 1=1';
        const params = [];

        if (search) {
            whereClause += ' AND (username LIKE ? OR email LIKE ?)';
            params.push(`%${search}%`, `%${search}%`);
        }

        if (role) {
            whereClause += ' AND role = ?';
            params.push(role);
        }

        // Lấy tổng số lượng
        const [countResult] = await db.execute(
            `SELECT COUNT(*) as total FROM users ${whereClause}`,
            params
        );

        // Lấy danh sách người dùng kèm số liệu thống kê
        const [users] = await db.execute(`
            SELECT 
                u.*,
                COUNT(DISTINCT wm.workspace_id) as workspaces_count,
                COUNT(DISTINCT pm.project_id) as projects_count,
                COUNT(DISTINCT ta.task_id) as tasks_count
            FROM users u
            LEFT JOIN workspace_members wm ON u.id = wm.user_id
            LEFT JOIN prj_mb pm ON u.id = pm.user_id
            LEFT JOIN tsk_asg ta ON u.id = ta.user_id
            ${whereClause}
            GROUP BY u.id
            ORDER BY u.created_at DESC
            LIMIT ${limit} OFFSET ${offset}
        `, params);

        res.json({
            success: true,
            data: {
                users: users.map(user => ({
                    ...new User(user).toJSON(),
                    statistics: {
                        workspaces: user.workspaces_count,
                        projects: user.projects_count,
                        tasks: user.tasks_count
                    }
                })),
                pagination: {
                    total: countResult[0].total,
                    page: page,
                    limit: limit,
                    totalPages: Math.ceil(countResult[0].total / limit)
                }
            }
        });
    } catch (error) {
        next(error);
    }
};

// Lấy chi tiết người dùng
const getUserDetail = async (req, res, next) => {
    try {
        const userId = req.params.id;

        const user = await User.findById(userId);
        if (!user) {
            return res.status(404).json({
                success: false,
                message: 'Không tìm thấy người dùng'
            });
        }

        const [workspaces] = await db.execute(`
            SELECT w.*, wm.role, wm.joined_at
            FROM workspaces w
            INNER JOIN workspace_members wm ON w.id = wm.workspace_id
            WHERE wm.user_id = ?
            ORDER BY wm.joined_at DESC
        `, [userId]);

        const [projects] = await db.execute(`
            SELECT p.*, pm.role, pm.joined_at
            FROM prj p
            INNER JOIN prj_mb pm ON p.id = pm.project_id
            WHERE pm.user_id = ?
            ORDER BY pm.joined_at DESC
        `, [userId]);

        const [tasks] = await db.execute(`
            SELECT t.*, ta.assigned_at
            FROM tasks t
            INNER JOIN tsk_asg ta ON t.id = ta.task_id
            WHERE ta.user_id = ?
            ORDER BY ta.assigned_at DESC
        `, [userId]);

        const [activities] = await db.execute(`
            SELECT * FROM logs
            WHERE user_id = ?
            ORDER BY created_at DESC
            LIMIT 20
        `, [userId]);

        res.json({
            success: true,
            data: {
                user: user.toJSON(),
                workspaces,
                projects,
                tasks,
                activities,
                statistics: {
                    totalWorkspaces: workspaces.length,
                    totalProjects: projects.length,
                    totalTasks: tasks.length,
                    totalActivities: activities.length
                }
            }
        });
    } catch (error) {
        next(error);
    }
};

// Cập nhật vai trò người dùng
const updateUserRole = async (req, res, next) => {
    try {
        const userId = req.params.id;
        const { role } = req.body;

        if (!role || !['user', 'admin'].includes(role)) {
            return res.status(400).json({
                success: false,
                message: 'Role không hợp lệ. Chỉ chấp nhận: user, admin'
            });
        }

        const user = await User.findById(userId);
        if (!user) {
            return res.status(404).json({
                success: false,
                message: 'Không tìm thấy người dùng'
            });
        }

        if (parseInt(userId) === req.user.id && role !== 'admin') {
            return res.status(400).json({
                success: false,
                message: 'Không thể hạ cấp quyền của chính mình'
            });
        }

        await user.update({ role });

        res.json({
            success: true,
            message: 'Đã cập nhật role thành công',
            data: user.toJSON()
        });
    } catch (error) {
        next(error);
    }
};

// Khóa/mở khóa người dùng
const toggleUserStatus = async (req, res, next) => {
    try {
        const userId = req.params.id;
        const { is_blocked } = req.body;

        if (typeof is_blocked !== 'boolean') {
            return res.status(400).json({
                success: false,
                message: 'is_blocked phải là boolean'
            });
        }

        const user = await User.findById(userId);
        if (!user) {
            return res.status(404).json({
                success: false,
                message: 'Không tìm thấy người dùng'
            });
        }

        if (parseInt(userId) === req.user.id) {
            return res.status(400).json({
                success: false,
                message: 'Không thể khóa tài khoản của chính mình'
            });
        }

        await db.execute(
            'UPDATE users SET role = ? WHERE id = ?',
            [is_blocked ? 'blocked' : user.role, userId]
        );

        res.json({
            success: true,
            message: is_blocked ? 'Đã khóa người dùng' : 'Đã mở khóa người dùng'
        });
    } catch (error) {
        next(error);
    }
};

// Xóa người dùng
const deleteUser = async (req, res, next) => {
    try {
        const userId = req.params.id;

        const user = await User.findById(userId);
        if (!user) {
            return res.status(404).json({
                success: false,
                message: 'Không tìm thấy người dùng'
            });
        }

        if (parseInt(userId) === req.user.id) {
            return res.status(400).json({
                success: false,
                message: 'Không thể xóa tài khoản của chính mình'
            });
        }

        await user.delete();

        res.json({
            success: true,
            message: 'Đã xóa người dùng thành công'
        });
    } catch (error) {
        next(error);
    }
};

// Lấy tất cả workspace
const getAllWorkspaces = async (req, res, next) => {
    try {
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 20;
        const search = req.query.search || '';
        const offset = (page - 1) * limit;

        let whereClause = 'WHERE 1=1';
        const params = [];

        if (search) {
            whereClause += ' AND w.name LIKE ?';
            params.push(`%${search}%`);
        }

        const [countResult] = await db.execute(
            `SELECT COUNT(*) as total FROM workspaces w ${whereClause}`,
            params
        );

        const [workspaces] = await db.execute(`
            SELECT 
                w.*,
                u.username as owner_name,
                u.email as owner_email,
                COUNT(DISTINCT wm.user_id) as members_count,
                COUNT(DISTINCT p.id) as projects_count
            FROM workspaces w
            LEFT JOIN users u ON w.owner_id = u.id
            LEFT JOIN workspace_members wm ON w.id = wm.workspace_id
            LEFT JOIN prj p ON w.id = p.workspace_id
            ${whereClause}
            GROUP BY w.id
            ORDER BY w.created_at DESC
            LIMIT ${limit} OFFSET ${offset}
        `, params);

        res.json({
            success: true,
            data: {
                workspaces,
                pagination: {
                    total: countResult[0].total,
                    page: page,
                    limit: limit,
                    totalPages: Math.ceil(countResult[0].total / limit)
                }
            }
        });
    } catch (error) {
        next(error);
    }
};

// Lấy chi tiết workspace
const getWorkspaceDetail = async (req, res, next) => {
    try {
        const workspaceId = req.params.id;

        const workspace = await Workspace.findById(workspaceId);
        if (!workspace) {
            return res.status(404).json({
                success: false,
                message: 'Không tìm thấy workspace'
            });
        }

        const owner = await User.findById(workspace.owner_id);

        const [members] = await db.execute(`
            SELECT u.*, wm.role, wm.joined_at
            FROM users u
            INNER JOIN workspace_members wm ON u.id = wm.user_id
            WHERE wm.workspace_id = ?
            ORDER BY wm.joined_at ASC
        `, [workspaceId]);

        // Lấy danh sách dự án thuộc workspace
        const [projects] = await db.execute(`
            SELECT * FROM prj
            WHERE workspace_id = ?
            ORDER BY created_at DESC
        `, [workspaceId]);

        res.json({
            success: true,
            data: {
                workspace,
                owner: owner ? owner.toJSON() : null,
                members: members.map(m => ({
                    ...new User(m).toJSON(),
                    workspace_role: m.role,
                    joined_at: m.joined_at
                })),
                projects,
                statistics: {
                    totalMembers: members.length,
                    totalProjects: projects.length
                }
            }
        });
    } catch (error) {
        next(error);
    }
};

// Xóa workspace
const deleteWorkspace = async (req, res, next) => {
    try {
        const workspaceId = req.params.id;

        const workspace = await Workspace.findById(workspaceId);
        if (!workspace) {
            return res.status(404).json({
                success: false,
                message: 'Không tìm thấy workspace'
            });
        }

        await db.execute('DELETE FROM workspaces WHERE id = ?', [workspaceId]);

        res.json({
            success: true,
            message: 'Đã xóa workspace thành công'
        });
    } catch (error) {
        next(error);
    }
};

// ========== NHẬT KÝ HOẠT ĐỘNG ==========

// Lấy nhật ký hoạt động
const getActivityLogs = async (req, res, next) => {
    try {
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 50;
        const user_id = req.query.user_id || '';
        const action = req.query.action || '';
        const target_table = req.query.target_table || '';
        const start_date = req.query.start_date || '';
        const end_date = req.query.end_date || '';
        const offset = (page - 1) * limit;

        let whereClause = 'WHERE 1=1';
        const params = [];

        if (user_id) {
            whereClause += ' AND l.user_id = ?';
            params.push(user_id);
        }

        if (action) {
            whereClause += ' AND l.action LIKE ?';
            params.push(`%${action}%`);
        }

        if (target_table) {
            whereClause += ' AND l.target_table = ?';
            params.push(target_table);
        }

        if (start_date) {
            whereClause += ' AND l.created_at >= ?';
            params.push(start_date);
        }

        if (end_date) {
            whereClause += ' AND l.created_at <= ?';
            params.push(end_date);
        }

        // Lấy tổng số dòng
        const [countResult] = await db.execute(
            `SELECT COUNT(*) as total FROM logs l ${whereClause}`,
            params
        );

        // Lấy danh sách log
        const [logs] = await db.execute(`
            SELECT 
                l.*,
                u.username,
                u.email
            FROM logs l
            LEFT JOIN users u ON l.user_id = u.id
            ${whereClause}
            ORDER BY l.created_at DESC
            LIMIT ${limit} OFFSET ${offset}
        `, params);

        res.json({
            success: true,
            data: {
                logs,
                pagination: {
                    total: countResult[0].total,
                    page: page,
                    limit: limit,
                    totalPages: Math.ceil(countResult[0].total / limit)
                }
            }
        });
    } catch (error) {
        next(error);
    }
};

// Lấy thống kê hoạt động
const getActivityStats = async (req, res, next) => {
    try {
        // Hành động theo loại
        const [actionsByType] = await db.execute(`
            SELECT action, COUNT(*) as count
            FROM logs
            GROUP BY action
            ORDER BY count DESC
        `);

        // Hoạt động theo bảng dữ liệu
        const [activitiesByTable] = await db.execute(`
            SELECT target_table, COUNT(*) as count
            FROM logs
            GROUP BY target_table
            ORDER BY count DESC
        `);

        // Người dùng hoạt động nhiều nhất
        const [topActiveUsers] = await db.execute(`
            SELECT 
                u.id,
                u.username,
                u.email,
                COUNT(*) as activity_count
            FROM logs l
            INNER JOIN users u ON l.user_id = u.id
            GROUP BY u.id
            ORDER BY activity_count DESC
            LIMIT 10
        `);
        
        const [timeline] = await db.execute(`
            SELECT 
                DATE(created_at) as date,
                COUNT(*) as count
            FROM logs
            WHERE created_at >= DATE_SUB(NOW(), INTERVAL 30 DAY)
            GROUP BY DATE(created_at)
            ORDER BY date ASC
        `);

        res.json({
            success: true,
            data: {
                actionsByType,
                activitiesByTable,
                topActiveUsers,
                timeline
            }
        });
    } catch (error) {
        next(error);
    }
};

// Lấy thông tin hệ thống
const getSystemInfo = async (req, res, next) => {
    try {
        const [dbInfo] = await db.execute('SELECT VERSION() as version');

        const [tableSizes] = await db.execute(`
            SELECT 
                table_name,
                table_rows,
                ROUND(((data_length + index_length) / 1024 / 1024), 2) AS size_mb
            FROM information_schema.TABLES
            WHERE table_schema = DATABASE()
            ORDER BY (data_length + index_length) DESC
        `);

        res.json({
            success: true,
            data: {
                environment: process.env.NODE_ENV || 'development',
                nodeVersion: process.version,
                databaseVersion: dbInfo[0].version,
                tableSizes,
                uptime: process.uptime()
            }
        });
    } catch (error) {
        next(error);
    }
};

module.exports = {
    getDashboardStats,
    getAllUsers,
    getUserDetail,
    updateUserRole,
    toggleUserStatus,
    deleteUser,
    getAllWorkspaces,
    getWorkspaceDetail,
    deleteWorkspace,
    getActivityLogs,
    getActivityStats,
    getSystemInfo
};
