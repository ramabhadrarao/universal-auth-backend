// routes/categoryProcedure.routes.js
const express = require('express');
const router = express.Router();

const {
  getCategoryProcedures,
  getCategoryProcedure,
  createCategoryProcedure,
  updateCategoryProcedure,
  deleteCategoryProcedure,
  getProceduresByComplexity,
  getProceduresByMaxDuration
} = require('../controllers/categoryProcedure.controller');

const { protect, authorize } = require('../middlewares/auth.middleware');

// Protect all routes
router.use(protect);

// Public routes (protected but not admin-only)
router.route('/')
  .get(getCategoryProcedures);

router.route('/:id')
  .get(getCategoryProcedure);

router.route('/complexity/:level')
  .get(getProceduresByComplexity);

router.route('/duration/:minutes')
  .get(getProceduresByMaxDuration);

// Admin only routes
router.route('/')
  .post(authorize('admin'), createCategoryProcedure);

router.route('/:id')
  .put(authorize('admin'), updateCategoryProcedure)
  .delete(authorize('admin'), deleteCategoryProcedure);

module.exports = router;