const express = require('express');
const router = express.Router();
const { 
    authenticateToken, 
    requireLeaderOrAbove, 
    requireViewPermission, 
    requireEditPermission 
} = require('../middleware/auth');
const { getWorkspaceRole } = require('../middleware/workspaceAuth');
const taskController = require('../controllers/taskController/taskController');

// List by project - Tất cả role có thể xem
router.get('/project/:projectId', authenticateToken, getWorkspaceRole, requireViewPermission, taskController.listByProject);

// Get status options
router.get('/statuses', authenticateToken, getWorkspaceRole, requireViewPermission, taskController.getStatuses);

// Get by id - Tất cả role có thể xem
router.get('/:id', authenticateToken, getWorkspaceRole, requireViewPermission, taskController.getById);

// Create - Chỉ TL, PM, Admin
router.post('/', authenticateToken, getWorkspaceRole, requireEditPermission, taskController.create);

// Update - Chỉ TL, PM, Admin
router.put('/:id', authenticateToken, getWorkspaceRole, requireEditPermission, taskController.update);

// Update progress - Tất cả role có thể cập nhật (MB, TL, PM, Admin)
router.put('/:id/progress', authenticateToken, getWorkspaceRole, requireViewPermission, taskController.updateProgress);

// Update status - Tất cả role có thể cập nhật nếu được giao hoặc là PM/Admin
router.put('/:id/status', authenticateToken, getWorkspaceRole, requireViewPermission, taskController.updateStatus);

// Delete - Chỉ TL, PM, Admin
router.delete('/:id', authenticateToken, getWorkspaceRole, requireEditPermission, taskController.remove);

module.exports = router;
