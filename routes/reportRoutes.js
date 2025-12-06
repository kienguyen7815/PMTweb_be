const express = require('express');
const router = express.Router();
const { 
    authenticateToken, 
    requireLeaderOrAbove
} = require('../middleware/auth');
const { getWorkspaceRole } = require('../middleware/workspaceAuth');
const reportController = require('../controllers/reportController/reportController');

// All report routes require leader or above (hỗ trợ workspace role)
router.get('/projects/stats', authenticateToken, getWorkspaceRole, requireLeaderOrAbove, reportController.getProjectStats);
router.get('/tasks/stats', authenticateToken, getWorkspaceRole, requireLeaderOrAbove, reportController.getTaskStats);
router.get('/tasks/progress-by-project', authenticateToken, getWorkspaceRole, requireLeaderOrAbove, reportController.getTaskProgressByProject);
router.get('/tasks/by-month', authenticateToken, getWorkspaceRole, requireLeaderOrAbove, reportController.getTasksByMonth);
router.get('/users/activity', authenticateToken, getWorkspaceRole, requireLeaderOrAbove, reportController.getUserActivityStats);

module.exports = router;

