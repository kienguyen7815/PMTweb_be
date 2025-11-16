const db = require('../../config/db');

// Get project statistics
const getProjectStats = async (req, res, next) => {
    try {
        const query = `
            SELECT 
                COUNT(*) as total,
                SUM(CASE WHEN status = 'Not Started' THEN 1 ELSE 0 END) as not_started,
                SUM(CASE WHEN status = 'In Progress' THEN 1 ELSE 0 END) as in_progress,
                SUM(CASE WHEN status = 'Completed' THEN 1 ELSE 0 END) as completed
            FROM prj
        `;
        const [rows] = await db.execute(query);
        res.json({ success: true, data: rows[0] });
    } catch (err) {
        next(err);
    }
};

// Get task statistics
const getTaskStats = async (req, res, next) => {
    try {
        const query = `
            SELECT 
                COUNT(*) as total,
                SUM(CASE WHEN status = 'To Do' THEN 1 ELSE 0 END) as to_do,
                SUM(CASE WHEN status = 'In Progress' THEN 1 ELSE 0 END) as in_progress,
                SUM(CASE WHEN status = 'Done' THEN 1 ELSE 0 END) as done,
                AVG(progress) as avg_progress
            FROM tasks
        `;
        const [rows] = await db.execute(query);
        res.json({ success: true, data: rows[0] });
    } catch (err) {
        next(err);
    }
};

// Get task progress by project
const getTaskProgressByProject = async (req, res, next) => {
    try {
        const query = `
            SELECT 
                p.id,
                p.name,
                COUNT(t.id) as total_tasks,
                AVG(t.progress) as avg_progress,
                SUM(CASE WHEN t.status = 'Done' THEN 1 ELSE 0 END) as completed_tasks
            FROM prj p
            LEFT JOIN tasks t ON p.id = t.project_id
            GROUP BY p.id, p.name
            ORDER BY p.name
        `;
        const [rows] = await db.execute(query);
        res.json({ success: true, data: rows });
    } catch (err) {
        next(err);
    }
};

// Get tasks by month (for chart)
const getTasksByMonth = async (req, res, next) => {
    try {
        const query = `
            SELECT 
                DATE_FORMAT(created_at, '%Y-%m') as month,
                COUNT(*) as count
            FROM tasks
            WHERE created_at >= DATE_SUB(NOW(), INTERVAL 6 MONTH)
            GROUP BY DATE_FORMAT(created_at, '%Y-%m')
            ORDER BY month ASC
        `;
        const [rows] = await db.execute(query);
        res.json({ success: true, data: rows });
    } catch (err) {
        next(err);
    }
};

// Get user activity stats
const getUserActivityStats = async (req, res, next) => {
    try {
        const query = `
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
            WHERE u.role IN ('mb', 'tl', 'pm')
            GROUP BY u.id, u.username
            ORDER BY assigned_tasks DESC
            LIMIT 10
        `;
        const [rows] = await db.execute(query);
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

