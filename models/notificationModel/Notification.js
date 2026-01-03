const db = require('../../config/db');

class Notification {
    constructor(data) {
        this.id = data.id;
        this.user_id = data.user_id;
        this.message = data.message;
        this.is_read = data.is_read === 1 || data.is_read === true;
        this.created_at = data.created_at;
    }

    /**
     * Tạo notification mới cho user
     * @param {Object} param0 - Thông tin notification
     * @param {number} param0.user_id - ID người nhận
     * @param {string} param0.message - Nội dung notification
     * @returns {Promise<Notification>} - Notification vừa tạo
     */
    static async create({ user_id, message }) {
        try {
            if (!user_id || !message || !message.trim()) {
                throw new Error('user_id và message là bắt buộc');
            }

            const query = `INSERT INTO ntf (user_id, message) VALUES (?, ?)`;
            const [result] = await db.execute(query, [user_id, message.trim()]);
            return await this.findById(result.insertId);
        } catch (error) {
            throw error;
        }
    }

    /**
     * Tạo nhiều notification 1 lúc cho nhiều user
     * @param {Array<{user_id: number, message: string}>} notifications - Danh sách thông báo
     * @returns {Promise<Notification[]>}
     */
    static async createMultiple(notifications) {
        try {
            if (!Array.isArray(notifications) || notifications.length === 0) {
                return [];
            }

            const values = notifications.map(n => [n.user_id, n.message.trim()]);
            const placeholders = values.map(() => '(?, ?)').join(', ');
            const flatValues = values.flat();

            const query = `INSERT INTO ntf (user_id, message) VALUES ${placeholders}`;
            const [result] = await db.execute(query, flatValues);

            const firstId = result.insertId;
            const lastId = firstId + notifications.length - 1;

            const [rows] = await db.execute(
                'SELECT * FROM ntf WHERE id BETWEEN ? AND ? ORDER BY id ASC',
                [firstId, lastId]
            );

            return rows.map(row => new Notification(row));
        } catch (error) {
            throw error;
        }
    }

    /**
     * Lấy notification theo id
     * @param {number} id
     * @returns {Promise<Notification|null>}
     */
    static async findById(id) {
        try {
            const query = 'SELECT * FROM ntf WHERE id = ?';
            const [rows] = await db.execute(query, [id]);
            if (rows.length === 0) return null;
            return new Notification(rows[0]);
        } catch (error) {
            throw error;
        }
    }

    /**
     * Lấy danh sách notification theo user_id
     * @param {number} user_id
     * @param {Object} options
     * @param {number} [options.limit=50] - Số lượng tối đa trả về
     * @param {boolean} [options.unreadOnly=false] - Chỉ lấy những thông báo chưa đọc
     * @returns {Promise<Notification[]>}
     */
    static async findByUserId(user_id, options = {}) {
        try {
            const { limit = 50, unreadOnly = false } = options;
            let query = 'SELECT * FROM ntf WHERE user_id = ?';
            const params = [user_id];

            if (unreadOnly) {
                query += ' AND is_read = FALSE';
            }

            query += ' ORDER BY created_at DESC';

            if (limit) {
                const limitNum = parseInt(limit, 10);
                if (isNaN(limitNum) || limitNum < 1) {
                    throw new Error('Limit must be a positive integer');
                }
                query += ` LIMIT ${limitNum}`;
            }

            const [rows] = await db.execute(query, params);
            return rows.map(r => new Notification(r));
        } catch (error) {
            throw error;
        }
    }

    /**
     * Đếm số lượng notification chưa đọc của user
     * @param {number} user_id
     * @returns {Promise<number>}
     */
    static async countUnread(user_id) {
        try {
            const query = 'SELECT COUNT(*) as count FROM ntf WHERE user_id = ? AND is_read = FALSE';
            const [rows] = await db.execute(query, [user_id]);
            return rows[0].count || 0;
        } catch (error) {
            throw error;
        }
    }

    /**
     * Đánh dấu đã đọc notification này
     * @returns {Promise<Notification>}
     */
    async markAsRead() {
        try {
            const query = 'UPDATE ntf SET is_read = TRUE WHERE id = ?';
            await db.execute(query, [this.id]);
            this.is_read = true;
            return this;
        } catch (error) {
            throw error;
        }
    }

    /**
     * Đánh dấu tất cả notification của user là đã đọc
     * @param {number} user_id
     * @returns {Promise<boolean>}
     */
    static async markAllAsRead(user_id) {
        try {
            const query = 'UPDATE ntf SET is_read = TRUE WHERE user_id = ? AND is_read = FALSE';
            await db.execute(query, [user_id]);
            return true;
        } catch (error) {
            throw error;
        }
    }

    /**
     * Xóa notification này
     * @returns {Promise<boolean>}
     */
    async delete() {
        try {
            const query = 'DELETE FROM ntf WHERE id = ?';
            await db.execute(query, [this.id]);
            return true;
        } catch (error) {
            throw error;
        }
    }

    /**
     * Chuyển đối tượng Notification về dạng JSON
     * @returns {Object}
     */
    toJSON() {
        return {
            id: this.id,
            user_id: this.user_id,
            message: this.message,
            is_read: this.is_read,
            created_at: this.created_at
        };
    }
}

module.exports = Notification;

