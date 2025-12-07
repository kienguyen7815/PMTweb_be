const db = require('../../config/db');

class Log {
    constructor(data) {
        this.id = data.id;
        this.user_id = data.user_id;
        this.action = data.action;
        this.target_table = data.target_table;
        this.target_id = data.target_id;
        this.description = data.description;
        this.created_at = data.created_at;
    }

    // Tạo log mới
    static async create({ user_id, action, target_table, target_id, description }) {
        try {
            const query = `
                INSERT INTO logs (user_id, action, target_table, target_id, description)
                VALUES (?, ?, ?, ?, ?)
            `;
            
            const [result] = await db.execute(query, [
                user_id || null,
                action,
                target_table || null,
                target_id || null,
                description || null
            ]);
            
            return result.insertId;
        } catch (error) {
            // Log errors không nên làm crash ứng dụng
            if (process.env.NODE_ENV === 'development') {
                console.error('Error creating log:', error);
            }
            return null;
        }
    }

    // Lấy logs theo user
    static async findByUser(user_id, limit = 100) {
        try {
            const query = `
                SELECT * FROM logs 
                WHERE user_id = ? 
                ORDER BY created_at DESC 
                LIMIT ?
            `;
            const [rows] = await db.execute(query, [user_id, limit]);
            return rows.map(row => new Log(row));
        } catch (error) {
            throw error;
        }
    }

    // Lấy logs theo target
    static async findByTarget(target_table, target_id, limit = 50) {
        try {
            const query = `
                SELECT * FROM logs 
                WHERE target_table = ? AND target_id = ? 
                ORDER BY created_at DESC 
                LIMIT ?
            `;
            const [rows] = await db.execute(query, [target_table, target_id, limit]);
            return rows.map(row => new Log(row));
        } catch (error) {
            throw error;
        }
    }

    // Lấy tất cả logs (với phân trang)
    static async findAll(page = 1, limit = 50) {
        try {
            const offset = (page - 1) * limit;
            const query = `
                SELECT l.*, u.username, u.email 
                FROM logs l
                LEFT JOIN users u ON l.user_id = u.id
                ORDER BY l.created_at DESC 
                LIMIT ? OFFSET ?
            `;
            const [rows] = await db.execute(query, [limit, offset]);
            return rows;
        } catch (error) {
            throw error;
        }
    }

    // Đếm tổng số logs
    static async count() {
        try {
            const query = 'SELECT COUNT(*) as total FROM logs';
            const [rows] = await db.execute(query);
            return rows[0].total;
        } catch (error) {
            throw error;
        }
    }

    toJSON() {
        return {
            id: this.id,
            user_id: this.user_id,
            action: this.action,
            target_table: this.target_table,
            target_id: this.target_id,
            description: this.description,
            created_at: this.created_at
        };
    }
}

module.exports = Log;

