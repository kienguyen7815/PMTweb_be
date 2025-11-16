const User = require('../../models/userModel/User');
const { generateToken } = require('../../middleware/auth');

class AuthController {
    // Đăng ký user mới
    static async register(req, res, next) {
        try {
            const { username, email, password, role, phone } = req.body;

            // Tạo user mới
            const user = await User.create({
                username,
                email,
                password,
                phone,
                role: role || 'mb'
            });

            // Tạo JWT token
            const token = generateToken(user.id);

            res.status(201).json({
                success: true,
                message: 'Đăng ký thành công',
                data: {
                    user: user.toJSON(),
                    token
                }
            });

        } catch (error) {
            if (process.env.NODE_ENV === 'development') {
                console.error('Register error:', error);
            }
            
            if (error.message === 'Email đã được sử dụng') {
                return res.status(400).json({
                    success: false,
                    message: error.message
                });
            }

            next(error);
        }
    }

    // Đăng nhập
    static async login(req, res, next) {
        try {
            const { email, password } = req.body;

            // Validation
            if (!email || !password) {
                return res.status(400).json({
                    success: false,
                    message: 'Vui lòng nhập email và mật khẩu'
                });
            }

            // Tìm user theo email
            const user = await User.findByEmail(email);
            if (!user) {
                return res.status(401).json({
                    success: false,
                    message: 'Email hoặc mật khẩu không đúng'
                });
            }

            // Kiểm tra password
            const isValidPassword = await user.validatePassword(password);
            if (!isValidPassword) {
                return res.status(401).json({
                    success: false,
                    message: 'Email hoặc mật khẩu không đúng'
                });
            }

            // Tạo JWT token
            const token = generateToken(user.id);

            res.json({
                success: true,
                message: 'Đăng nhập thành công',
                data: {
                    user: user.toJSON(),
                    token
                }
            });

        } catch (error) {
            if (process.env.NODE_ENV === 'development') {
                console.error('Login error:', error);
            }
            next(error);
        }
    }

    // Lấy thông tin profile
    static async getProfile(req, res, next) {
        try {
            const user = await User.findById(req.user.id);
            if (!user) {
                return res.status(404).json({
                    success: false,
                    message: 'Người dùng không tồn tại'
                });
            }

            res.json({
                success: true,
                data: {
                    user: user.toJSON()
                }
            });

        } catch (error) {
            if (process.env.NODE_ENV === 'development') {
                console.error('Get profile error:', error);
            }
            next(error);
        }
    }

    // Cập nhật profile
    static async updateProfile(req, res, next) {
        try {
            const { 
                username, 
                email, 
                phone, 
                id_card, 
                address, 
                date_of_birth, 
                gender, 
                marital_status, 
                ethnicity, 
                occupation,
                avatar
            } = req.body;
            const userId = req.user.id;

            // Lấy thông tin user hiện tại
            const currentUser = await User.findById(userId);
            if (!currentUser) {
                return res.status(404).json({
                    success: false,
                    message: 'Người dùng không tồn tại'
                });
            }

            // Kiểm tra email unique nếu email được thay đổi
            if (email && email !== currentUser.email) {
                const existingUser = await User.findByEmail(email);
                if (existingUser && existingUser.id !== userId) {
                    return res.status(400).json({
                        success: false,
                        message: 'Email đã được sử dụng bởi người dùng khác'
                    });
                }
            }

            // Chuẩn bị dữ liệu cập nhật
            const updateData = {};
            if (username !== undefined) updateData.username = username;
            if (email !== undefined) updateData.email = email;
            if (phone !== undefined) updateData.phone = phone;
            if (id_card !== undefined) updateData.id_card = id_card;
            if (address !== undefined) updateData.address = address;
            if (date_of_birth !== undefined && date_of_birth !== '') {
                updateData.date_of_birth = date_of_birth;
                if (process.env.NODE_ENV === 'development') {
                    console.log('Updating date_of_birth:', date_of_birth);
                }
            }
            if (gender !== undefined) updateData.gender = gender;
            if (marital_status !== undefined) updateData.marital_status = marital_status;
            if (ethnicity !== undefined) updateData.ethnicity = ethnicity;
            if (occupation !== undefined) updateData.occupation = occupation;
            // Avatar được xử lý riêng qua route /profile/avatar

            // Cập nhật thông tin user
            if (Object.keys(updateData).length > 0) {
                await currentUser.update(updateData);
            }

            // Lấy thông tin cập nhật
            const updatedUser = await User.findById(userId);

            res.json({
                success: true,
                message: 'Cập nhật profile thành công',
                data: {
                    user: updatedUser.toJSON()
                }
            });

        } catch (error) {
            if (process.env.NODE_ENV === 'development') {
                console.error('Update profile error:', error);
            }
            
            // Xử lý lỗi database
            if (error.code === 'ER_DUP_ENTRY') {
                return res.status(400).json({
                    success: false,
                    message: 'Email đã được sử dụng bởi người dùng khác'
                });
            }
            
            next(error);
        }
    }

    // Đổi mật khẩu
    static async changePassword(req, res, next) {
        try {
            const { currentPassword, newPassword } = req.body;

            if (!currentPassword || !newPassword) {
                return res.status(400).json({
                    success: false,
                    message: 'Vui lòng nhập mật khẩu hiện tại và mật khẩu mới'
                });
            }

            if (newPassword.length < 6) {
                return res.status(400).json({
                    success: false,
                    message: 'Mật khẩu mới phải có ít nhất 6 ký tự'
                });
            }

            const user = await User.findById(req.user.id);
            
            // Kiểm tra mật khẩu hiện tại
            const isValidPassword = await user.validatePassword(currentPassword);
            if (!isValidPassword) {
                return res.status(400).json({
                    success: false,
                    message: 'Mật khẩu hiện tại không đúng'
                });
            }

            // Cập nhật mật khẩu mới
            const bcrypt = require('bcryptjs');
            const bcryptRounds = parseInt(process.env.BCRYPT_ROUNDS || '10', 10);
            const hashedPassword = await bcrypt.hash(newPassword, bcryptRounds);
            
            await user.update({ password: hashedPassword });

            res.json({
                success: true,
                message: 'Đổi mật khẩu thành công'
            });

        } catch (error) {
            if (process.env.NODE_ENV === 'development') {
                console.error('Change password error:', error);
            }
            next(error);
        }
    }

    // Upload avatar
    static async uploadAvatar(req, res, next) {
        try {
            if (!req.file) {
                return res.status(400).json({
                    success: false,
                    message: 'Không có file được upload'
                });
            }

            const userId = req.user.id;
            const user = await User.findById(userId);
            
            if (!user) {
                return res.status(404).json({
                    success: false,
                    message: 'Người dùng không tồn tại'
                });
            }

            // Xóa file avatar cũ nếu có
            if (user.avatar) {
                const fs = require('fs');
                const path = require('path');
                const oldAvatarPath = path.join(__dirname, '../../uploads/avatars', user.avatar);
                if (fs.existsSync(oldAvatarPath)) {
                    fs.unlinkSync(oldAvatarPath);
                    if (process.env.NODE_ENV === 'development') {
                        console.log('Đã xóa avatar cũ:', user.avatar);
                    }
                }
            }

            // Lưu đường dẫn file vào database
            // File name format: userId_timestamp.ext
            const avatarPath = req.file.filename;
            
            // Validation: đảm bảo filename tồn tại và không rỗng
            if (!avatarPath || avatarPath.trim() === '') {
                // Xóa file nếu có lỗi
                const fs = require('fs');
                const path = require('path');
                const filePath = path.join(__dirname, '../../uploads/avatars', req.file.filename);
                if (fs.existsSync(filePath)) {
                    fs.unlinkSync(filePath);
                }
                return res.status(400).json({
                    success: false,
                    message: 'Tên file không hợp lệ'
                });
            }
            
            if (process.env.NODE_ENV === 'development') {
                console.log('Đang lưu avatar vào database:', {
                    userId: userId,
                    avatarPath: avatarPath,
                    fileSize: req.file.size,
                    mimetype: req.file.mimetype,
                    fileObject: req.file
                });
            }

            // Cập nhật avatar vào database
            if (process.env.NODE_ENV === 'development') {
                console.log('Trước khi update - user.avatar:', user.avatar);
                console.log('avatarPath sẽ được lưu:', avatarPath);
                console.log('avatarPath type:', typeof avatarPath);
            }
            
            // Đảm bảo avatarPath là string và không rỗng trước khi update
            const avatarValue = String(avatarPath).trim();
            if (!avatarValue) {
                throw new Error('Đường dẫn avatar không hợp lệ');
            }
            
            await user.update({ avatar: avatarValue });

            if (process.env.NODE_ENV === 'development') {
                console.log('Sau khi update - user.avatar:', user.avatar);
            }

            // Xác nhận lại bằng cách lấy user từ database
            const updatedUser = await User.findById(userId);
            
            if (!updatedUser) {
                throw new Error('Không thể lấy thông tin user sau khi cập nhật');
            }

            if (process.env.NODE_ENV === 'development') {
                console.log('Sau khi query lại từ database:', {
                    userId: userId,
                    avatarInDB: updatedUser.avatar,
                    expectedAvatar: avatarPath,
                    match: updatedUser.avatar === avatarPath
                });
                
                // Query trực tiếp từ database để kiểm tra
                const db = require('../../config/db');
                const [rows] = await db.execute('SELECT avatar FROM users WHERE id = ?', [userId]);
                console.log('Query trực tiếp từ database:', rows[0]);
            }

            // Kiểm tra xem avatar có được lưu đúng không
            if (updatedUser.avatar !== avatarPath) {
                console.error('Lỗi: Avatar không khớp!', {
                    expected: avatarPath,
                    actual: updatedUser.avatar
                });
                throw new Error(`Avatar không được lưu đúng vào database. Expected: ${avatarPath}, Actual: ${updatedUser.avatar}`);
            }

            res.json({
                success: true,
                message: 'Upload avatar thành công và đã lưu vào database',
                data: {
                    user: updatedUser.toJSON(),
                    avatarUrl: `/uploads/avatars/${avatarPath}`
                }
            });

        } catch (error) {
            if (process.env.NODE_ENV === 'development') {
                console.error('Upload avatar error:', error);
                console.error('Error stack:', error.stack);
            }
            
            // Xóa file nếu có lỗi
            if (req.file) {
                try {
                    const fs = require('fs');
                    const path = require('path');
                    const filePath = path.join(__dirname, '../../uploads/avatars', req.file.filename);
                    if (fs.existsSync(filePath)) {
                        fs.unlinkSync(filePath);
                        if (process.env.NODE_ENV === 'development') {
                            console.log('Đã xóa file do lỗi:', req.file.filename);
                        }
                    }
                } catch (deleteError) {
                    console.error('Lỗi khi xóa file:', deleteError);
                }
            }
            
            // Trả về lỗi chi tiết hơn
            if (error.message) {
                return res.status(500).json({
                    success: false,
                    message: error.message || 'Lỗi khi upload avatar',
                    error: process.env.NODE_ENV === 'development' ? error.message : undefined
                });
            }
            
            next(error);
        }
    }
}

module.exports = AuthController;
