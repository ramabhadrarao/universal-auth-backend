// controllers/product.controller.js
const Product = require('../models/product.model');
const ProductInventory = require('../models/productInventory.model');
const ProductInventoryTransaction = require('../models/productInventoryTransaction.model');
const ErrorResponse = require('../utils/errorResponse');

/**
 * @desc    Get all products with pagination and filtering
 * @route   GET /api/v1/products
 * @access  Private
 */
exports.getProducts = async (req, res, next) => {
  try {
    // Copy req.query
    const reqQuery = { ...req.query };

    // Fields to exclude from matching
    const removeFields = ['select', 'sort', 'page', 'limit'];
    removeFields.forEach(param => delete reqQuery[param]);

    // Create query string
    let queryStr = JSON.stringify(reqQuery);

    // Create operators ($gt, $gte, etc)
    queryStr = queryStr.replace(/\b(gt|gte|lt|lte|in)\b/g, match => `$${match}`);

    // Default to only active products unless specifically queried
    if (!reqQuery.isActive) {
      queryStr = JSON.parse(queryStr);
      queryStr.isActive = true;
      queryStr = JSON.stringify(queryStr);
    }

    // Finding resource
    let query = Product.find(JSON.parse(queryStr)).populate('principle', 'name');

    // Select Fields
    if (req.query.select) {
      const fields = req.query.select.split(',').join(' ');
      query = query.select(fields);
    }

    // Sort
    if (req.query.sort) {
      const sortBy = req.query.sort.split(',').join(' ');
      query = query.sort(sortBy);
    } else {
      query = query.sort('-createdAt');
    }

    // Pagination
    const page = parseInt(req.query.page, 10) || 1;
    const limit = parseInt(req.query.limit, 10) || 25;
    const startIndex = (page - 1) * limit;
    const endIndex = page * limit;
    const total = await Product.countDocuments(JSON.parse(queryStr));

    query = query.skip(startIndex).limit(limit);

    // Executing query
    const products = await query;

    // Pagination result
    const pagination = {};

    if (endIndex < total) {
      pagination.next = {
        page: page + 1,
        limit
      };
    }

    if (startIndex > 0) {
      pagination.prev = {
        page: page - 1,
        limit
      };
    }

    res.status(200).json({
      success: true,
      count: products.length,
      pagination,
      total,
      data: products
    });
  } catch (err) {
    next(err);
  }
};

/**
 * @desc    Get single product
 * @route   GET /api/v1/products/:id
 * @access  Private
 */
exports.getProduct = async (req, res, next) => {
  try {
    const product = await Product.findById(req.params.id).populate('principle', 'name');

    if (!product) {
      return next(new ErrorResponse(`Product not found with id of ${req.params.id}`, 404));
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
 * @desc    Create new product
 * @route   POST /api/v1/products
 * @access  Private
 */
exports.createProduct = async (req, res, next) => {
  try {
    // Add user to request body
    req.body.createdBy = req.user.id;

    const product = await Product.create(req.body);

    // If inventory details provided, create initial inventory record
    if (req.body.initialInventory) {
      const inventory = await ProductInventory.create({
        product: product._id,
        batchNumber: product.batchNumber,
        quantity: req.body.initialInventory.quantity || product.quantity,
        dpValue: product.dpValue,
        expiryDate: product.expiryDate,
        location: req.body.initialInventory.location,
        receivedDate: new Date(),
        updatedBy: req.user.id
      });

      // Create inventory transaction record
      await ProductInventoryTransaction.create({
        product: product._id,
        transactionType: 'Initial Stock',
        quantity: inventory.quantity,
        batchNumber: inventory.batchNumber,
        locationTo: inventory.location,
        notes: 'Initial inventory for new product',
        createdBy: req.user.id
      });
    }

    res.status(201).json({
      success: true,
      data: product
    });
  } catch (err) {
    next(err);
  }
};

/**
 * @desc    Update product
 * @route   PUT /api/v1/products/:id
 * @access  Private
 */
exports.updateProduct = async (req, res, next) => {
  try {
    let product = await Product.findById(req.params.id);

    if (!product) {
      return next(new ErrorResponse(`Product not found with id of ${req.params.id}`, 404));
    }

    product = await Product.findByIdAndUpdate(req.params.id, req.body, {
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
 * @desc    Delete product (soft delete by setting isActive to false)
 * @route   DELETE /api/v1/products/:id
 * @access  Private (Admin)
 */
exports.deleteProduct = async (req, res, next) => {
  try {
    const product = await Product.findById(req.params.id);

    if (!product) {
      return next(new ErrorResponse(`Product not found with id of ${req.params.id}`, 404));
    }

    // Perform soft delete by setting isActive to false
    product.isActive = false;
    await product.save();

    res.status(200).json({
      success: true,
      data: {}
    });
  } catch (err) {
    next(err);
  }
};

/**
 * @desc    Get product inventory
 * @route   GET /api/v1/products/:id/inventory
 * @access  Private
 */
exports.getProductInventory = async (req, res, next) => {
  try {
    const inventory = await ProductInventory.find({ 
      product: req.params.id,
      status: 'Available'
    });

    res.status(200).json({
      success: true,
      count: inventory.length,
      data: inventory
    });
  } catch (err) {
    next(err);
  }
};

/**
 * @desc    Get low inventory products
 * @route   GET /api/v1/products/low-inventory
 * @access  Private
 */
exports.getLowInventoryProducts = async (req, res, next) => {
  try {
    // Aggregate to get products with low inventory
    const lowInventoryProducts = await Product.aggregate([
      {
        $match: { isActive: true }
      },
      {
        $lookup: {
          from: 'productinventories',
          localField: '_id',
          foreignField: 'product',
          as: 'inventories'
        }
      },
      {
        $addFields: {
          totalQuantity: {
            $sum: {
              $map: {
                input: {
                  $filter: {
                    input: '$inventories',
                    as: 'inventory',
                    cond: { $eq: ['$$inventory.status', 'Available'] }
                  }
                },
                as: 'inventory',
                in: '$$inventory.quantity'
              }
            }
          }
        }
      },
      {
        $match: {
          $expr: {
            $lt: ['$totalQuantity', '$quantity']
          }
        }
      },
      {
        $lookup: {
          from: 'principles',
          localField: 'principle',
          foreignField: '_id',
          as: 'principleDetails'
        }
      },
      {
        $addFields: {
          principleName: { $arrayElemAt: ['$principleDetails.name', 0] },
          inventoryStatus: {
            $cond: {
              if: { $lt: ['$totalQuantity', { $multiply: ['$quantity', 0.25] }] },
              then: 'Critical',
              else: {
                $cond: {
                  if: { $lt: ['$totalQuantity', { $multiply: ['$quantity', 0.5] }] },
                  then: 'Low',
                  else: 'Adequate'
                }
              }
            }
          }
        }
      },
      {
        $project: {
          _id: 1,
          name: 1,
          productCode: 1,
          principleName: 1,
          totalQuantity: 1,
          minRequiredQuantity: '$quantity',
          inventoryStatus: 1
        }
      }
    ]);

    res.status(200).json({
      success: true,
      count: lowInventoryProducts.length,
      data: lowInventoryProducts
    });
  } catch (err) {
    next(err);
  }
};

/**
 * @desc    Get products expiring soon
 * @route   GET /api/v1/products/expiring-soon
 * @access  Private
 */
exports.getExpiringProducts = async (req, res, next) => {
  try {
    const daysThreshold = parseInt(req.query.days) || 180;
    const expiryDate = new Date();
    expiryDate.setDate(expiryDate.getDate() + daysThreshold);

    const expiringProducts = await ProductInventory.find({
      status: 'Available',
      expiryDate: { $ne: null, $lt: expiryDate }
    })
    .sort('expiryDate')
    .populate({
      path: 'product',
      select: 'name productCode principle isActive',
      populate: { path: 'principle', select: 'name' }
    });

    // Filter out inactive products
    const filteredProducts = expiringProducts.filter(item => item.product.isActive);

    // Format the response
    const formattedProducts = filteredProducts.map(item => {
      const daysUntilExpiry = Math.ceil(
        (item.expiryDate - new Date()) / (1000 * 60 * 60 * 24)
      );
      
      return {
        productId: item.product._id,
        name: item.product.name,
        productCode: item.product.productCode,
        principleName: item.product.principle.name,
        batchNumber: item.batchNumber,
        quantity: item.quantity,
        expiryDate: item.expiryDate,
        daysUntilExpiry,
        location: item.location
      };
    });

    res.status(200).json({
      success: true,
      count: formattedProducts.length,
      data: formattedProducts
    });
  } catch (err) {
    next(err);
  }
};

/**
 * @desc    Get product usage statistics
 * @route   GET /api/v1/products/:id/usage-stats
 * @access  Private
 */
exports.getProductUsageStats = async (req, res, next) => {
  try {
    const stats = await ProductUsage.aggregate([
      {
        $match: { product: mongoose.Types.ObjectId(req.params.id) }
      },
      {
        $group: {
          _id: '$product',
          caseCount: { $addToSet: '$case' },
          totalQuantityUsed: { $sum: '$quantity' },
          totalRevenue: { $sum: { $multiply: ['$sellingPrice', '$quantity'] } },
          totalProfit: {
            $sum: {
              $multiply: [
                { $subtract: ['$sellingPrice', '$dpValue'] },
                '$quantity'
              ]
            }
          },
          avgSellingPrice: { $avg: '$sellingPrice' },
          lastUsedDate: { $max: '$usedDate' }
        }
      },
      {
        $project: {
          _id: 0,
          product: '$_id',
          caseCount: { $size: '$caseCount' },
          totalQuantityUsed: 1,
          totalRevenue: 1,
          totalProfit: 1,
          avgSellingPrice: { $round: ['$avgSellingPrice', 2] },
          lastUsedDate: 1
        }
      }
    ]);

    // Get product details
    const product = await Product.findById(req.params.id)
      .select('name productCode')
      .populate('principle', 'name');

    if (!product) {
      return next(new ErrorResponse(`Product not found with id of ${req.params.id}`, 404));
    }

    const response = stats.length > 0 
      ? {
          productId: req.params.id,
          name: product.name,
          productCode: product.productCode,
          principleName: product.principle.name,
          ...stats[0]
        }
      : {
          productId: req.params.id,
          name: product.name,
          productCode: product.productCode,
          principleName: product.principle.name,
          caseCount: 0,
          totalQuantityUsed: 0,
          totalRevenue: 0,
          totalProfit: 0,
          avgSellingPrice: 0,
          lastUsedDate: null
        };

    res.status(200).json({
      success: true,
      data: response
    });
  } catch (err) {
    next(err);
  }
};