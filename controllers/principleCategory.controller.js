// controllers/principleCategory.controller.js
const PrincipleCategory = require('../models/principleCategory.model');
const ErrorResponse = require('../utils/errorResponse');

/**
 * @desc    Get all categories for a principle
 * @route   GET /api/v1/principles/:principleId/categories
 * @access  Private
 */
exports.getPrincipleCategories = async (req, res, next) => {
  try {
    const categories = await PrincipleCategory.find({ 
      principle: req.params.principleId 
    }).populate('category', 'name');

    res.status(200).json({
      success: true,
      count: categories.length,
      data: categories
    });
  } catch (err) {
    next(err);
  }
};

/**
 * @desc    Add category to principle
 * @route   POST /api/v1/principles/:principleId/categories
 * @access  Private
 */
exports.addPrincipleCategory = async (req, res, next) => {
  try {
    req.body.principle = req.params.principleId;

    // Check if category already exists for this principle
    const existing = await PrincipleCategory.findOne({
      principle: req.params.principleId,
      category: req.body.category
    });

    if (existing) {
      return next(
        new ErrorResponse('This category is already assigned to this principle', 400)
      );
    }

    const category = await PrincipleCategory.create(req.body);

    // If this is set as primary, update other categories to non-primary
    if (req.body.isPrimary) {
      await PrincipleCategory.updateMany(
        { 
          principle: req.params.principleId, 
          _id: { $ne: category._id },
          isPrimary: true
        },
        { isPrimary: false }
      );
    }

    res.status(201).json({
      success: true,
      data: category
    });
  } catch (err) {
    next(err);
  }
};

/**
 * @desc    Update principle category
 * @route   PUT /api/v1/principles/:principleId/categories/:id
 * @access  Private
 */
exports.updatePrincipleCategory = async (req, res, next) => {
  try {
    let category = await PrincipleCategory.findById(req.params.id);

    if (!category) {
      return next(new ErrorResponse(`Category not found with id of ${req.params.id}`, 404));
    }

    // Make sure category belongs to principle
    if (category.principle.toString() !== req.params.principleId) {
      return next(new ErrorResponse(`Category not found for this principle`, 404));
    }

    // If setting as primary, update other categories
    if (req.body.isPrimary) {
      await PrincipleCategory.updateMany(
        { 
          principle: req.params.principleId, 
          _id: { $ne: req.params.id },
          isPrimary: true
        },
        { isPrimary: false }
      );
    }

    category = await PrincipleCategory.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
      runValidators: true
    });

    res.status(200).json({
      success: true,
      data: category
    });
  } catch (err) {
    next(err);
  }
};

/**
 * @desc    Delete principle category
 * @route   DELETE /api/v1/principles/:principleId/categories/:id
 * @access  Private
 */
exports.deletePrincipleCategory = async (req, res, next) => {
  try {
    const category = await PrincipleCategory.findById(req.params.id);

    if (!category) {
      return next(new ErrorResponse(`Category not found with id of ${req.params.id}`, 404));
    }

    // Make sure category belongs to principle
    if (category.principle.toString() !== req.params.principleId) {
      return next(new ErrorResponse(`Category not found for this principle`, 404));
    }

    await category.deleteOne();

    res.status(200).json({
      success: true,
      data: {}
    });
  } catch (err) {
    next(err);
  }
};

/**
 * @desc    Get primary categories for principles
 * @route   GET /api/v1/principles/primary-categories
 * @access  Private
 */
exports.getPrimaryCategories = async (req, res, next) => {
  try {
    const primaryCategories = await PrincipleCategory.find({
      isPrimary: true
    })
      .populate('principle', 'name')
      .populate('category', 'name');

    res.status(200).json({
      success: true,
      count: primaryCategories.length,
      data: primaryCategories
    });
  } catch (err) {
    next(err);
  }
};