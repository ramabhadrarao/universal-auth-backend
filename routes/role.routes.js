const express = require('express');
const router = express.Router();

const {
  getRoles,
  getRole,
  createRole,
  updateRole,
  deleteRole,
  getRoleUsers,
  addPermissionsToRole,
  removePermissionsFromRole
} = require('../controllers/role.controller');

const { protect, hasPermission } = require('../middlewares/auth.middleware');

// Protect all routes
router.use(protect);

// Only users with 'roles' resource permissions can access these routes
router.use(hasPermission('roles', 'manage'));

// Regular CRUD routes
router.route('/')
  .get(getRoles)
  .post(createRole);

router.route('/:id')
  .get(getRole)
  .put(updateRole)
  .delete(deleteRole);

// Get users with a specific role
router.get('/:id/users', getRoleUsers);

// Manage role permissions
router.route('/:id/permissions')
  .post(addPermissionsToRole)
  .delete(removePermissionsFromRole);

module.exports = router;
