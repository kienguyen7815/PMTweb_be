const express = require('express');
const router = express.Router();
const { 
    authenticateToken, 
    requireViewPermission,
    requireEditPermission
} = require('../middleware/auth');
const { getWorkspaceRole } = require('../middleware/workspaceAuth');
const taskAssignmentController = require('../controllers/taskAssignmentController/taskAssignmentController');

router.get('/my-tasks', authenticateToken, getWorkspaceRole, requireViewPermission, taskAssignmentController.getMyTasks);
router.post('/assign', authenticateToken, getWorkspaceRole, requireEditPermission, taskAssignmentController.assignTask);
router.get('/task/:taskId', authenticateToken, getWorkspaceRole, requireViewPermission, taskAssignmentController.getTaskAssignments);
router.delete('/:id', authenticateToken, getWorkspaceRole, requireEditPermission, taskAssignmentController.removeAssignment);
router.delete('/task/:taskId/user/:userId', authenticateToken, getWorkspaceRole, requireEditPermission, taskAssignmentController.removeAssignmentByTaskAndUser);

module.exports = router;

