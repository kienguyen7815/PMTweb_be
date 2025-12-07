const express = require('express');
const router = express.Router();
const adminController = require('../controllers/adminController/adminController');
const { authenticateToken, requireAdmin } = require('../middleware/auth');

// All admin routes require authentication and admin role
router.use(authenticateToken);
router.use(requireAdmin);

// ========== DASHBOARD ==========
router.get('/dashboard/stats', adminController.getDashboardStats);

// ========== USER MANAGEMENT ==========
router.get('/users', adminController.getAllUsers);
router.get('/users/:id', adminController.getUserDetail);
router.put('/users/:id/role', adminController.updateUserRole);
router.put('/users/:id/status', adminController.toggleUserStatus);
router.delete('/users/:id', adminController.deleteUser);

// ========== WORKSPACE MONITORING ==========
router.get('/workspaces', adminController.getAllWorkspaces);
router.get('/workspaces/:id', adminController.getWorkspaceDetail);
router.delete('/workspaces/:id', adminController.deleteWorkspace);

// ========== ACTIVITY LOGS ==========
router.get('/logs', adminController.getActivityLogs);
router.get('/logs/stats', adminController.getActivityStats);

// ========== SYSTEM SETTINGS ==========
router.get('/system/info', adminController.getSystemInfo);

module.exports = router;

