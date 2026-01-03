const db = require('../../config/db');

class TaskAssignment {
    constructor(data) {
        this.id = data.id;
        this.task_id = data.task_id;
        this.user_id = data.user_id;
        this.assigned_at = data.assigned_at;
    }

    /**
     * Gán task cho user mới, kiểm tra để tránh trùng lặp.
     * @param {Object} param0
     * @param {number} param0.task_id - Id của task
     * @param {number} param0.user_id - Id của user
     * @returns {Promise<Object>} - Thông tin task assignment vừa tạo
     */
    static async create({ task_id, user_id }) {
        try {
            const existing = await this.findByTaskAndUser(task_id, user_id);
            if (existing) {
                throw new Error('Task đã được giao cho user này');
            }

            const query = `INSERT INTO tsk_asg (task_id, user_id) VALUES (?, ?)`;
            const [result] = await db.execute(query, [task_id, user_id]);
            return await this.findById(result.insertId);
        } catch (error) {
            throw error;
        }
    }

    /**
     * Tìm assignment theo id (bao gồm thông tin task, user)
     * @param {number} id
     * @returns {Promise<Object|null>}
     */
    static async findById(id) {
        try {
            const query = `
                SELECT ta.*, 
                       t.name as task_name, t.description as task_description, 
                       t.status as task_status, t.progress as task_progress,
                       t.due_date as task_due_date, t.project_id,
                       u.username, u.email
                FROM tsk_asg ta
                JOIN tasks t ON ta.task_id = t.id
                JOIN users u ON ta.user_id = u.id
                WHERE ta.id = ?
            `;
            const [rows] = await db.execute(query, [id]);
            if (rows.length === 0) return null;
            return rows[0];
        } catch (error) {
            throw error;
        }
    }

    /**
     * Tìm assignment theo task_id và user_id
     * @param {number} task_id 
     * @param {number} user_id 
     * @returns {Promise<TaskAssignment|null>}
     */
    static async findByTaskAndUser(task_id, user_id) {
        try {
            const query = 'SELECT * FROM tsk_asg WHERE task_id = ? AND user_id = ?';
            const [rows] = await db.execute(query, [task_id, user_id]);
            if (rows.length === 0) return null;
            return new TaskAssignment(rows[0]);
        } catch (error) {
            throw error;
        }
    }

    /**
     * Lấy danh sách task được giao cho user_id cụ thể (gồm thông tin task/project)
     * @param {number} user_id
     * @returns {Promise<Array>}
     */
    static async findByUserId(user_id) {
        try {
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
                WHERE ta.user_id = ?
                ORDER BY ta.assigned_at DESC
            `;
            const [rows] = await db.execute(query, [user_id]);
            return rows;
        } catch (error) {
            throw error;
        }
    }

    /**
     * Lấy danh sách user được giao task cụ thể (gồm thông tin user)
     * @param {number} task_id
     * @returns {Promise<Array>}
     */
    static async findByTaskId(task_id) {
        try {
            const query = `
                SELECT ta.*, 
                       u.id as user_id, u.username, u.email, u.avatar
                FROM tsk_asg ta
                JOIN users u ON ta.user_id = u.id
                WHERE ta.task_id = ?
                ORDER BY ta.assigned_at DESC
            `;
            const [rows] = await db.execute(query, [task_id]);
            return rows;
        } catch (error) {
            throw error;
        }
    }

    /**
     * Xóa assignment bởi chính instance (theo id)
     * @returns {Promise<boolean>}
     */
    async delete() {
        try {
            const query = 'DELETE FROM tsk_asg WHERE id = ?';
            await db.execute(query, [this.id]);
            return true;
        } catch (error) {
            throw error;
        }
    }

    /**
     * Xóa assignment theo task_id và user_id
     * @param {number} task_id 
     * @param {number} user_id 
     * @returns {Promise<boolean>}
     */
    static async deleteByTaskAndUser(task_id, user_id) {
        try {
            const query = 'DELETE FROM tsk_asg WHERE task_id = ? AND user_id = ?';
            await db.execute(query, [task_id, user_id]);
            return true;
        } catch (error) {
            throw error;
        }
    }
}

module.exports = TaskAssignment;

