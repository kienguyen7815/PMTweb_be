const db = require('../../config/db');

class Comment {
    constructor(data) {
        this.id = data.id;
        this.task_id = data.task_id;
        this.user_id = data.user_id;
        this.comment = data.comment;
        this.created_at = data.created_at;
    }

    static async create({ task_id, user_id, comment }) {
        try {
            if (!task_id || !user_id || !comment || !comment.trim()) {
                throw new Error('task_id, user_id và comment là bắt buộc');
            }

            const query = `INSERT INTO tsk_cmt (task_id, user_id, comment) VALUES (?, ?, ?)`;
            const [result] = await db.execute(query, [task_id, user_id, comment.trim()]);
            return await this.findById(result.insertId);
        } catch (error) {
            throw error;
        }
    }

    static async findById(id) {
        try {
            const query = `
                SELECT tc.*, 
                       u.id as user_id, u.username, u.email, u.role, u.avatar,
                       t.name as task_name
                FROM tsk_cmt tc
                JOIN users u ON tc.user_id = u.id
                JOIN tasks t ON tc.task_id = t.id
                WHERE tc.id = ?
            `;
            const [rows] = await db.execute(query, [id]);
            if (rows.length === 0) return null;
            return rows[0];
        } catch (error) {
            throw error;
        }
    }

    static async findByTaskId(task_id) {
        try {
            const query = `
                SELECT tc.*, 
                       u.id as user_id, u.username, u.email, u.role, u.avatar
                FROM tsk_cmt tc
                JOIN users u ON tc.user_id = u.id
                WHERE tc.task_id = ?
                ORDER BY tc.created_at ASC
            `;
            const [rows] = await db.execute(query, [task_id]);
            return rows;
        } catch (error) {
            throw error;
        }
    }

    async update(updateData) {
        try {
            const allowed = ['comment'];
            const fields = [];
            const values = [];

            for (const [key, value] of Object.entries(updateData)) {
                if (allowed.includes(key) && value !== undefined) {
                    fields.push(`${key} = ?`);
                    values.push(value);
                }
            }

            if (fields.length === 0) return this;

            values.push(this.id);
            await db.execute(`UPDATE tsk_cmt SET ${fields.join(', ')} WHERE id = ?`, values);
            
            return await Comment.findById(this.id);
        } catch (error) {
            throw error;
        }
    }

    async delete() {
        try {
            const query = 'DELETE FROM tsk_cmt WHERE id = ?';
            await db.execute(query, [this.id]);
            return true;
        } catch (error) {
            throw error;
        }
    }
}

module.exports = Comment;

