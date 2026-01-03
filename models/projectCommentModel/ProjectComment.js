const db = require('../../config/db');

class ProjectComment {
    constructor(data) {
        this.id = data.id;
        this.project_id = data.project_id;
        this.user_id = data.user_id;
        this.comment = data.comment;
        this.created_at = data.created_at;
    }

    /**
     * Tạo mới bình luận cho 1 project
     * @param {Object} param0 - Thông tin bình luận
     * @param {number} param0.project_id - ID của project
     * @param {number} param0.user_id - ID người bình luận
     * @param {string} param0.comment - Nội dung bình luận
     * @returns {Promise<Object>} - Bình luận vừa tạo (bao gồm thông tin user, project)
     */
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

    /**
     * Lấy thông tin chi tiết bình luận theo ID
     * @param {number} id - ID comment
     * @returns {Promise<Object|null>} - Dữ liệu bình luận, hoặc null nếu không tồn tại
     */
    static async findById(id) {
        try {
            const query = `
                SELECT pc.*, 
                       u.id as user_id, u.username, u.email, u.avatar,
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

    /**
     * Lấy danh sách bình luận theo project_id
     * @param {number} project_id - ID project
     * @returns {Promise<Array>} - Danh sách bình luận trong project (bao gồm thông tin user)
     */
    static async findByProjectId(project_id) {
        try {
            const query = `
                SELECT pc.*, 
                       u.id as user_id, u.username, u.email, u.avatar
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

    /**
     * Cập nhật bình luận (chỉ hỗ trợ cập nhật nội dung comment)
     * @param {Object} updateData - Dữ liệu cập nhật
     * @returns {Promise<Object>} - Bình luận sau khi được cập nhật
     */
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

    /**
     * Xóa bình luận khỏi project
     * @returns {Promise<boolean>} - true nếu thành công
     */
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

