// controllers/categoryApplication.controller.js
const CategoryApplication = require('../models/categoryApplication.model');
const ErrorResponse = require('../utils/errorResponse');

/**
 * @desc    Get all category applications
 * @route   GET /api/v1/category-applications
 * @access  Private
 */
exports.getCategoryApplications = async (req, res, next) => {
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
    
    // Filter by active status if provided
    if (req.query.isActive !== undefined) {
      filter.isActive = req.query.isActive === 'true';
    }

    const categoryApplications = await CategoryApplication.find(filter)
      .populate('category', 'name')
      .populate('subcategory', 'name');

    res.status(200).json({
      success: true,
      count: categoryApplications.length,
      data: categoryApplications
    });
  } catch (err) {
    next(err);
  }
};

/**
 * @desc    Get single category application
 * @route   GET /api/v1/category-applications/:id
 * @access  Private
 */
exports.getCategoryApplication = async (req, res, next) => {
  try {
    const categoryApplication = await CategoryApplication.findById(req.params.id)
      .populate('category', 'name')
      .populate('subcategory', 'name');

    if (!categoryApplication) {
      return next(
        new ErrorResponse(`Category application not found with id of ${req.params.id}`, 404)
      );
    }

    res.status(200).json({
      success: true,
      data: categoryApplication
    });
  } catch (err) {
    next(err);
  }
};

/**
 * @desc    Create new category application
 * @route   POST /api/v1/category-applications
 * @access  Private/Admin
 */
exports.createCategoryApplication = async (req, res, next) => {
  try {
    const categoryApplication = await CategoryApplication.create(req.body);

    res.status(201).json({
      success: true,
      data: categoryApplication
    });
  } catch (err) {
    next(err);
  }
};

/**
 * @desc    Update category application
 * @route   PUT /api/v1/category-applications/:id
 * @access  Private/Admin
 */
exports.updateCategoryApplication = async (req, res, next) => {
  try {
    let categoryApplication = await CategoryApplication.findById(req.params.id);

    if (!categoryApplication) {
      return next(
        new ErrorResponse(`Category application not found with id of ${req.params.id}`, 404)
      );
    }

    categoryApplication = await CategoryApplication.findByIdAndUpdate(
      req.params.id,
      req.body,
      {
        new: true,
        runValidators: true
      }
    );

    res.status(200).json({
      success: true,
      data: categoryApplication
    });
  } catch (err) {
    next(err);
  }
};

/**
 * @desc    Delete category application
 * @route   DELETE /api/v1/category-applications/:id
 * @access  Private/Admin
 */
exports.deleteCategoryApplication = async (req, res, next) => {
  try {
    const categoryApplication = await CategoryApplication.findById(req.params.id);

    if (!categoryApplication) {
      return next(
        new ErrorResponse(`Category application not found with id of ${req.params.id}`, 404)
      );
    }

    await categoryApplication.deleteOne();

    res.status(200).json({
      success: true,
      data: {}
    });
  } catch (err) {
    next(err);
  }
};

/**
 * @desc    Toggle category application active status
 * @route   PUT /api/v1/category-applications/:id/toggle-status
 * @access  Private/Admin
 */
exports.toggleCategoryApplicationStatus = async (req, res, next) => {
  try {
    let categoryApplication = await CategoryApplication.findById(req.params.id);

    if (!categoryApplication) {
      return next(
        new ErrorResponse(`Category application not found with id of ${req.params.id}`, 404)
      );
    }

    // Toggle the isActive status
    categoryApplication = await CategoryApplication.findByIdAndUpdate(
      req.params.id,
      { isActive: !categoryApplication.isActive },
      {
        new: true,
        runValidators: true
      }
    );

    res.status(200).json({
      success: true,
      data: categoryApplication
    });
  } catch (err) {
    next(err);
  }
};