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

router.get('/project/:projectId', authenticateToken, getWorkspaceRole, requireViewPermission, taskController.listByProject);
router.get('/statuses', authenticateToken, getWorkspaceRole, requireViewPermission, taskController.getStatuses);
router.get('/:id', authenticateToken, getWorkspaceRole, requireViewPermission, taskController.getById);
router.post('/', authenticateToken, getWorkspaceRole, requireEditPermission, taskController.create);
router.put('/:id', authenticateToken, getWorkspaceRole, requireEditPermission, taskController.update);
router.put('/:id/progress', authenticateToken, getWorkspaceRole, requireViewPermission, taskController.updateProgress);
router.put('/:id/status', authenticateToken, getWorkspaceRole, requireViewPermission, taskController.updateStatus);
router.delete('/:id', authenticateToken, getWorkspaceRole, requireEditPermission, taskController.remove);

module.exports = router;
