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
const { schemas } = require('../utils/validation');

// Protect all routes
router.use(protect);

// Product routes
router.route('/')
  .get(getProducts)
  .post(validateRequest(schemas.createProduct), createProduct);

router.route('/low-inventory')
  .get(getLowInventoryProducts);

router.route('/expiring-soon')
  .get(getExpiringProducts);

router.route('/:id')
  .get(getProduct)
  .put(validateRequest(schemas.updateProduct), updateProduct)
  .delete(authorize('admin'), deleteProduct);

router.route('/:id/inventory')
  .get(getProductInventory);

router.route('/:id/usage-stats')
  .get(getProductUsageStats);

// Product alternatives routes
router.route('/:productId/alternatives')
  .get(getProductAlternatives)
  .post(validateRequest(schemas.createProductAlternative), addProductAlternative);

router.route('/:productId/alternatives/:id')
  .put(validateRequest(schemas.updateProductAlternative), updateProductAlternative)
  .delete(deleteProductAlternative);

router.route('/:productId/alternative-for')
  .get(getAlternativeFor);

module.exports = router;