// controllers/categoryProcedure.controller.js
const CategoryProcedure = require('../models/categoryProcedure.model');
const ErrorResponse = require('../utils/errorResponse');

/**
 * @desc    Get all category procedures
 * @route   GET /api/v1/category-procedures
 * @access  Private
 */
exports.getCategoryProcedures = async (req, res, next) => {
  try {
    // Add filtering options
    const filter = {};
    
    // Filter by category if provided
    if (req.query.category) {
      filter.category = req.query.category;
    }
    
    // Filter by subcategory if provided
    if (req.query.subcategory) {
      filter.subcategory = req.query.subcategory;
    }
    
    // Filter by complexity level if provided
    if (req.query.complexityLevel) {
      filter.complexityLevel = req.query.complexityLevel;
    }

    // Filter by duration (less than or equal to)
    if (req.query.maxDuration) {
      filter.estimatedDurationMinutes = { $lte: parseInt(req.query.maxDuration) };
    }

    const categoryProcedures = await CategoryProcedure.find(filter)
      .populate('category', 'name')
      .populate('subcategory', 'name');

    res.status(200).json({
      success: true,
      count: categoryProcedures.length,
      data: categoryProcedures
    });
  } catch (err) {
    next(err);
  }
};

/**
 * @desc    Get single category procedure
 * @route   GET /api/v1/category-procedures/:id
 * @access  Private
 */
exports.getCategoryProcedure = async (req, res, next) => {
  try {
    const categoryProcedure = await CategoryProcedure.findById(req.params.id)
      .populate('category', 'name')
      .populate('subcategory', 'name');

    if (!categoryProcedure) {
      return next(
        new ErrorResponse(`Category procedure not found with id of ${req.params.id}`, 404)
      );
    }

    res.status(200).json({
      success: true,
      data: categoryProcedure
    });
  } catch (err) {
    next(err);
  }
};

/**
 * @desc    Create new category procedure
 * @route   POST /api/v1/category-procedures
 * @access  Private/Admin
 */
exports.createCategoryProcedure = async (req, res, next) => {
  try {
    const categoryProcedure = await CategoryProcedure.create(req.body);

    res.status(201).json({
      success: true,
      data: categoryProcedure
    });
  } catch (err) {
    next(err);
  }
};

/**
 * @desc    Update category procedure
 * @route   PUT /api/v1/category-procedures/:id
 * @access  Private/Admin
 */
exports.updateCategoryProcedure = async (req, res, next) => {
  try {
    let categoryProcedure = await CategoryProcedure.findById(req.params.id);

    if (!categoryProcedure) {
      return next(
        new ErrorResponse(`Category procedure not found with id of ${req.params.id}`, 404)
      );
    }

    categoryProcedure = await CategoryProcedure.findByIdAndUpdate(
      req.params.id,
      req.body,
      {
        new: true,
        runValidators: true
      }
    );

    res.status(200).json({
      success: true,
      data: categoryProcedure
    });
  } catch (err) {
    next(err);
  }
};

/**
 * @desc    Delete category procedure
 * @route   DELETE /api/v1/category-procedures/:id
 * @access  Private/Admin
 */
exports.deleteCategoryProcedure = async (req, res, next) => {
  try {
    const categoryProcedure = await CategoryProcedure.findById(req.params.id);

    if (!categoryProcedure) {
      return next(
        new ErrorResponse(`Category procedure not found with id of ${req.params.id}`, 404)
      );
    }

    await categoryProcedure.deleteOne();

    res.status(200).json({
      success: true,
      data: {}
    });
  } catch (err) {
    next(err);
  }
};

/**
 * @desc    Get procedures by complexity level
 * @route   GET /api/v1/category-procedures/complexity/:level
 * @access  Private
 */
exports.getProceduresByComplexity = async (req, res, next) => {
  try {
    const categoryProcedures = await CategoryProcedure.find({
      complexityLevel: req.params.level
    })
      .populate('category', 'name')
      .populate('subcategory', 'name');

    res.status(200).json({
      success: true,
      count: categoryProcedures.length,
      data: categoryProcedures
    });
  } catch (err) {
    next(err);
  }
};

/**
 * @desc    Get procedures with duration less than or equal to specified minutes
 * @route   GET /api/v1/category-procedures/duration/:minutes
 * @access  Private
 */
exports.getProceduresByMaxDuration = async (req, res, next) => {
  try {
    const minutes = parseInt(req.params.minutes);
    
    if (isNaN(minutes)) {
      return next(
        new ErrorResponse('Duration must be a valid number', 400)
      );
    }
    
    const categoryProcedures = await CategoryProcedure.find({
      estimatedDurationMinutes: { $lte: minutes }
    })
      .populate('category', 'name')
      .populate('subcategory', 'name');

    res.status(200).json({
      success: true,
      count: categoryProcedures.length,
      data: categoryProcedures
    });
  } catch (err) {
    next(err);
  }
};