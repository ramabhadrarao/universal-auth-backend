// routes/categorySpecification.routes.js
const express = require('express');
const router = express.Router();

const {
  getCategorySpecifications,
  getCategorySpecification,
  createCategorySpecification,
  updateCategorySpecification,
  deleteCategorySpecification,
  toggleRequiredStatus,
  updateDisplayOrder,
  getSpecificationsByType,
  getRequiredSpecifications
} = require('../controllers/categorySpecification.controller');

const { protect, authorize } = require('../middlewares/auth.middleware');

// Protect all routes
router.use(protect);

// Public routes (protected but not admin-only)
router.route('/')
  .get(getCategorySpecifications);

router.route('/:id')
  .get(getCategorySpecification);

router.route('/type/:specType')
  .get(getSpecificationsByType);

router.route('/required/:categoryId')
  .get(getRequiredSpecifications);

// Admin only routes
router.route('/')
  .post(authorize('admin'), createCategorySpecification);

router.route('/:id')
  .put(authorize('admin'), updateCategorySpecification)
  .delete(authorize('admin'), deleteCategorySpecification);

router.route('/:id/toggle-required')
  .put(authorize('admin'), toggleRequiredStatus);

router.route('/:id/display-order')
  .put(authorize('admin'), updateDisplayOrder);

module.exports = router;