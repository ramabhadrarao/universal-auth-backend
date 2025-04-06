const express = require('express');
const router = express.Router();

const {
  getUsers,
  getUser,
  createUser,
  updateUser,
  deleteUser,
  updateUserStatus,
  getUserStats
} = require('../controllers/user.controller');

const { protect, authorize, hasPermission } = require('../middlewares/auth.middleware');

// Protect all routes
router.use(protect);

// Admin-only routes
router.use(hasPermission('users', 'manage'));

// Get user stats
router.get('/stats', getUserStats);

// Regular CRUD routes
router.route('/')
  .get(getUsers)
  .post(createUser);

router.route('/:id')
  .get(getUser)
  .put(updateUser)
  .delete(deleteUser);

// Update user status
router.put('/:id/status', updateUserStatus);

module.exports = router;
