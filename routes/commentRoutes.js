const express = require('express');
const router = express.Router();
const { 
    authenticateToken, 
    requireViewPermission,
    requireEditPermission
} = require('../middleware/auth');
const commentController = require('../controllers/commentController/commentController');

// Get comments for a task - All roles can view
router.get('/task/:taskId', authenticateToken, requireViewPermission, commentController.getTaskComments);

// Create comment - All roles can comment
router.post('/', authenticateToken, requireViewPermission, commentController.createComment);

// Update comment - Only comment owner or admin
router.put('/:id', authenticateToken, requireEditPermission, commentController.updateComment);

// Delete comment - Only comment owner or admin
router.delete('/:id', authenticateToken, requireEditPermission, commentController.deleteComment);

module.exports = router;
