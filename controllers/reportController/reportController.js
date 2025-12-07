const db = require('../../config/db');

// Get project statistics
const getProjectStats = async (req, res, next) => {
    try {
        const workspaceId = req.workspaceId;
        let query = `
            SELECT 
                COUNT(*) as total,
                SUM(CASE WHEN status = 'Not Started' THEN 1 ELSE 0 END) as not_started,
                SUM(CASE WHEN status = 'In Progress' THEN 1 ELSE 0 END) as in_progress,
                SUM(CASE WHEN status = 'Completed' THEN 1 ELSE 0 END) as completed
            FROM prj
        `;
        const params = [];

        // Nếu có workspace context -> chỉ thống kê projects trong workspace đó
        if (workspaceId) {
            query += ' WHERE workspace_id = ?';
            params.push(workspaceId);
        }

        const [rows] = await db.execute(query, params);
        res.json({ success: true, data: rows[0] });
    } catch (err) {
        next(err);
    }
};

// Get task statistics
const getTaskStats = async (req, res, next) => {
    try {
        const workspaceId = req.workspaceId;
        
        // First, get all possible task statuses from ENUM
        const [enumRows] = await db.execute(`
            SELECT COLUMN_TYPE 
            FROM information_schema.COLUMNS 
            WHERE TABLE_SCHEMA = ? 
              AND TABLE_NAME = 'tasks' 
              AND COLUMN_NAME = 'status'
        `, [process.env.DB_NAME]);
        
        let statuses = [];
        if (enumRows.length > 0 && enumRows[0].COLUMN_TYPE) {
            const enumMatch = enumRows[0].COLUMN_TYPE.match(/enum\((.*)\)/i);
            if (enumMatch && enumMatch[1]) {
                statuses = enumMatch[1]
                    .split(',')
                    .map(val => val.trim().replace(/^'(.*)'$/, '$1'));
            }
        }
        
        // Build dynamic CASE statements for each status
        const statusCases = statuses.map(status => 
            `SUM(CASE WHEN t.status = '${status}' THEN 1 ELSE 0 END) as \`${status}\``
        ).join(',\n                ');
        
        let query = `
            SELECT 
                COUNT(*) as total,
                ${statusCases},
                AVG(t.progress) as avg_progress
            FROM tasks t
            JOIN prj p ON t.project_id = p.id
        `;
        const params = [];

        // Nếu có workspace context -> chỉ thống kê tasks của projects trong workspace đó
        if (workspaceId) {
            query += ' WHERE p.workspace_id = ?';
            params.push(workspaceId);
        }

        const [rows] = await db.execute(query, params);
        
        // Format response to include status array
        const result = {
            ...rows[0],
            statuses: statuses
        };
        
        res.json({ success: true, data: result });
    } catch (err) {
        next(err);
    }
};

// Get task progress by project
const getTaskProgressByProject = async (req, res, next) => {
    try {
        const workspaceId = req.workspaceId;
        let query = `
            SELECT 
                p.id,
                p.name,
                COUNT(t.id) as total_tasks,
                AVG(t.progress) as avg_progress,
                SUM(CASE WHEN t.status = 'Done' THEN 1 ELSE 0 END) as completed_tasks
            FROM prj p
            LEFT JOIN tasks t ON p.id = t.project_id
        `;
        const params = [];

        if (workspaceId) {
            query += ' WHERE p.workspace_id = ?';
            params.push(workspaceId);
        }

        query += ' GROUP BY p.id, p.name ORDER BY p.name';

        const [rows] = await db.execute(query, params);
        res.json({ success: true, data: rows });
    } catch (err) {
        next(err);
    }
};

// Get tasks by month (for chart)
const getTasksByMonth = async (req, res, next) => {
    try {
        const workspaceId = req.workspaceId;
        let query = `
            SELECT 
                DATE_FORMAT(t.created_at, '%Y-%m') as month,
                COUNT(*) as count
        `;
        const params = [];

        if (workspaceId) {
            query += `
                FROM tasks t
                JOIN prj p ON t.project_id = p.id
                WHERE t.created_at >= DATE_SUB(NOW(), INTERVAL 6 MONTH)
                  AND p.workspace_id = ?
            `;
            params.push(workspaceId);
        } else {
            query += `
                FROM tasks t
                WHERE t.created_at >= DATE_SUB(NOW(), INTERVAL 6 MONTH)
            `;
        }

        query += `
            GROUP BY DATE_FORMAT(t.created_at, '%Y-%m')
            ORDER BY month ASC
        `;

        const [rows] = await db.execute(query, params);
        res.json({ success: true, data: rows });
    } catch (err) {
        next(err);
    }
};

// Get user activity stats
const getUserActivityStats = async (req, res, next) => {
    try {
        const workspaceId = req.workspaceId;
        let query;
        let params = [];
        
        if (workspaceId) {
            // Trong workspace context, lấy role từ workspace_members và filter theo workspace
            query = `
                SELECT 
                    u.id,
                    u.username,
                    COUNT(DISTINCT ta.task_id) as assigned_tasks,
                    COUNT(DISTINCT tc.task_id) as commented_tasks,
                    COUNT(DISTINCT p.id) as projects_count
                FROM users u
                INNER JOIN workspace_members wm ON u.id = wm.user_id AND wm.workspace_id = ?
                LEFT JOIN tsk_asg ta ON u.id = ta.user_id
                LEFT JOIN tsk_cmt tc ON u.id = tc.user_id
                LEFT JOIN prj_mb pm ON u.id = pm.user_id
                LEFT JOIN prj p ON pm.project_id = p.id AND p.workspace_id = ?
                WHERE wm.role IN ('mb', 'tl', 'pm')
                GROUP BY u.id, u.username
                ORDER BY assigned_tasks DESC
                LIMIT 10
            `;
            params = [workspaceId, workspaceId];
        } else {
            // Global context: không có role filter, lấy tất cả users
            query = `
                SELECT 
                    u.id,
                    u.username,
                    COUNT(DISTINCT ta.task_id) as assigned_tasks,
                    COUNT(DISTINCT tc.task_id) as commented_tasks,
                    COUNT(DISTINCT p.id) as projects_count
                FROM users u
                LEFT JOIN tsk_asg ta ON u.id = ta.user_id
                LEFT JOIN tsk_cmt tc ON u.id = tc.user_id
                LEFT JOIN prj_mb pm ON u.id = pm.user_id
                LEFT JOIN prj p ON pm.project_id = p.id
                GROUP BY u.id, u.username
                ORDER BY assigned_tasks DESC
                LIMIT 10
            `;
        }
        
        const [rows] = await db.execute(query, params);
        res.json({ success: true, data: rows });
    } catch (err) {
        next(err);
    }
};

module.exports = {
    getProjectStats,
    getTaskStats,
    getTaskProgressByProject,
    getTasksByMonth,
    getUserActivityStats
};

