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
const { getWorkspaceRole } = require('../middleware/workspaceAuth');
const projectController = require('../controllers/projectController/projectController');

// List all projects - Tất cả role có thể xem
router.get('/', authenticateToken, getWorkspaceRole, requireViewPermission, projectController.getAll);

// Get my projects (filtered by permissions) - Tất cả role có thể xem
// Phải đặt trước /:id để tránh conflict
router.get('/my/list', authenticateToken, getWorkspaceRole, requireViewPermission, projectController.getMyProjects);

// Get project statuses - Tất cả role có thể xem
// Phải đặt trước /:id để tránh conflict
router.get('/statuses/list', authenticateToken, getWorkspaceRole, requireViewPermission, projectController.getStatuses);

// Get all users for member selection - Chỉ TL, PM, Admin
// Phải đặt trước /:id để tránh conflict
router.get('/users/list', authenticateToken, getWorkspaceRole, requireMemberManagement, projectController.getUsers);

// Get project by id - Tất cả role có thể xem
router.get('/:id', authenticateToken, getWorkspaceRole, requireViewPermission, projectController.getById);

// Create project - Chỉ TL, PM, Admin
router.post('/', authenticateToken, getWorkspaceRole, requireEditPermission, projectController.create);

// Update project - Chỉ TL, PM, Admin
router.put('/:id', authenticateToken, getWorkspaceRole, requireEditPermission, projectController.update);

// Delete project - Chỉ TL, PM, Admin
router.delete('/:id', authenticateToken, getWorkspaceRole, requireEditPermission, projectController.remove);

// Project members management
// Xem thành viên - Tất cả role
router.get('/:id/members', authenticateToken, getWorkspaceRole, requireViewMembers, projectController.getMembers);
// Thêm/xóa thành viên - Chỉ TL, PM, Admin
router.post('/:id/members', authenticateToken, getWorkspaceRole, requireMemberManagement, projectController.addMember);
router.delete('/:projectId/members/:memberId', authenticateToken, getWorkspaceRole, requireMemberManagement, projectController.removeMember);


module.exports = router;
