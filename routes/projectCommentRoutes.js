const express = require('express');
const router = express.Router();
const { 
    authenticateToken, 
    requireViewPermission,
    requireEditPermission
} = require('../middleware/auth');
const projectCommentController = require('../controllers/projectCommentController/projectCommentController');

// Get comments for a project - All roles can view
router.get('/project/:projectId', authenticateToken, requireViewPermission, projectCommentController.getProjectComments);

// Create comment - All roles can comment
router.post('/', authenticateToken, requireViewPermission, projectCommentController.createComment);

// Update comment - Only comment owner or admin
router.put('/:id', authenticateToken, requireEditPermission, projectCommentController.updateComment);

// Delete comment - Only comment owner or admin
router.delete('/:id', authenticateToken, requireEditPermission, projectCommentController.deleteComment);

module.exports = router;

