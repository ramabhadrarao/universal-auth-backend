// controllers/categoryProduct.controller.js
const CategoryProduct = require('../models/categoryProduct.model');
const ErrorResponse = require('../utils/errorResponse');

/**
 * @desc    Get all category products
 * @route   GET /api/v1/category-products
 * @access  Private
 */
exports.getCategoryProducts = async (req, res, next) => {
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
    
    // Filter by product if provided
    if (req.query.product) {
      filter.product = req.query.product;
    }
    
    // Filter by featured status if provided
    if (req.query.isFeatured !== undefined) {
      filter.isFeatured = req.query.isFeatured === 'true';
    }

    const categoryProducts = await CategoryProduct.find(filter)
      .populate('category', 'name')
      .populate('subcategory', 'name')
      .populate('product', 'name price');

    res.status(200).json({
      success: true,
      count: categoryProducts.length,
      data: categoryProducts
    });
  } catch (err) {
    next(err);
  }
};

/**
 * @desc    Get single category product
 * @route   GET /api/v1/category-products/:id
 * @access  Private
 */
exports.getCategoryProduct = async (req, res, next) => {
  try {
    const categoryProduct = await CategoryProduct.findById(req.params.id)
      .populate('category', 'name')
      .populate('subcategory', 'name')
      .populate('product', 'name price');

    if (!categoryProduct) {
      return next(
        new ErrorResponse(`Category product not found with id of ${req.params.id}`, 404)
      );
    }

    res.status(200).json({
      success: true,
      data: categoryProduct
    });
  } catch (err) {
    next(err);
  }
};

/**
 * @desc    Create new category product
 * @route   POST /api/v1/category-products
 * @access  Private/Admin
 */
exports.createCategoryProduct = async (req, res, next) => {
  try {
    const categoryProduct = await CategoryProduct.create(req.body);

    res.status(201).json({
      success: true,
      data: categoryProduct
    });
  } catch (err) {
    next(err);
  }
};

/**
 * @desc    Update category product
 * @route   PUT /api/v1/category-products/:id
 * @access  Private/Admin
 */
exports.updateCategoryProduct = async (req, res, next) => {
  try {
    let categoryProduct = await CategoryProduct.findById(req.params.id);

    if (!categoryProduct) {
      return next(
        new ErrorResponse(`Category product not found with id of ${req.params.id}`, 404)
      );
    }

    categoryProduct = await CategoryProduct.findByIdAndUpdate(
      req.params.id,
      req.body,
      {
        new: true,
        runValidators: true
      }
    );

    res.status(200).json({
      success: true,
      data: categoryProduct
    });
  } catch (err) {
    next(err);
  }
};

/**
 * @desc    Delete category product
 * @route   DELETE /api/v1/category-products/:id
 * @access  Private/Admin
 */
exports.deleteCategoryProduct = async (req, res, next) => {
  try {
    const categoryProduct = await CategoryProduct.findById(req.params.id);

    if (!categoryProduct) {
      return next(
        new ErrorResponse(`Category product not found with id of ${req.params.id}`, 404)
      );
    }

    await categoryProduct.deleteOne();

    res.status(200).json({
      success: true,
      data: {}
    });
  } catch (err) {
    next(err);
  }
};

/**
 * @desc    Toggle featured status of a category product
 * @route   PUT /api/v1/category-products/:id/toggle-featured
 * @access  Private/Admin
 */
exports.toggleFeaturedStatus = async (req, res, next) => {
  try {
    let categoryProduct = await CategoryProduct.findById(req.params.id);

    if (!categoryProduct) {
      return next(
        new ErrorResponse(`Category product not found with id of ${req.params.id}`, 404)
      );
    }

    // Toggle the isFeatured status
    categoryProduct = await CategoryProduct.findByIdAndUpdate(
      req.params.id,
      { isFeatured: !categoryProduct.isFeatured },
      {
        new: true,
        runValidators: true
      }
    );

    res.status(200).json({
      success: true,
      data: categoryProduct
    });
  } catch (err) {
    next(err);
  }
};

/**
 * @desc    Update display order of a category product
 * @route   PUT /api/v1/category-products/:id/display-order
 * @access  Private/Admin
 */
exports.updateDisplayOrder = async (req, res, next) => {
  try {
    if (!req.body.displayOrder && req.body.displayOrder !== 0) {
      return next(
        new ErrorResponse('Please provide a display order', 400)
      );
    }

    let categoryProduct = await CategoryProduct.findById(req.params.id);

    if (!categoryProduct) {
      return next(
        new ErrorResponse(`Category product not found with id of ${req.params.id}`, 404)
      );
    }

    categoryProduct = await CategoryProduct.findByIdAndUpdate(
      req.params.id,
      { displayOrder: req.body.displayOrder },
      {
        new: true,
        runValidators: true
      }
    );

    res.status(200).json({
      success: true,
      data: categoryProduct
    });
  } catch (err) {
    next(err);
  }
};

/**
 * @desc    Get featured products in a category
 * @route   GET /api/v1/category-products/featured/:categoryId
 * @access  Private
 */
exports.getFeaturedProducts = async (req, res, next) => {
  try {
    const categoryProducts = await CategoryProduct.find({
      category: req.params.categoryId,
      isFeatured: true
    })
      .sort({ displayOrder: 1 })
      .populate('category', 'name')
      .populate('subcategory', 'name')
      .populate('product', 'name price');

    res.status(200).json({
      success: true,
      count: categoryProducts.length,
      data: categoryProducts
    });
  } catch (err) {
    next(err);
  }
};