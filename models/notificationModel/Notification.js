const db = require('../../config/db');

class Notification {
    constructor(data) {
        this.id = data.id;
        this.user_id = data.user_id;
        this.message = data.message;
        // MySQL BOOLEAN returns 0/1, convert to boolean
        this.is_read = data.is_read === 1 || data.is_read === true;
        this.created_at = data.created_at;
    }

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
            
            // Return created notifications
            const created = [];
            for (let i = 0; i < notifications.length; i++) {
                const id = result.insertId + i;
                const notif = await this.findById(id);
                if (notif) created.push(notif);
            }
            return created;
        } catch (error) {
            throw error;
        }
    }

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

    static async findByUserId(user_id, options = {}) {
        try {
            const { limit = 50, unreadOnly = false } = options;
            let query = 'SELECT * FROM ntf WHERE user_id = ?';
            const params = [user_id];

            if (unreadOnly) {
                query += ' AND is_read = FALSE';
            }

            query += ' ORDER BY created_at DESC';

            // MySQL doesn't support placeholder for LIMIT, so we need to validate and use string interpolation
            // Validate limit is a positive integer to prevent SQL injection
            if (limit) {
                const limitNum = parseInt(limit, 10);
                if (isNaN(limitNum) || limitNum < 1) {
                    throw new Error('Limit must be a positive integer');
                }
                // Use string interpolation for LIMIT after validation
                query += ` LIMIT ${limitNum}`;
            }

            const [rows] = await db.execute(query, params);
            return rows.map(r => new Notification(r));
        } catch (error) {
            throw error;
        }
    }

    static async countUnread(user_id) {
        try {
            const query = 'SELECT COUNT(*) as count FROM ntf WHERE user_id = ? AND is_read = FALSE';
            const [rows] = await db.execute(query, [user_id]);
            return rows[0].count || 0;
        } catch (error) {
            throw error;
        }
    }

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

    static async markAllAsRead(user_id) {
        try {
            const query = 'UPDATE ntf SET is_read = TRUE WHERE user_id = ? AND is_read = FALSE';
            await db.execute(query, [user_id]);
            return true;
        } catch (error) {
            throw error;
        }
    }

    async delete() {
        try {
            const query = 'DELETE FROM ntf WHERE id = ?';
            await db.execute(query, [this.id]);
            return true;
        } catch (error) {
            throw error;
        }
    }

    // Lấy thông tin notification dạng JSON (để serialize)
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

