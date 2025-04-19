// routes/categoryApplication.routes.js
const express = require('express');
const router = express.Router();

const {
  getCategoryApplications,
  getCategoryApplication,
  createCategoryApplication,
  updateCategoryApplication,
  deleteCategoryApplication,
  toggleCategoryApplicationStatus
} = require('../controllers/categoryApplication.controller');

const { protect, authorize } = require('../middlewares/auth.middleware');

// Protect all routes
router.use(protect);

// Public routes (protected but not admin-only)
router.route('/')
  .get(getCategoryApplications);

router.route('/:id')
  .get(getCategoryApplication);

// Admin only routes
router.route('/')
  .post(authorize('admin'), createCategoryApplication);

router.route('/:id')
  .put(authorize('admin'), updateCategoryApplication)
  .delete(authorize('admin'), deleteCategoryApplication);

router.route('/:id/toggle-status')
  .put(authorize('admin'), toggleCategoryApplicationStatus);

module.exports = router;