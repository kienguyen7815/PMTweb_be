const db = require('../../config/db');

class Comment {
    constructor(data) {
        this.id = data.id;
        this.task_id = data.task_id;
        this.user_id = data.user_id;
        this.comment = data.comment;
        this.created_at = data.created_at;
    }

    /**
     * Tạo mới bình luận cho 1 task
     * @param {Object} param0 - Thông tin bình luận
     * @param {number} param0.task_id - ID của task
     * @param {number} param0.user_id - ID người bình luận
     * @param {string} param0.comment - Nội dung bình luận
     * @returns {Promise<Object>} - Bình luận vừa tạo (bao gồm thông tin user, task)
     */
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

    /**
     * Lấy thông tin chi tiết bình luận theo ID
     * @param {number} id - ID comment
     * @returns {Promise<Object|null>} - Dữ liệu bình luận, hoặc null nếu không tồn tại
     */
    static async findById(id) {
        try {
            const query = `
                SELECT tc.*, 
                       u.id as user_id, u.username, u.email, u.avatar,
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

    /**
     * Lấy danh sách bình luận theo task_id
     * @param {number} task_id - ID task
     * @returns {Promise<Array>} - Danh sách bình luận trong task (bao gồm thông tin user)
     */
    static async findByTaskId(task_id) {
        try {
            const query = `
                SELECT tc.*, 
                       u.id as user_id, u.username, u.email, u.avatar
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

    /**
     * Cập nhật bình luận hiện tại (chỉ field comment)
     * @param {Object} updateData - { comment }
     * @returns {Promise<Object>} - Bình luận sau khi cập nhật
     */
    async update(updateData) {
        try {
            const allowed = ['comment'];
            const fields = [];
            const values = [];

            // Chỉ cập nhật trường được phép
            for (const [key, value] of Object.entries(updateData)) {
                if (allowed.includes(key) && value !== undefined) {
                    fields.push(`${key} = ?`);
                    values.push(value);
                }
            }

            // Không có dữ liệu cập nhật
            if (fields.length === 0) return this;

            values.push(this.id);
            await db.execute(`UPDATE tsk_cmt SET ${fields.join(', ')} WHERE id = ?`, values);

            return await Comment.findById(this.id);
        } catch (error) {
            throw error;
        }
    }

    /**
     * Xóa bình luận hiện tại khỏi database
     * @returns {Promise<boolean>} - true nếu xóa thành công
     */
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

