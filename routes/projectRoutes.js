const express = require('express');
const router = express.Router();
const { 
    authenticateToken, 
    requireLeaderOrAbove, 
    requireViewPermission, 
    requireEditPermission, 
    requireMemberManagement,
    requireViewMembers 
} = require('../middleware/auth');
const projectController = require('../controllers/projectController/projectController');

// List all projects - Tất cả role có thể xem
router.get('/', authenticateToken, requireViewPermission, projectController.getAll);

// Get my projects (filtered by permissions) - Tất cả role có thể xem
// Phải đặt trước /:id để tránh conflict
router.get('/my/list', authenticateToken, requireViewPermission, projectController.getMyProjects);

// Get project statuses - Tất cả role có thể xem
// Phải đặt trước /:id để tránh conflict
router.get('/statuses/list', authenticateToken, requireViewPermission, projectController.getStatuses);

// Get all users for member selection - Chỉ TL, PM, Admin
// Phải đặt trước /:id để tránh conflict
router.get('/users/list', authenticateToken, requireMemberManagement, projectController.getUsers);

// Get project by id - Tất cả role có thể xem
router.get('/:id', authenticateToken, requireViewPermission, projectController.getById);

// Create project - Chỉ TL, PM, Admin
router.post('/', authenticateToken, requireEditPermission, projectController.create);

// Update project - Chỉ TL, PM, Admin
router.put('/:id', authenticateToken, requireEditPermission, projectController.update);

// Delete project - Chỉ TL, PM, Admin
router.delete('/:id', authenticateToken, requireEditPermission, projectController.remove);

// Project members management
// Xem thành viên - Tất cả role
router.get('/:id/members', authenticateToken, requireViewMembers, projectController.getMembers);
// Thêm/xóa thành viên - Chỉ TL, PM, Admin
router.post('/:id/members', authenticateToken, requireMemberManagement, projectController.addMember);
router.delete('/:projectId/members/:memberId', authenticateToken, requireMemberManagement, projectController.removeMember);


module.exports = router;
