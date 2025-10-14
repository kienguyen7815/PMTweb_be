const db = require('../../config/db');
const bcrypt = require('bcryptjs');

class User {
    constructor(data) {
        this.id = data.id;
        this.username = data.username;
        this.email = data.email;
        this.password = data.password;
        this.phone = data.phone;
        this.role = data.role || 'mb';
        this.created_at = data.created_at;
    }

    // Tạo user mới
    static async create(userData) {
        try {
            const { username, email, password, phone, role = 'mb' } = userData;
            
            // Kiểm tra email đã tồn tại chưa
            const existingUser = await this.findByEmail(email);
            if (existingUser) {
                throw new Error('Email đã được sử dụng');
            }

            // Mã hóa password
            const hashedPassword = await bcrypt.hash(password, 10);

            const query = `
                INSERT INTO users (username, email, password, phone, role) 
                VALUES (?, ?, ?, ?, ?)
            `;
            
            const [result] = await db.execute(query, [username, email, hashedPassword, phone, role]);
            
            return new User({
                id: result.insertId,
                username,
                email,
                phone,
                role,
                created_at: new Date()
            });
        } catch (error) {
            throw error;
        }
    }

    // Tìm user theo email
    static async findByEmail(email) {
        try {
            const query = 'SELECT * FROM users WHERE email = ?';
            const [rows] = await db.execute(query, [email]);
            
            if (rows.length === 0) {
                return null;
            }
            
            return new User(rows[0]);
        } catch (error) {
            throw error;
        }
    }

    // Tìm user theo ID
    static async findById(id) {
        try {
            const query = 'SELECT * FROM users WHERE id = ?';
            const [rows] = await db.execute(query, [id]);
            
            if (rows.length === 0) {
                return null;
            }
            
            return new User(rows[0]);
        } catch (error) {
            throw error;
        }
    }

    // Kiểm tra password
    async validatePassword(password) {
        return await bcrypt.compare(password, this.password);
    }

    // Lấy thông tin user (không bao gồm password)
    toJSON() {
        return {
            id: this.id,
            username: this.username,
            email: this.email,
            phone: this.phone,
            role: this.role,
            created_at: this.created_at
        };
    }

    // Cập nhật thông tin user
    async update(updateData) {
        try {
            const allowedFields = ['username', 'email', 'phone', 'role'];
            const fields = [];
            const values = [];

            for (const [key, value] of Object.entries(updateData)) {
                if (allowedFields.includes(key) && value !== undefined) {
                    fields.push(`${key} = ?`);
                    values.push(value);
                }
            }

            if (fields.length === 0) {
                throw new Error('Không có trường nào để cập nhật');
            }

            values.push(this.id);
            const query = `UPDATE users SET ${fields.join(', ')} WHERE id = ?`;
            
            await db.execute(query, values);
            
            // Cập nhật object hiện tại
            Object.assign(this, updateData);
            
            return this;
        } catch (error) {
            throw error;
        }
    }

    // Xóa user
    async delete() {
        try {
            const query = 'DELETE FROM users WHERE id = ?';
            await db.execute(query, [this.id]);
            return true;
        } catch (error) {
            throw error;
        }
    }

    // Lấy tất cả users
    static async findAll() {
        try {
            const query = 'SELECT * FROM users ORDER BY created_at DESC';
            const [rows] = await db.execute(query);
            
            return rows.map(row => new User(row));
        } catch (error) {
            throw error;
        }
    }
}

module.exports = User;
