const express = require('express');
const router = express.Router();
const { 
    authenticateToken, 
    requireLeaderOrAbove,
    requireSearchMembers
} = require('../middleware/auth');
const { getWorkspaceRole } = require('../middleware/workspaceAuth');
const memberController = require('../controllers/memberController/memberController');

// Lấy danh sách members - Admin, PM, Team Leader (hỗ trợ workspace role)
router.get('/', authenticateToken, getWorkspaceRole, requireLeaderOrAbove, memberController.getAll);

// Lấy thông tin member theo ID - Admin, PM, Team Leader (hỗ trợ workspace role)
router.get('/:id', authenticateToken, getWorkspaceRole, requireLeaderOrAbove, memberController.getById);

// Tạo member mới - Chỉ Admin, PM (Team Leader chỉ xem) (hỗ trợ workspace role)
router.post('/', authenticateToken, getWorkspaceRole, requireLeaderOrAbove, memberController.create);

// Cập nhật thông tin member - Chỉ Admin, PM (Team Leader chỉ xem) (hỗ trợ workspace role)
router.put('/:id', authenticateToken, getWorkspaceRole, requireLeaderOrAbove, memberController.update);

// Xóa member - Chỉ Admin (hỗ trợ workspace role)
router.delete('/:id', authenticateToken, getWorkspaceRole, requireLeaderOrAbove, memberController.remove);

// Tìm kiếm email theo pattern - Tất cả thành viên trong workspace (PM, TL, MB, CLT) đều có thể search
router.get('/search/emails', authenticateToken, getWorkspaceRole, requireSearchMembers, memberController.searchEmails);

module.exports = router;

