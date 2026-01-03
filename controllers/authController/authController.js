const User = require('../../models/userModel/User');
const { generateToken } = require('../../middleware/auth');

class AuthController {
    static async register(req, res, next) {
        try {
            const { username, email, password, role, phone } = req.body;

            const effectiveRole = role === 'admin' ? 'admin' : 'user';
            const user = await User.create({
                username,
                email,
                password,
                phone,
                role: effectiveRole
            });

            // Tạo JWT token để user có thể đăng nhập ngay
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

    static async login(req, res, next) {
        try {
            const { email, password } = req.body;

            if (!email || !password) {
                return res.status(400).json({
                    success: false,
                    message: 'Vui lòng nhập email và mật khẩu'
                });
            }

            const user = await User.findByEmail(email);
            if (!user) {
                return res.status(401).json({
                    success: false,
                    message: 'Email hoặc mật khẩu không đúng'
                });
            }

            const isValidPassword = await user.validatePassword(password);
            if (!isValidPassword) {
                return res.status(401).json({
                    success: false,
                    message: 'Email hoặc mật khẩu không đúng'
                });
            }

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

            const currentUser = await User.findById(userId);
            if (!currentUser) {
                return res.status(404).json({
                    success: false,
                    message: 'Người dùng không tồn tại'
                });
            }

            if (email && email !== currentUser.email) {
                const existingUser = await User.findByEmail(email);
                if (existingUser && existingUser.id !== userId) {
                    return res.status(400).json({
                        success: false,
                        message: 'Email đã được sử dụng bởi người dùng khác'
                    });
                }
            }

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
            if (Object.keys(updateData).length > 0) {
                await currentUser.update(updateData);
            }

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

            if (error.code === 'ER_DUP_ENTRY') {
                return res.status(400).json({
                    success: false,
                    message: 'Email đã được sử dụng bởi người dùng khác'
                });
            }
            
            next(error);
        }
    }

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

            const isValidPassword = await user.validatePassword(currentPassword);
            if (!isValidPassword) {
                return res.status(400).json({
                    success: false,
                    message: 'Mật khẩu hiện tại không đúng'
                });
            }

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

            const avatarPath = req.file.filename;

            if (!avatarPath || avatarPath.trim() === '') {
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
                console.log('Đang lưu avatar:', {
                    userId: userId,
                    avatarPath: avatarPath,
                    fileSize: req.file.size,
                    mimetype: req.file.mimetype,
                    fileObject: req.file
                });
            }

            if (process.env.NODE_ENV === 'development') {
                console.log('Trước khi update - user.avatar:', user.avatar);
                console.log('avatarPath sẽ được lưu:', avatarPath);
                console.log('avatarPath type:', typeof avatarPath);
            }

            const avatarValue = String(avatarPath).trim();
            if (!avatarValue) {
                throw new Error('Đường dẫn avatar không hợp lệ');
            }
            
            await user.update({ avatar: avatarValue });

            if (process.env.NODE_ENV === 'development') {
                console.log('Sau khi update - user.avatar:', user.avatar);
            }

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

                const db = require('../../config/db');
                const [rows] = await db.execute('SELECT avatar FROM users WHERE id = ?', [userId]);
                console.log('Query trực tiếp từ database:', rows[0]);
            }

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

            const statusCode = error.statusCode || 500;
            const message = error.message || 'Lỗi khi upload avatar';
            
            return res.status(statusCode).json({
                success: false,
                message: message,
                ...(process.env.NODE_ENV === 'development' && { 
                    error: error.message,
                    stack: error.stack 
                })
            });
        }
    }
}

module.exports = AuthController;
