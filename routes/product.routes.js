// routes/product.routes.js
const express = require('express');
const router = express.Router();

const {
  getProducts,
  getProduct,
  createProduct,
  updateProduct,
  deleteProduct,
  getProductInventory,
  getLowInventoryProducts,
  getExpiringProducts,
  getProductUsageStats
} = require('../controllers/product.controller');

const {
  getProductAlternatives,
  addProductAlternative,
  updateProductAlternative,
  deleteProductAlternative,
  getAlternativeFor
} = require('../controllers/productAlternative.controller');

const { protect, authorize } = require('../middlewares/auth.middleware');
const validateRequest = require('../middlewares/validator.middleware');

// Product routes
router.route('/')
  .get(getProducts)
  .post(protect, createProduct);

router.route('/low-inventory')
  .get(protect, getLowInventoryProducts);

router.route('/expiring-soon')
  .get(protect, getExpiringProducts);

router.route('/:id')
  .get(protect, getProduct)
  .put(protect, updateProduct)
  .delete(protect, authorize('admin'), deleteProduct);

router.route('/:id/inventory')
  .get(protect, getProductInventory);

router.route('/:id/usage-stats')
  .get(protect, getProductUsageStats);

// Product alternatives routes
router.route('/:productId/alternatives')
  .get(protect, getProductAlternatives)
  .post(protect, addProductAlternative);

router.route('/:productId/alternatives/:id')
  .put(protect, updateProductAlternative)
  .delete(protect, deleteProductAlternative);

router.route('/:productId/alternative-for')
  .get(protect, getAlternativeFor);

module.exports = router;