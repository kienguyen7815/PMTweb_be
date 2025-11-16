const express = require('express');
const router = express.Router();
const { 
    authenticateToken, 
    requireLeaderOrAbove, 
    requireViewPermission, 
    requireEditPermission 
} = require('../middleware/auth');
const taskController = require('../controllers/taskController/taskController');

// List by project - Tất cả role có thể xem
router.get('/project/:projectId', authenticateToken, requireViewPermission, taskController.listByProject);

// Get by id - Tất cả role có thể xem
router.get('/:id', authenticateToken, requireViewPermission, taskController.getById);

// Create - Chỉ TL, PM, Admin
router.post('/', authenticateToken, requireEditPermission, taskController.create);

// Update - Chỉ TL, PM, Admin
router.put('/:id', authenticateToken, requireEditPermission, taskController.update);

// Update progress - Tất cả role có thể cập nhật (MB, TL, PM, Admin)
router.put('/:id/progress', authenticateToken, requireViewPermission, taskController.updateProgress);

// Delete - Chỉ TL, PM, Admin
router.delete('/:id', authenticateToken, requireEditPermission, taskController.remove);

module.exports = router;
