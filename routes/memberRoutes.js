const express = require('express');
const router = express.Router();
const { 
    authenticateToken, 
    requireLeaderOrAbove
} = require('../middleware/auth');
const memberController = require('../controllers/memberController/memberController');

// Lấy danh sách members - Admin, PM, Team Leader
router.get('/', authenticateToken, requireLeaderOrAbove, memberController.getAll);

// Lấy thông tin member theo ID - Admin, PM, Team Leader
router.get('/:id', authenticateToken, requireLeaderOrAbove, memberController.getById);

// Tạo member mới - Chỉ Admin, PM (Team Leader chỉ xem)
router.post('/', authenticateToken, requireLeaderOrAbove, memberController.create);

// Cập nhật thông tin member - Chỉ Admin, PM (Team Leader chỉ xem)
router.put('/:id', authenticateToken, requireLeaderOrAbove, memberController.update);

// Xóa member - Chỉ Admin
router.delete('/:id', authenticateToken, requireLeaderOrAbove, memberController.remove);

// Tìm kiếm email theo pattern - Admin, PM, Team Leader
router.get('/search/emails', authenticateToken, requireLeaderOrAbove, memberController.searchEmails);

module.exports = router;

