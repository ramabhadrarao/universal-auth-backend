const express = require('express');
const router = express.Router();

const {
  getPermissions,
  getPermission,
  createPermission,
  updatePermission,
  deletePermission,
  getPermissionRoles,
  getResources,
  assignPermissionToUser,
  removePermissionFromUser,
  getUserPermissions
} = require('../controllers/permission.controller');

const { protect, hasPermission } = require('../middlewares/auth.middleware');

// Protect all routes
router.use(protect);

// Only users with 'permissions' resource permissions can access these routes
router.use(hasPermission('permissions', 'manage'));

// Get unique resources
router.get('/resources', getResources);

// Get user's direct permissions
router.get('/users/:userId', getUserPermissions);

// Regular CRUD routes
router.route('/')
  .get(getPermissions)
  .post(createPermission);

router.route('/:id')
  .get(getPermission)
  .put(updatePermission)
  .delete(deletePermission);

// Get roles with a specific permission
router.get('/:id/roles', getPermissionRoles);

// Assign/remove permissions directly to/from users (ABAC)
router.route('/:id/users/:userId')
  .post(assignPermissionToUser)
  .delete(removePermissionFromUser);

module.exports = router;
