// controllers/principleProduct.controller.js
const PrincipleProduct = require('../models/principleProduct.model');
const ErrorResponse = require('../utils/errorResponse');

/**
 * @desc    Get all products for a principle
 * @route   GET /api/v1/principles/:principleId/products
 * @access  Private
 */
exports.getPrincipleProducts = async (req, res, next) => {
  try {
    const products = await PrincipleProduct.find({ 
      principle: req.params.principleId 
    }).populate('product', 'name productCode dpValue mrp isActive');

    res.status(200).json({
      success: true,
      count: products.length,
      data: products
    });
  } catch (err) {
    next(err);
  }
};

/**
 * @desc    Get single principle product
 * @route   GET /api/v1/principles/:principleId/products/:id
 * @access  Private
 */
exports.getPrincipleProduct = async (req, res, next) => {
  try {
    const product = await PrincipleProduct.findById(req.params.id)
      .populate('product', 'name productCode dpValue mrp isActive');

    if (!product) {
      return next(new ErrorResponse(`Product not found with id of ${req.params.id}`, 404));
    }

    // Make sure product belongs to principle
    if (product.principle.toString() !== req.params.principleId) {
      return next(new ErrorResponse(`Product not found for this principle`, 404));
    }

    res.status(200).json({
      success: true,
      data: product
    });
  } catch (err) {
    next(err);
  }
};

/**
 * @desc    Add product to principle
 * @route   POST /api/v1/principles/:principleId/products
 * @access  Private
 */
exports.addPrincipleProduct = async (req, res, next) => {
  try {
    req.body.principle = req.params.principleId;

    // Check if product already exists for this principle
    const existing = await PrincipleProduct.findOne({
      principle: req.params.principleId,
      product: req.body.product
    });

    if (existing) {
      return next(
        new ErrorResponse('This product is already assigned to this principle', 400)
      );
    }

    const product = await PrincipleProduct.create(req.body);

    res.status(201).json({
      success: true,
      data: product
    });
  } catch (err) {
    next(err);
  }
};

/**
 * @desc    Update principle product
 * @route   PUT /api/v1/principles/:principleId/products/:id
 * @access  Private
 */
exports.updatePrincipleProduct = async (req, res, next) => {
  try {
    let product = await PrincipleProduct.findById(req.params.id);

    if (!product) {
      return next(new ErrorResponse(`Product not found with id of ${req.params.id}`, 404));
    }

    // Make sure product belongs to principle
    if (product.principle.toString() !== req.params.principleId) {
      return next(new ErrorResponse(`Product not found for this principle`, 404));
    }

    product = await PrincipleProduct.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
      runValidators: true
    });

    res.status(200).json({
      success: true,
      data: product
    });
  } catch (err) {
    next(err);
  }
};

/**
 * @desc    Delete principle product
 * @route   DELETE /api/v1/principles/:principleId/products/:id
 * @access  Private
 */
exports.deletePrincipleProduct = async (req, res, next) => {
  try {
    const product = await PrincipleProduct.findById(req.params.id);

    if (!product) {
      return next(new ErrorResponse(`Product not found with id of ${req.params.id}`, 404));
    }

    // Make sure product belongs to principle
    if (product.principle.toString() !== req.params.principleId) {
      return next(new ErrorResponse(`Product not found for this principle`, 404));
    }

    await product.deleteOne();

    res.status(200).json({
      success: true,
      data: {}
    });
  } catch (err) {
    next(err);
  }
};

/**
 * @desc    Toggle preferred status
 * @route   PUT /api/v1/principles/:principleId/products/:id/toggle-preferred
 * @access  Private
 */
exports.togglePreferredStatus = async (req, res, next) => {
  try {
    let product = await PrincipleProduct.findById(req.params.id);

    if (!product) {
      return next(new ErrorResponse(`Product not found with id of ${req.params.id}`, 404));
    }

    // Make sure product belongs to principle
    if (product.principle.toString() !== req.params.principleId) {
      return next(new ErrorResponse(`Product not found for this principle`, 404));
    }

    // Toggle the preferred status
    product = await PrincipleProduct.findByIdAndUpdate(
      req.params.id,
      { isPreferred: !product.isPreferred },
      { new: true }
    );

    res.status(200).json({
      success: true,
      data: product
    });
  } catch (err) {
    next(err);
  }
};

/**
 * @desc    Get principle product pricing view
 * @route   GET /api/v1/principles/product-pricing
 * @access  Private
 */
exports.getProductPricing = async (req, res, next) => {
  try {
    // This is similar to the SQL view, implemented as an aggregation
    const pricing = await PrincipleProduct.aggregate([
      {
        $lookup: {
          from: 'principles',
          localField: 'principle',
          foreignField: '_id',
          as: 'principleDetails'
        }
      },
      {
        $unwind: '$principleDetails'
      },
      {
        $lookup: {
          from: 'products',
          localField: 'product',
          foreignField: '_id',
          as: 'productDetails'
        }
      },
      {
        $unwind: '$productDetails'
      },
      {
        $match: {
          'principleDetails.isActive': true,
          'productDetails.isActive': true
        }
      },
      {
        $project: {
          principle: '$principle',
          principleName: '$principleDetails.name',
          product: '$product',
          productName: '$productDetails.name',
          principleProductCode: 1,
          principleProductName: 1,
          unitCost: 1,
          sellingPrice: '$productDetails.mrp',
          marginPercentage: {
            $round: [
              {
                $multiply: [
                  {
                    $divide: [
                      { $subtract: ['$productDetails.mrp', '$unitCost'] },
                      '$unitCost'
                    ]
                  },
                  100
                ]
              },
              2
            ]
          },
          minimumOrderQuantity: 1,
          leadTimeDays: 1,
          isPreferred: 1
        }
      },
      {
        $sort: {
          principleName: 1,
          productName: 1
        }
      }
    ]);

    res.status(200).json({
      success: true,
      count: pricing.length,
      data: pricing
    });
  } catch (err) {
    next(err);
  }
};

/**
 * @desc    Get products by lead time
 * @route   GET /api/v1/principles/products-by-lead-time
 * @access  Private
 */
exports.getProductsByLeadTime = async (req, res, next) => {
  try {
    // Get max lead time from query or default to 7 days
    const maxLeadTime = parseInt(req.query.maxDays) || 7;
    
    const products = await PrincipleProduct.find({
      leadTimeDays: { $lte: maxLeadTime }
    })
      .populate('principle', 'name')
      .populate('product', 'name productCode dpValue mrp')
      .sort('leadTimeDays');
    
    res.status(200).json({
      success: true,
      count: products.length,
      data: products
    });
  } catch (err) {
    next(err);
  }
};