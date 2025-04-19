// routes/productUsage.routes.js
const express = require('express');
const router = express.Router();

const {
  getAllProductUsage,
  getProductUsage,
  recordProductUsage,
  updateProductUsage,
  deleteProductUsage,
  getUsageStatistics
} = require('../controllers/productUsage.controller');

const { protect, authorize } = require('../middlewares/auth.middleware');
const validateRequest = require('../middlewares/validator.middleware');

// Protect all routes
router.use(protect);

router.route('/')
  .get(getAllProductUsage)
  .post(recordProductUsage);

router.route('/statistics')
  .get(getUsageStatistics);

router.route('/:id')
  .get(getProductUsage)
  .put(updateProductUsage)
  .delete(deleteProductUsage);

module.exports = router;