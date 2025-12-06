const express = require('express');
const router = express.Router();
const { 
    authenticateToken, 
    requireEditPermission
} = require('../middleware/auth');
const { getWorkspaceRole } = require('../middleware/workspaceAuth');
const aiController = require('../controllers/aiController/aiController');

// Chat with AI for task suggestions - Only TL, PM, Admin (hỗ trợ workspace role)
router.post('/chat', authenticateToken, getWorkspaceRole, requireEditPermission, aiController.chatWithAI);

// Generate task suggestions (legacy) - Only TL, PM, Admin (hỗ trợ workspace role)
router.post('/tasks/suggestions', authenticateToken, getWorkspaceRole, requireEditPermission, aiController.generateTaskSuggestions);

module.exports = router;

