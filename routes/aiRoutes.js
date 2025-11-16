const express = require('express');
const router = express.Router();
const { 
    authenticateToken, 
    requireEditPermission
} = require('../middleware/auth');
const aiController = require('../controllers/aiController/aiController');

// Chat with AI for task suggestions - Only TL, PM, Admin
router.post('/chat', authenticateToken, requireEditPermission, aiController.chatWithAI);

// Generate task suggestions (legacy) - Only TL, PM, Admin
router.post('/tasks/suggestions', authenticateToken, requireEditPermission, aiController.generateTaskSuggestions);

module.exports = router;

