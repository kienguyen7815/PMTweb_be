const express = require('express');
const router = express.Router();
const { 
    authenticateToken, 
    requireViewPermission,
    requireEditPermission
} = require('../middleware/auth');
const { getWorkspaceRole } = require('../middleware/workspaceAuth');
const commentController = require('../controllers/commentController/commentController');

// Get comments for a task - All roles can view
router.get('/task/:taskId', authenticateToken, getWorkspaceRole, requireViewPermission, commentController.getTaskComments);

// Create comment - All roles can comment
router.post('/', authenticateToken, getWorkspaceRole, requireViewPermission, commentController.createComment);

// Update comment - Only comment owner or admin
router.put('/:id', authenticateToken, getWorkspaceRole, requireEditPermission, commentController.updateComment);

// Delete comment - Only comment owner or admin
router.delete('/:id', authenticateToken, getWorkspaceRole, requireEditPermission, commentController.deleteComment);

module.exports = router;
