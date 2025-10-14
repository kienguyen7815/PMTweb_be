const User = require('../../models/userModel/User');
const { generateToken } = require('../../middleware/auth');

class AuthController {
    // Đăng ký user mới
    static async register(req, res) {
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
            console.error('Register error:', error);
            
            if (error.message === 'Email đã được sử dụng') {
                return res.status(400).json({
                    success: false,
                    message: error.message
                });
            }

            res.status(500).json({
                success: false,
                message: 'Lỗi server khi đăng ký'
            });
        }
    }

    // Đăng nhập
    static async login(req, res) {
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
            console.error('Login error:', error);
            res.status(500).json({
                success: false,
                message: 'Lỗi server khi đăng nhập'
            });
        }
    }

    // Lấy thông tin profile
    static async getProfile(req, res) {
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
            console.error('Get profile error:', error);
            res.status(500).json({
                success: false,
                message: 'Lỗi server khi lấy thông tin profile'
            });
        }
    }

    // Cập nhật profile
    static async updateProfile(req, res) {
        try {
            const { username, phone } = req.body;
            const userId = req.user.id;

            // Cập nhật thông tin user
            const updateData = {};
            if (username) updateData.username = username;
            if (phone) updateData.phone = phone;

            const user = await User.findById(userId);
            if (Object.keys(updateData).length > 0) {
                await user.update(updateData);
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
            console.error('Update profile error:', error);
            res.status(500).json({
                success: false,
                message: 'Lỗi server khi cập nhật profile'
            });
        }
    }

    // Đổi mật khẩu
    static async changePassword(req, res) {
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
            const hashedPassword = await bcrypt.hash(newPassword, 10);
            
            await user.update({ password: hashedPassword });

            res.json({
                success: true,
                message: 'Đổi mật khẩu thành công'
            });

        } catch (error) {
            console.error('Change password error:', error);
            res.status(500).json({
                success: false,
                message: 'Lỗi server khi đổi mật khẩu'
            });
        }
    }
}

module.exports = AuthController;
