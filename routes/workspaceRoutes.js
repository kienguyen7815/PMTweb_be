const express = require('express');
const router = express.Router();
const { authenticateToken } = require('../middleware/auth');
const workspaceController = require('../controllers/workspaceController/workspaceController');

// Tạo workspace mới
router.post('/', authenticateToken, workspaceController.createWorkspace);

// Lấy danh sách workspace mà user hiện tại tham gia
router.get('/my', authenticateToken, workspaceController.listMyWorkspaces);

// Lấy chi tiết workspace + danh sách thành viên
router.get('/:id', authenticateToken, workspaceController.getWorkspaceDetail);

// Quản lý thành viên trong workspace
router.post('/:id/members', authenticateToken, workspaceController.addMember);
router.put('/:id/members/:userId/role', authenticateToken, workspaceController.updateMemberRole);

module.exports = router;


