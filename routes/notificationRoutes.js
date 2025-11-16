const express = require('express');
const router = express.Router();
const { 
    authenticateToken, 
    requireViewPermission
} = require('../middleware/auth');
const notificationController = require('../controllers/notificationController/notificationController');

// Get user's notifications - All authenticated users
router.get('/', authenticateToken, requireViewPermission, notificationController.getMyNotifications);

// Get unread count - All authenticated users
router.get('/unread-count', authenticateToken, requireViewPermission, notificationController.getUnreadCount);

// Mark notification as read - All authenticated users
router.put('/:id/read', authenticateToken, requireViewPermission, notificationController.markAsRead);

// Mark all as read - All authenticated users
router.put('/read-all', authenticateToken, requireViewPermission, notificationController.markAllAsRead);

// Delete notification - All authenticated users
router.delete('/:id', authenticateToken, requireViewPermission, notificationController.deleteNotification);

module.exports = router;
