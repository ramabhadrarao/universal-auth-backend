// controllers/categorySpecification.controller.js
const CategorySpecification = require('../models/categorySpecification.model');
const ErrorResponse = require('../utils/errorResponse');

/**
 * @desc    Get all category specifications
 * @route   GET /api/v1/category-specifications
 * @access  Private
 */
exports.getCategorySpecifications = async (req, res, next) => {
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
    
    // Filter by spec type if provided
    if (req.query.specType) {
      filter.specType = req.query.specType;
    }
    
    // Filter by required status if provided
    if (req.query.isRequired !== undefined) {
      filter.isRequired = req.query.isRequired === 'true';
    }

    // Add sorting
    const sort = {};
    if (req.query.sortBy) {
      if (req.query.sortBy === 'displayOrder') {
        sort.displayOrder = 1; // Sort by display order if specified
      }
    } else {
      sort.displayOrder = 1; // Default sort by display order
    }

    const categorySpecifications = await CategorySpecification.find(filter)
      .sort(sort)
      .populate('category', 'name')
      .populate('subcategory', 'name');

    res.status(200).json({
      success: true,
      count: categorySpecifications.length,
      data: categorySpecifications
    });
  } catch (err) {
    next(err);
  }
};

/**
 * @desc    Get single category specification
 * @route   GET /api/v1/category-specifications/:id
 * @access  Private
 */
exports.getCategorySpecification = async (req, res, next) => {
  try {
    const categorySpecification = await CategorySpecification.findById(req.params.id)
      .populate('category', 'name')
      .populate('subcategory', 'name');

    if (!categorySpecification) {
      return next(
        new ErrorResponse(`Category specification not found with id of ${req.params.id}`, 404)
      );
    }

    res.status(200).json({
      success: true,
      data: categorySpecification
    });
  } catch (err) {
    next(err);
  }
};

/**
 * @desc    Create new category specification
 * @route   POST /api/v1/category-specifications
 * @access  Private/Admin
 */
exports.createCategorySpecification = async (req, res, next) => {
  try {
    const categorySpecification = await CategorySpecification.create(req.body);

    res.status(201).json({
      success: true,
      data: categorySpecification
    });
  } catch (err) {
    next(err);
  }
};

/**
 * @desc    Update category specification
 * @route   PUT /api/v1/category-specifications/:id
 * @access  Private/Admin
 */
exports.updateCategorySpecification = async (req, res, next) => {
  try {
    let categorySpecification = await CategorySpecification.findById(req.params.id);

    if (!categorySpecification) {
      return next(
        new ErrorResponse(`Category specification not found with id of ${req.params.id}`, 404)
      );
    }

    categorySpecification = await CategorySpecification.findByIdAndUpdate(
      req.params.id,
      req.body,
      {
        new: true,
        runValidators: true
      }
    );

    res.status(200).json({
      success: true,
      data: categorySpecification
    });
  } catch (err) {
    next(err);
  }
};

/**
 * @desc    Delete category specification
 * @route   DELETE /api/v1/category-specifications/:id
 * @access  Private/Admin
 */
exports.deleteCategorySpecification = async (req, res, next) => {
  try {
    const categorySpecification = await CategorySpecification.findById(req.params.id);

    if (!categorySpecification) {
      return next(
        new ErrorResponse(`Category specification not found with id of ${req.params.id}`, 404)
      );
    }

    await categorySpecification.deleteOne();

    res.status(200).json({
      success: true,
      data: {}
    });
  } catch (err) {
    next(err);
  }
};

/**
 * @desc    Toggle required status of a specification
 * @route   PUT /api/v1/category-specifications/:id/toggle-required
 * @access  Private/Admin
 */
exports.toggleRequiredStatus = async (req, res, next) => {
  try {
    let categorySpecification = await CategorySpecification.findById(req.params.id);

    if (!categorySpecification) {
      return next(
        new ErrorResponse(`Category specification not found with id of ${req.params.id}`, 404)
      );
    }

    // Toggle the isRequired status
    categorySpecification = await CategorySpecification.findByIdAndUpdate(
      req.params.id,
      { isRequired: !categorySpecification.isRequired },
      {
        new: true,
        runValidators: true
      }
    );

    res.status(200).json({
      success: true,
      data: categorySpecification
    });
  } catch (err) {
    next(err);
  }
};

/**
 * @desc    Update display order of a specification
 * @route   PUT /api/v1/category-specifications/:id/display-order
 * @access  Private/Admin
 */
exports.updateDisplayOrder = async (req, res, next) => {
  try {
    if (!req.body.displayOrder && req.body.displayOrder !== 0) {
      return next(
        new ErrorResponse('Please provide a display order', 400)
      );
    }

    let categorySpecification = await CategorySpecification.findById(req.params.id);

    if (!categorySpecification) {
      return next(
        new ErrorResponse(`Category specification not found with id of ${req.params.id}`, 404)
      );
    }

    categorySpecification = await CategorySpecification.findByIdAndUpdate(
      req.params.id,
      { displayOrder: req.body.displayOrder },
      {
        new: true,
        runValidators: true
      }
    );

    res.status(200).json({
      success: true,
      data: categorySpecification
    });
  } catch (err) {
    next(err);
  }
};

/**
 * @desc    Get specifications by type
 * @route   GET /api/v1/category-specifications/type/:specType
 * @access  Private
 */
exports.getSpecificationsByType = async (req, res, next) => {
  try {
    // Validate specType
    const validTypes = ['text', 'number', 'boolean', 'enum'];
    if (!validTypes.includes(req.params.specType)) {
      return next(
        new ErrorResponse(`Invalid specification type. Must be one of: ${validTypes.join(', ')}`, 400)
      );
    }

    const specifications = await CategorySpecification.find({
      specType: req.params.specType
    })
      .sort({ displayOrder: 1 })
      .populate('category', 'name')
      .populate('subcategory', 'name');

    res.status(200).json({
      success: true,
      count: specifications.length,
      data: specifications
    });
  } catch (err) {
    next(err);
  }
};

/**
 * @desc    Get required specifications for a category
 * @route   GET /api/v1/category-specifications/required/:categoryId
 * @access  Private
 */
exports.getRequiredSpecifications = async (req, res, next) => {
  try {
    const specifications = await CategorySpecification.find({
      category: req.params.categoryId,
      isRequired: true
    })
      .sort({ displayOrder: 1 })
      .populate('category', 'name')
      .populate('subcategory', 'name');

    res.status(200).json({
      success: true,
      count: specifications.length,
      data: specifications
    });
  } catch (err) {
    next(err);
  }
};