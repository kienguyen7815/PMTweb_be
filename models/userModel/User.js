const db = require('../../config/db');
const bcrypt = require('bcryptjs');

class User {
    constructor(data) {
        this.id = data.id;
        this.username = data.username;
        this.email = data.email;
        this.password = data.password;
        this.phone = data.phone;

        if (!data.role) {
            this.role = 'user';
        } else {
            const rawRole = String(data.role).toLowerCase();
            this.role = (rawRole === 'admin' || rawRole === 'ad') ? 'admin' : 'user';
        }
        this.id_card = data.id_card;
        this.address = data.address;
        this.date_of_birth = data.date_of_birth;
        this.gender = data.gender;
        this.marital_status = data.marital_status;
        this.ethnicity = data.ethnicity;
        this.occupation = data.occupation;
        this.avatar = data.avatar;
        this.created_at = data.created_at;
    }

    // ================= Tóm tắt các phương thức xử lý User =================
    // - create: Tạo user mới, kiểm tra trùng email, mã hóa mật khẩu trước khi lưu vào CSDL.
    // - findByEmail: Tìm user theo email.
    // - findById: Tìm user theo ID.
    // - validatePassword: Kiểm tra mật khẩu hợp lệ.
    // - toJSON: Trả về thông tin user (ẩn password).
    // - update: Cập nhật thông tin user (chỉ trường hợp cho phép), tự động cập nhật avatar, kiểm soát log debug ở môi trường phát triển.
    // - delete: Xóa user khỏi hệ thống.
    // - findAll: Lấy danh sách tất cả user, sắp xếp theo thời gian tạo mới nhất trước.
    // ======================================================================

    static async create(userData) {
        try {
            const { username, email, password, phone, role = 'user' } = userData;
            
            // Kiểm tra email đã tồn tại chưa
            const existingUser = await this.findByEmail(email);
            if (existingUser) {
                throw new Error('Email đã được sử dụng');
            }

            // Mã hóa password
            const bcryptRounds = parseInt(process.env.BCRYPT_ROUNDS || '10', 10);
            const hashedPassword = await bcrypt.hash(password, bcryptRounds);

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
        // Xử lý date format
        let formattedDate = this.date_of_birth;
        if (this.date_of_birth) {
            // Nếu date có format ISO (có T), lấy phần date
            if (this.date_of_birth.toString().includes('T')) {
                formattedDate = this.date_of_birth.toISOString().split('T')[0];
            } else {
                formattedDate = this.date_of_birth;
            }
        }

        return {
            id: this.id,
            username: this.username,
            email: this.email,
            phone: this.phone,
            role: this.role,
            id_card: this.id_card,
            address: this.address,
            date_of_birth: formattedDate,
            gender: this.gender,
            marital_status: this.marital_status,
            ethnicity: this.ethnicity,
            occupation: this.occupation,
            avatar: this.avatar,
            created_at: this.created_at
        };
    }

    // Cập nhật thông tin user
    async update(updateData) {
        try {
            const allowedFields = [
                'username', 
                'email', 
                'password',
                'phone', 
                'role',
                'id_card',
                'address',
                'date_of_birth',
                'gender',
                'marital_status',
                'ethnicity',
                'occupation',
                'avatar'
            ];
            const fields = [];
            const values = [];

            for (const [key, value] of Object.entries(updateData)) {
                if (!allowedFields.includes(key)) {
                    continue; // Bỏ qua các trường không được phép
                }
                
                // Xử lý đặc biệt cho avatar
                if (key === 'avatar') {
                    // Avatar có thể là string (đường dẫn file) hoặc null/empty string (để xóa)
                    // Chỉ cập nhật nếu value được cung cấp (không phải undefined)
                    if (value !== undefined) {
                        fields.push(`${key} = ?`);
                        // Xử lý giá trị: null, empty string, hoặc undefined -> null; ngược lại -> string đã trim
                        const avatarValue = (value === '' || value === null) ? null : String(value).trim();
                        values.push(avatarValue);
                        if (process.env.NODE_ENV === 'development') {
                            console.log('Updating avatar in User model:', {
                                key: key,
                                originalValue: value,
                                processedValue: avatarValue,
                                type: typeof value,
                                willBeAdded: true
                            });
                        }
                    } else {
                        if (process.env.NODE_ENV === 'development') {
                            console.log('Avatar skipped - value is undefined');
                        }
                    }
                } 
                // Với các trường khác, bỏ qua giá trị undefined, null hoặc rỗng
                else if (value !== undefined && value !== null && value !== '') {
                    fields.push(`${key} = ?`);
                    values.push(value);
                }
            }

            if (fields.length === 0) {
                throw new Error('Không có trường nào để cập nhật');
            }

            values.push(this.id);
            const query = `UPDATE users SET ${fields.join(', ')} WHERE id = ?`;
            
            if (process.env.NODE_ENV === 'development') {
                console.log('User update query:', query);
                console.log('User update values:', values);
                console.log('User update values count:', values.length);
            }
            
            const [result] = await db.execute(query, values);
            
            if (process.env.NODE_ENV === 'development') {
                console.log('User update result:', {
                    affectedRows: result.affectedRows,
                    changedRows: result.changedRows
                });
                console.log('User update successful');
            }
            
            // Kiểm tra xem có dòng nào được cập nhật không
            if (result.affectedRows === 0) {
                throw new Error('Không có dòng nào được cập nhật trong database');
            }
            
            // Cập nhật object hiện tại với giá trị đã được xử lý
            for (const [key, value] of Object.entries(updateData)) {
                if (allowedFields.includes(key)) {
                    if (key === 'avatar') {
                        this.avatar = value === '' ? null : value;
                    } else {
                        this[key] = value;
                    }
                }
            }
            
            if (process.env.NODE_ENV === 'development') {
                console.log('User object after update:', {
                    id: this.id,
                    avatar: this.avatar
                });
            }
            
            return this;
        } catch (error) {
            if (process.env.NODE_ENV === 'development') {
                console.error('User update error:', error);
            }
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
