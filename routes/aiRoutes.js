const express = require('express');
const router = express.Router();
const { 
    authenticateToken, 
    requireEditPermission
} = require('../middleware/auth');
const { getWorkspaceRole } = require('../middleware/workspaceAuth');
const aiController = require('../controllers/aiController/aiController');

router.post('/chat', authenticateToken, getWorkspaceRole, requireEditPermission, aiController.chatWithAI);

router.post('/tasks/suggestions', authenticateToken, getWorkspaceRole, requireEditPermission, aiController.generateTaskSuggestions);

module.exports = router;

