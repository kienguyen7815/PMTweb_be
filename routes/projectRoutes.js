const express = require('express');
const router = express.Router();
const { 
    authenticateToken, 
    requireLeaderOrAbove, 
    requireViewPermission, 
    requireEditPermission, 
    requireMemberManagement,
    requireViewMembers 
} = require('../middleware/auth');
const { getWorkspaceRole } = require('../middleware/workspaceAuth');
const projectController = require('../controllers/projectController/projectController');

router.get('/', authenticateToken, getWorkspaceRole, requireViewPermission, projectController.getAll);
router.get('/my/list', authenticateToken, getWorkspaceRole, requireViewPermission, projectController.getMyProjects);
router.get('/statuses/list', authenticateToken, getWorkspaceRole, requireViewPermission, projectController.getStatuses);
router.get('/users/list', authenticateToken, getWorkspaceRole, requireMemberManagement, projectController.getUsers);
router.get('/:id', authenticateToken, getWorkspaceRole, requireViewPermission, projectController.getById);
router.post('/', authenticateToken, getWorkspaceRole, requireEditPermission, projectController.create);
router.put('/:id', authenticateToken, getWorkspaceRole, requireEditPermission, projectController.update);
router.delete('/:id', authenticateToken, getWorkspaceRole, requireEditPermission, projectController.remove);
router.get('/:id/members', authenticateToken, getWorkspaceRole, requireViewMembers, projectController.getMembers);
router.post('/:id/members', authenticateToken, getWorkspaceRole, requireMemberManagement, projectController.addMember);
router.delete('/:projectId/members/:memberId', authenticateToken, getWorkspaceRole, requireMemberManagement, projectController.removeMember);


module.exports = router;
