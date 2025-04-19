// routes/productInventory.routes.js
const express = require('express');
const router = express.Router();

const {
  getAllInventory,
  getInventoryItem,
  addInventory,
  updateInventory,
  updateInventoryStatus,
  getInventoryTransactions,
  getInventorySummary
} = require('../controllers/productInventory.controller');

const { protect, authorize } = require('../middlewares/auth.middleware');
const validateRequest = require('../middlewares/validator.middleware');

// Protect all routes
router.use(protect);

router.route('/')
  .get(getAllInventory)
  .post(addInventory);

router.route('/summary')
  .get(getInventorySummary);

router.route('/transactions')
  .get(getInventoryTransactions);

router.route('/:id')
  .get(getInventoryItem)
  .put(updateInventory);

router.route('/:id/status')
  .put(updateInventoryStatus);

module.exports = router;