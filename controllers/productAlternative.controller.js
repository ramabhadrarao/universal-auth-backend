// controllers/productAlternative.controller.js
const Product = require('../models/product.model');
const ProductAlternative = require('../models/productAlternative.model');
const ErrorResponse = require('../utils/errorResponse');

/**
 * @desc    Get all alternatives for a product
 * @route   GET /api/v1/products/:productId/alternatives
 * @access  Private
 */
exports.getProductAlternatives = async (req, res, next) => {
  try {
    const alternatives = await ProductAlternative.find({ product: req.params.productId })
      .populate({
        path: 'alternativeProduct',
        select: 'name productCode dpValue mrp description isActive',
        populate: { path: 'principle', select: 'name' }
      });

    // Filter out inactive alternatives
    const activeAlternatives = alternatives.filter(
      item => item.alternativeProduct.isActive
    );

    res.status(200).json({
      success: true,
      count: activeAlternatives.length,
      data: activeAlternatives
    });
  } catch (err) {
    next(err);
  }
};

/**
 * @desc    Add alternative product
 * @route   POST /api/v1/products/:productId/alternatives
 * @access  Private
 */
exports.addProductAlternative = async (req, res, next) => {
  try {
    // Check if primary product exists
    const product = await Product.findById(req.params.productId);
    
    if (!product) {
      return next(new ErrorResponse(`Product not found with id of ${req.params.productId}`, 404));
    }

    // Check if alternative product exists
    const altProduct = await Product.findById(req.body.alternativeProduct);
    
    if (!altProduct) {
      return next(new ErrorResponse(`Alternative product not found with id of ${req.body.alternativeProduct}`, 404));
    }

    // Check if they're the same product
    if (req.params.productId === req.body.alternativeProduct) {
      return next(new ErrorResponse(`Product cannot be an alternative to itself`, 400));
    }

    // Check if this alternative already exists
    const existingAlt = await ProductAlternative.findOne({
      product: req.params.productId,
      alternativeProduct: req.body.alternativeProduct
    });

    if (existingAlt) {
      return next(new ErrorResponse(`This alternative product relationship already exists`, 400));
    }

    // Calculate price difference if not provided
    if (!req.body.priceDifference) {
      req.body.priceDifference = altProduct.dpValue - product.dpValue;
    }

    // Create the alternative relationship
    const alternative = await ProductAlternative.create({
      product: req.params.productId,
      alternativeProduct: req.body.alternativeProduct,
      compatibilityLevel: req.body.compatibilityLevel,
      priceDifference: req.body.priceDifference,
      notes: req.body.notes
    });

    // Also create the reverse relationship if requested
    if (req.body.createReverse) {
      await ProductAlternative.create({
        product: req.body.alternativeProduct,
        alternativeProduct: req.params.productId,
        compatibilityLevel: req.body.compatibilityLevel,
        priceDifference: -req.body.priceDifference, // Inverse price difference
        notes: req.body.notes
      });
    }

    res.status(201).json({
      success: true,
      data: alternative
    });
  } catch (err) {
    next(err);
  }
};

/**
 * @desc    Update alternative product
 * @route   PUT /api/v1/products/:productId/alternatives/:id
 * @access  Private
 */
exports.updateProductAlternative = async (req, res, next) => {
  try {
    let alternative = await ProductAlternative.findById(req.params.id);

    if (!alternative) {
      return next(new ErrorResponse(`Alternative not found with id of ${req.params.id}`, 404));
    }

    // Make sure user is updating alternative for the correct product
    if (alternative.product.toString() !== req.params.productId) {
      return next(new ErrorResponse(`Alternative with id ${req.params.id} does not belong to product ${req.params.productId}`, 400));
    }

    // Update the alternative
    alternative = await ProductAlternative.findByIdAndUpdate(
      req.params.id,
      req.body,
      {
        new: true,
        runValidators: true
      }
    );

    res.status(200).json({
      success: true,
      data: alternative
    });
  } catch (err) {
    next(err);
  }
};

/**
 * @desc    Delete alternative product
 * @route   DELETE /api/v1/products/:productId/alternatives/:id
 * @access  Private
 */
exports.deleteProductAlternative = async (req, res, next) => {
  try {
    const alternative = await ProductAlternative.findById(req.params.id);

    if (!alternative) {
      return next(new ErrorResponse(`Alternative not found with id of ${req.params.id}`, 404));
    }

    // Make sure user is deleting alternative for the correct product
    if (alternative.product.toString() !== req.params.productId) {
      return next(new ErrorResponse(`Alternative with id ${req.params.id} does not belong to product ${req.params.productId}`, 400));
    }

    // Check if we should also delete the reverse relationship
    if (req.query.deleteReverse === 'true') {
      await ProductAlternative.deleteOne({
        product: alternative.alternativeProduct,
        alternativeProduct: alternative.product
      });
    }

    await alternative.deleteOne();

    res.status(200).json({
      success: true,
      data: {}
    });
  } catch (err) {
    next(err);
  }
};

/**
 * @desc    Get products that have this product as an alternative
 * @route   GET /api/v1/products/:productId/alternative-for
 * @access  Private
 */
exports.getAlternativeFor = async (req, res, next) => {
  try {
    const alternatives = await ProductAlternative.find({ 
      alternativeProduct: req.params.productId 
    })
    .populate({
      path: 'product',
      select: 'name productCode dpValue mrp description isActive',
      populate: { path: 'principle', select: 'name' }
    });

    // Filter out inactive products
    const activeAlternatives = alternatives.filter(
      item => item.product.isActive
    );

    res.status(200).json({
      success: true,
      count: activeAlternatives.length,
      data: activeAlternatives
    });
  } catch (err) {
    next(err);
  }
};