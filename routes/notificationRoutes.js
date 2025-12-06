const express = require('express');
const router = express.Router();
const { 
    authenticateToken, 
    requireViewPermission
} = require('../middleware/auth');
const { getWorkspaceRole } = require('../middleware/workspaceAuth');
const notificationController = require('../controllers/notificationController/notificationController');

// Get user's notifications - All authenticated users (hỗ trợ workspace role)
router.get('/', authenticateToken, getWorkspaceRole, requireViewPermission, notificationController.getMyNotifications);

// Get unread count - All authenticated users (hỗ trợ workspace role)
router.get('/unread-count', authenticateToken, getWorkspaceRole, requireViewPermission, notificationController.getUnreadCount);

// Mark notification as read - All authenticated users (hỗ trợ workspace role)
router.put('/:id/read', authenticateToken, getWorkspaceRole, requireViewPermission, notificationController.markAsRead);

// Mark all as read - All authenticated users (hỗ trợ workspace role)
router.put('/read-all', authenticateToken, getWorkspaceRole, requireViewPermission, notificationController.markAllAsRead);

// Delete notification - All authenticated users (hỗ trợ workspace role)
router.delete('/:id', authenticateToken, getWorkspaceRole, requireViewPermission, notificationController.deleteNotification);

module.exports = router;
