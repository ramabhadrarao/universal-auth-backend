// routes/categoryProduct.routes.js
const express = require('express');
const router = express.Router();

const {
  getCategoryProducts,
  getCategoryProduct,
  createCategoryProduct,
  updateCategoryProduct,
  deleteCategoryProduct,
  toggleFeaturedStatus,
  updateDisplayOrder,
  getFeaturedProducts
} = require('../controllers/categoryProduct.controller');

const { protect, authorize } = require('../middlewares/auth.middleware');

// Protect all routes
router.use(protect);

// Public routes (protected but not admin-only)
router.route('/')
  .get(getCategoryProducts);

router.route('/:id')
  .get(getCategoryProduct);

router.route('/featured/:categoryId')
  .get(getFeaturedProducts);

// Admin only routes
router.route('/')
  .post(authorize('admin'), createCategoryProduct);

router.route('/:id')
  .put(authorize('admin'), updateCategoryProduct)
  .delete(authorize('admin'), deleteCategoryProduct);

router.route('/:id/toggle-featured')
  .put(authorize('admin'), toggleFeaturedStatus);

router.route('/:id/display-order')
  .put(authorize('admin'), updateDisplayOrder);

module.exports = router;