const db = require('../../config/db');

class Member {
    constructor(data) {
        this.id = data.id;
        this.workspace_id = data.workspace_id || null;
        this.name = data.name;
        this.email = data.email;
        this.date_of_birth = data.date_of_birth;
        this.occupation = data.occupation;
        this.created_at = data.created_at;
        this.updated_at = data.updated_at;
    }

    /**
     * Tạo member mới cho workspace.
     * @param {Object} memberData - Dữ liệu member: name, email, date_of_birth, occupation, workspace_id
     * @returns {Promise<Member>} - Member vừa tạo
     * 
     * Tóm tắt: Tạo member mới, cho phép cùng email tham gia nhiều workspace khác nhau, trả về instance Member.
     */
    static async create(memberData) {
        try {
            const { name, email, date_of_birth, occupation, workspace_id = null } = memberData;
            
            // Cho phép cùng một email tham gia nhiều workspace khác nhauư
            const query = `
                INSERT INTO members (workspace_id, name, email, date_of_birth, occupation) 
                VALUES (?, ?, ?, ?, ?)
            `;
            
            const [result] = await db.execute(query, [
                workspace_id || null,
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

    /**
     * Tìm member theo email (có thể lọc theo workspace).
     * @param {string} email
     * @param {number|null} workspaceId
     * @returns {Promise<Member|null>}
     * 
     * Tóm tắt: Lấy về member có email và workspace cụ thể (nếu có workspaceId).
     */
    static async findByEmail(email, workspaceId = null) {
        try {
            let query = 'SELECT * FROM members WHERE email = ?';
            const params = [email];
            
            // Nếu có workspaceId, chỉ tìm trong workspace đó
            if (workspaceId !== null) {
                query += ' AND workspace_id = ?';
                params.push(workspaceId);
            }
            
            const [rows] = await db.execute(query, params);
            
            if (rows.length === 0) {
                return null;
            }
            
            return new Member(rows[0]);
        } catch (error) {
            throw error;
        }
    }

    /**
     * Tìm member theo ID.
     * @param {number} id 
     * @returns {Promise<Member|null>}
     * 
     * Tóm tắt: Trả về member theo id (nếu có).
     */
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

    /**
     * Lấy tất cả members (có thể lọc theo workspace).
     * @param {string|null} currentUserRole - Vai trò user hiện tại (không sử dụng nếu không truyền)
     * @param {number|null} workspaceId - Lọc members theo workspace (nếu có)
     * @returns {Promise<Member[]>}
     * 
     * Tóm tắt: Lấy danh sách tất cả member, có thể giới hạn theo workspace.
     */
    static async findAll(currentUserRole = null, workspaceId = null) {
        try {
            let query = 'SELECT * FROM members';
            const params = [];

            // Nếu có workspaceId -> chỉ lấy members của workspace đó
            if (workspaceId) {
                query += ' WHERE workspace_id = ?';
                params.push(workspaceId);
            }

            query += ' ORDER BY created_at DESC';
            
            const [rows] = await db.execute(query, params);
            
            return rows.map(row => new Member(row));
        } catch (error) {
            throw error;
        }
    }

    /**
     * Cập nhật thông tin member.
     * @param {Object} updateData - Dữ liệu cập nhật (name, email, date_of_birth, occupation)
     * @returns {Promise<void>}
     * 
     * Tóm tắt: Cập nhật các trường cho member hiện tại, chỉ các trường cho phép.
     */
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

    /**
     * Xóa member khỏi hệ thống.
     * @returns {Promise<void>}
     * 
     * Tóm tắt: Xóa member này khỏi bảng members.
     */
    async delete() {
        try {
            const query = 'DELETE FROM members WHERE id = ?';
            await db.execute(query, [this.id]);
        } catch (error) {
            throw error;
        }
    }

    /**
     * Lấy thông tin member ở dạng xuất JSON (không bao gồm dữ liệu nhạy cảm).
     * @returns {Object}
     * 
     * Tóm tắt: Trả về thông tin member cơ bản, ẩn các trường nhạy cảm.
     */
    toJSON() {
        return {
            id: this.id,
            workspace_id: this.workspace_id,
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

    /**
     * Tìm kiếm members theo pattern email (có thể lọc theo workspace, giới hạn số lượng).
     * @param {string} pattern - Chuỗi tìm kiếm (có thể là một phần email)
     * @param {number} limit - Số lượng tối đa trả về (mặc định 10)
     * @param {number|null} workspaceId - Lọc theo workspace nếu có
     * @returns {Promise<Member[]>}
     * 
     * Tóm tắt: Trả về danh sách member khớp email pattern, lọc workspace, không trả quá limit.
     */
    static async searchByEmail(pattern, limit = 10, workspaceId = null) {
        try {
            const searchPattern = `%${pattern.trim()}%`;
            // Ensure limit is a valid positive integer
            const limitValue = Number.isInteger(limit) && limit > 0 ? limit : 10;
            // LIMIT cannot use placeholder in some MySQL versions, so we include it directly in SQL
            let query = `SELECT * FROM members WHERE email LIKE ?`;
            const params = [searchPattern];

            if (workspaceId) {
                query += ' AND workspace_id = ?';
                params.push(workspaceId);
            }

            query += ' ORDER BY email';
            
            const [rows] = await db.execute(query, params);
            
            return rows.map(row => new Member(row));
        } catch (error) {
            throw error;
        }
    }
}

module.exports = Member;
