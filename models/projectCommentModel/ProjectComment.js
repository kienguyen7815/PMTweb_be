const db = require('../../config/db');

class ProjectComment {
    constructor(data) {
        this.id = data.id;
        this.project_id = data.project_id;
        this.user_id = data.user_id;
        this.comment = data.comment;
        this.created_at = data.created_at;
    }

    static async create({ project_id, user_id, comment }) {
        try {
            if (!project_id || !user_id || !comment || !comment.trim()) {
                throw new Error('project_id, user_id và comment là bắt buộc');
            }

            const query = `INSERT INTO prj_cmt (project_id, user_id, comment) VALUES (?, ?, ?)`;
            const [result] = await db.execute(query, [project_id, user_id, comment.trim()]);
            return await this.findById(result.insertId);
        } catch (error) {
            throw error;
        }
    }

    static async findById(id) {
        try {
            const query = `
                SELECT pc.*, 
                       u.id as user_id, u.username, u.email, u.role, u.avatar,
                       p.name as project_name
                FROM prj_cmt pc
                JOIN users u ON pc.user_id = u.id
                JOIN prj p ON pc.project_id = p.id
                WHERE pc.id = ?
            `;
            const [rows] = await db.execute(query, [id]);
            if (rows.length === 0) return null;
            return rows[0];
        } catch (error) {
            throw error;
        }
    }

    static async findByProjectId(project_id) {
        try {
            const query = `
                SELECT pc.*, 
                       u.id as user_id, u.username, u.email, u.role, u.avatar
                FROM prj_cmt pc
                JOIN users u ON pc.user_id = u.id
                WHERE pc.project_id = ?
                ORDER BY pc.created_at ASC
            `;
            const [rows] = await db.execute(query, [project_id]);
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
            await db.execute(`UPDATE prj_cmt SET ${fields.join(', ')} WHERE id = ?`, values);
            
            return await ProjectComment.findById(this.id);
        } catch (error) {
            throw error;
        }
    }

    async delete() {
        try {
            const query = 'DELETE FROM prj_cmt WHERE id = ?';
            await db.execute(query, [this.id]);
            return true;
        } catch (error) {
            throw error;
        }
    }
}

module.exports = ProjectComment;

