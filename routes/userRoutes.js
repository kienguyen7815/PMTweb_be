const express = require('express');
const router = express.Router();
const { 
    authenticateToken, 
    requireAdmin, 
    requirePMOrAdmin, 
    requireViewMembers,
    requireMemberManagement,
    requireLeaderOrAbove
} = require('../middleware/auth');
const userController = require('../controllers/userController/userController');

// Lấy danh sách users - Admin, PM, Team Leader (TL chỉ xem, không thể thêm/sửa/xóa)
router.get('/', authenticateToken, requireLeaderOrAbove, userController.getAll);

// Lấy thông tin user theo ID - Tất cả role có thể xem
router.get('/:id', authenticateToken, requireViewMembers, userController.getById);

// Tạo user mới - Chỉ Admin, PM
router.post('/', authenticateToken, requirePMOrAdmin, userController.create);

// Cập nhật thông tin user - Chỉ Admin, PM
router.put('/:id', authenticateToken, requirePMOrAdmin, userController.update);

// Xóa user - Chỉ Admin
router.delete('/:id', authenticateToken, requireAdmin, userController.remove);

// Lấy danh sách users cho việc thêm vào project (với tìm kiếm) - Chỉ TL, PM, Admin
router.get('/available/members', authenticateToken, requireMemberManagement, userController.getAvailableMembers);

// Tìm kiếm email theo pattern (chỉ role tl, mb) - TL, PM, Admin
router.get('/search/emails', authenticateToken, requireMemberManagement, userController.searchEmails);

module.exports = router;
