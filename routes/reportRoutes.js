const express = require('express');
const router = express.Router();
const { 
    authenticateToken, 
    requireLeaderOrAbove
} = require('../middleware/auth');
const reportController = require('../controllers/reportController/reportController');

// All report routes require leader or above
router.get('/projects/stats', authenticateToken, requireLeaderOrAbove, reportController.getProjectStats);
router.get('/tasks/stats', authenticateToken, requireLeaderOrAbove, reportController.getTaskStats);
router.get('/tasks/progress-by-project', authenticateToken, requireLeaderOrAbove, reportController.getTaskProgressByProject);
router.get('/tasks/by-month', authenticateToken, requireLeaderOrAbove, reportController.getTasksByMonth);
router.get('/users/activity', authenticateToken, requireLeaderOrAbove, reportController.getUserActivityStats);

module.exports = router;

