const express = require('express');
const router = express.Router();
const { 
    authenticateToken, 
    requireViewPermission,
    requireEditPermission
} = require('../middleware/auth');
const taskAssignmentController = require('../controllers/taskAssignmentController/taskAssignmentController');

// Get my tasks - Current user's assigned tasks
router.get('/my-tasks', authenticateToken, requireViewPermission, taskAssignmentController.getMyTasks);

// Assign task to user(s) - Only TL, PM, Admin
router.post('/assign', authenticateToken, requireEditPermission, taskAssignmentController.assignTask);

// Get assignments for a task - All roles can view
router.get('/task/:taskId', authenticateToken, requireViewPermission, taskAssignmentController.getTaskAssignments);

// Remove assignment - Only TL, PM, Admin
router.delete('/:id', authenticateToken, requireEditPermission, taskAssignmentController.removeAssignment);

// Remove assignment by task and user - Only TL, PM, Admin
router.delete('/task/:taskId/user/:userId', authenticateToken, requireEditPermission, taskAssignmentController.removeAssignmentByTaskAndUser);

module.exports = router;

