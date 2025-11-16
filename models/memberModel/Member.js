const db = require('../../config/db');

class Member {
    constructor(data) {
        this.id = data.id;
        this.name = data.name;
        this.email = data.email;
        this.date_of_birth = data.date_of_birth;
        this.occupation = data.occupation;
        this.created_at = data.created_at;
        this.updated_at = data.updated_at;
    }

    // Tạo member mới
    static async create(memberData) {
        try {
            const { name, email, date_of_birth, occupation } = memberData;
            
            // Kiểm tra email đã tồn tại chưa
            const existingMember = await this.findByEmail(email);
            if (existingMember) {
                throw new Error('Email đã được sử dụng');
            }

            const query = `
                INSERT INTO members (name, email, date_of_birth, occupation) 
                VALUES (?, ?, ?, ?)
            `;
            
            const [result] = await db.execute(query, [
                name.trim(),
                email.trim(),
                date_of_birth || null,
                occupation ? occupation.trim() : null
            ]);
            
            return await this.findById(result.insertId);
        } catch (error) {
            throw error;
        }
    }

    // Tìm member theo email
    static async findByEmail(email) {
        try {
            const query = 'SELECT * FROM members WHERE email = ?';
            const [rows] = await db.execute(query, [email]);
            
            if (rows.length === 0) {
                return null;
            }
            
            return new Member(rows[0]);
        } catch (error) {
            throw error;
        }
    }

    // Tìm member theo ID
    static async findById(id) {
        try {
            const query = 'SELECT * FROM members WHERE id = ?';
            const [rows] = await db.execute(query, [id]);
            
            if (rows.length === 0) {
                return null;
            }
            
            return new Member(rows[0]);
        } catch (error) {
            throw error;
        }
    }

    // Lấy tất cả members (có thể lọc theo role của user hiện tại)
    static async findAll(currentUserRole = null) {
        try {
            let query = 'SELECT * FROM members ORDER BY created_at DESC';
            let params = [];

            // Lọc theo role nếu có (logic nghiệp vụ)
            // Admin: hiển thị toàn bộ
            // PM: hiển thị tất cả (vì members không có role)
            // Team Leader: hiển thị tất cả
            // Member: không có quyền (sẽ bị chặn ở middleware)
            
            const [rows] = await db.execute(query, params);
            
            return rows.map(row => new Member(row));
        } catch (error) {
            throw error;
        }
    }

    // Cập nhật thông tin member
    async update(updateData) {
        try {
            const allowedFields = ['name', 'email', 'date_of_birth', 'occupation'];
            const fields = [];
            const values = [];

            for (const [key, value] of Object.entries(updateData)) {
                if (!allowedFields.includes(key)) {
                    continue;
                }
                
                fields.push(`${key} = ?`);
                
                // Xử lý giá trị
                if (value === null || value === undefined || value === '') {
                    values.push(null);
                } else {
                    values.push(typeof value === 'string' ? value.trim() : value);
                }
            }

            if (fields.length === 0) {
                return; // Không có gì để cập nhật
            }

            values.push(this.id);
            const query = `UPDATE members SET ${fields.join(', ')}, updated_at = CURRENT_TIMESTAMP WHERE id = ?`;
            
            await db.execute(query, values);
            
            // Reload data
            const updated = await Member.findById(this.id);
            Object.assign(this, updated);
        } catch (error) {
            throw error;
        }
    }

    // Xóa member
    async delete() {
        try {
            const query = 'DELETE FROM members WHERE id = ?';
            await db.execute(query, [this.id]);
        } catch (error) {
            throw error;
        }
    }

    // Lấy thông tin member (không bao gồm sensitive data)
    toJSON() {
        return {
            id: this.id,
            name: this.name,
            email: this.email,
            date_of_birth: this.date_of_birth ? 
                (this.date_of_birth.toString().includes('T') ? 
                    this.date_of_birth.toISOString().split('T')[0] : 
                    this.date_of_birth) : null,
            occupation: this.occupation,
            created_at: this.created_at,
            updated_at: this.updated_at
        };
    }

    // Tìm kiếm members theo email pattern
    static async searchByEmail(pattern, limit = 10) {
        try {
            const searchPattern = `%${pattern.trim()}%`;
            // Ensure limit is a valid positive integer
            const limitValue = Number.isInteger(limit) && limit > 0 ? limit : 10;
            // LIMIT cannot use placeholder in some MySQL versions, so we include it directly in SQL
            const query = `SELECT * FROM members WHERE email LIKE ? ORDER BY email`;
            
            const [rows] = await db.execute(query, [searchPattern]);
            
            return rows.map(row => new Member(row));
        } catch (error) {
            throw error;
        }
    }
}

module.exports = Member;

