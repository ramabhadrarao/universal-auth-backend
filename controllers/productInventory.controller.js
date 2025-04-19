// controllers/productInventory.controller.js
const Product = require('../models/product.model');
const ProductInventory = require('../models/productInventory.model');
const ProductInventoryTransaction = require('../models/productInventoryTransaction.model');
const ErrorResponse = require('../utils/errorResponse');
const mongoose = require('mongoose');

/**
 * @desc    Get single inventory item
 * @route   GET /api/v1/inventory/:id
 * @access  Private
 */
exports.getInventoryItem = async (req, res, next) => {
  try {
    const inventory = await ProductInventory.findById(req.params.id)
      .populate({
        path: 'product',
        select: 'name productCode principle',
        populate: { path: 'principle', select: 'name' }
      });

    if (!inventory) {
      return next(new ErrorResponse(`Inventory item not found with id of ${req.params.id}`, 404));
    }

    res.status(200).json({
      success: true,
      data: inventory
    });
  } catch (err) {
    next(err);
  }
};

/**
 * @desc    Add inventory
 * @route   POST /api/v1/inventory
 * @access  Private
 */
exports.addInventory = async (req, res, next) => {
  try {
    // Check if product exists
    const product = await Product.findById(req.body.product);
    
    if (!product) {
      return next(new ErrorResponse(`Product not found with id of ${req.body.product}`, 404));
    }

    // Add user to request body
    req.body.updatedBy = req.user.id;

    // Create inventory record
    const inventory = await ProductInventory.create(req.body);

    // Create inventory transaction record
    await ProductInventoryTransaction.create({
      product: inventory.product,
      transactionType: 'Stock Increase',
      quantity: inventory.quantity,
      batchNumber: inventory.batchNumber,
      locationTo: inventory.location,
      notes: req.body.notes || 'Inventory added',
      createdBy: req.user.id
    });

    res.status(201).json({
      success: true,
      data: inventory
    });
  } catch (err) {
    next(err);
  }
};

/**
 * @desc    Update inventory
 * @route   PUT /api/v1/inventory/:id
 * @access  Private
 */
exports.updateInventory = async (req, res, next) => {
  try {
    let inventory = await ProductInventory.findById(req.params.id);

    if (!inventory) {
      return next(new ErrorResponse(`Inventory item not found with id of ${req.params.id}`, 404));
    }

    // Add user to request body
    req.body.updatedBy = req.user.id;

    // If quantity changed, add transaction record
    if (req.body.quantity && req.body.quantity !== inventory.quantity) {
      const transactionType = req.body.quantity > inventory.quantity 
        ? 'Stock Increase' 
        : 'Stock Decrease';
      
      await ProductInventoryTransaction.create({
        product: inventory.product,
        transactionType,
        quantity: Math.abs(req.body.quantity - inventory.quantity),
        batchNumber: inventory.batchNumber,
        locationFrom: inventory.location,
        locationTo: req.body.location || inventory.location,
        notes: req.body.notes || `Quantity updated from ${inventory.quantity} to ${req.body.quantity}`,
        createdBy: req.user.id
      });
    }

    // If location changed, add transfer transaction
    if (req.body.location && req.body.location !== inventory.location) {
      await ProductInventoryTransaction.create({
        product: inventory.product,
        transactionType: 'Transfer',
        quantity: req.body.quantity || inventory.quantity,
        batchNumber: inventory.batchNumber,
        locationFrom: inventory.location,
        locationTo: req.body.location,
        notes: req.body.notes || `Location transferred from ${inventory.location} to ${req.body.location}`,
        createdBy: req.user.id
      });
    }

    // Update the inventory
    inventory = await ProductInventory.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
      runValidators: true
    });

    res.status(200).json({
      success: true,
      data: inventory
    });
  } catch (err) {
    next(err);
  }
};

/**
 * @desc    Mark inventory as used, expired, or damaged
 * @route   PUT /api/v1/inventory/:id/status
 * @access  Private
 */
exports.updateInventoryStatus = async (req, res, next) => {
  try {
    const { status, notes, referenceId, referenceType } = req.body;
    
    // Validate status
    const validStatuses = ['Available', 'Reserved', 'Used', 'Expired', 'Damaged'];
    if (!validStatuses.includes(status)) {
      return next(new ErrorResponse(`Invalid status: ${status}. Must be one of: ${validStatuses.join(', ')}`, 400));
    }

    let inventory = await ProductInventory.findById(req.params.id);

    if (!inventory) {
      return next(new ErrorResponse(`Inventory item not found with id of ${req.params.id}`, 404));
    }

    // Don't allow status change if already in that status
    if (inventory.status === status) {
      return next(new ErrorResponse(`Inventory is already marked as ${status}`, 400));
    }

    // Create the transaction record
    await ProductInventoryTransaction.create({
      product: inventory.product,
      transactionType: status, // Used, Expired, Damaged
      quantity: inventory.quantity,
      batchNumber: inventory.batchNumber,
      locationFrom: inventory.location,
      notes: notes || `Status changed from ${inventory.status} to ${status}`,
      referenceId,
      referenceType,
      createdBy: req.user.id
    });

    // Update the inventory status
    inventory = await ProductInventory.findByIdAndUpdate(
      req.params.id,
      { status, updatedBy: req.user.id },
      { new: true }
    );

    res.status(200).json({
      success: true,
      data: inventory
    });
  } catch (err) {
    next(err);
  }
};

/**
 * @desc    Get inventory transactions
 * @route   GET /api/v1/inventory/transactions
 * @access  Private
 */
exports.getInventoryTransactions = async (req, res, next) => {
  try {
    // Copy req.query
    const reqQuery = { ...req.query };

    // Fields to exclude from matching
    const removeFields = ['select', 'sort', 'page', 'limit'];
    removeFields.forEach(param => delete reqQuery[param]);

    // Create query string
    let queryStr = JSON.stringify(reqQuery);

    // Create operators ($gt, $gte, etc)
    queryStr = queryStr.replace(/\b(gt|gte|lt|lte|in)\b/g, match => `${match}`);

    // Finding resource
    let query = ProductInventoryTransaction.find(JSON.parse(queryStr))
      .populate({
        path: 'product',
        select: 'name productCode'
      })
      .populate({
        path: 'createdBy',
        select: 'name'
      });

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
    const total = await ProductInventoryTransaction.countDocuments(JSON.parse(queryStr));

    query = query.skip(startIndex).limit(limit);

    // Executing query
    const transactions = await query;

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
      count: transactions.length,
      pagination,
      total,
      data: transactions
    });
  } catch (err) {
    next(err);
  }
};

/**
 * @desc    Get inventory summary
 * @route   GET /api/v1/inventory/summary
 * @access  Private
 */
exports.getInventorySummary = async (req, res, next) => {
  try {
    const summary = await ProductInventory.aggregate([
      {
        $match: { status: 'Available' }
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
        $match: { 'productDetails.isActive': true }
      },
      {
        $lookup: {
          from: 'principles',
          localField: 'productDetails.principle',
          foreignField: '_id',
          as: 'principleDetails'
        }
      },
      {
        $unwind: '$principleDetails'
      },
      {
        $group: {
          _id: '$product',
          productName: { $first: '$productDetails.name' },
          productCode: { $first: '$productDetails.productCode' },
          principleName: { $first: '$principleDetails.name' },
          totalQuantity: { $sum: '$quantity' },
          batchCount: { $addToSet: '$batchNumber' },
          earliestExpiry: { $min: '$expiryDate' },
          inventoryValue: { $sum: { $multiply: ['$quantity', '$dpValue'] } }
        }
      },
      {
        $project: {
          _id: 0,
          productId: '$_id',
          productName: 1,
          productCode: 1,
          principleName: 1,
          totalQuantity: 1,
          batchCount: { $size: '$batchCount' },
          earliestExpiry: 1,
          expiryStatus: {
            $cond: {
              if: {
                $lt: [
                  '$earliestExpiry',
                  { $add: [new Date(), 90 * 24 * 60 * 60 * 1000] } // 90 days
                ]
              },
              then: 'Warning',
              else: {
                $cond: {
                  if: {
                    $lt: [
                      '$earliestExpiry',
                      { $add: [new Date(), 180 * 24 * 60 * 60 * 1000] } // 180 days
                    ]
                  },
                  then: 'Monitor',
                  else: 'Good'
                }
              }
            }
          },
          inventoryValue: 1
        }
      },
      {
        $sort: { productName: 1 }
      }
    ]);

    res.status(200).json({
      success: true,
      count: summary.length,
      data: summary
    });
  } catch (err) {
    next(err);
  }
}; 
/*all inventory
 * @route   GET /api/v1/inventory
 * @access  Private
 */
exports.getAllInventory = async (req, res, next) => {
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

    // Finding resource
    let query = ProductInventory.find(JSON.parse(queryStr))
      .populate({
        path: 'product',
        select: 'name productCode principle',
        populate: { path: 'principle', select: 'name' }
      });

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
    const total = await ProductInventory.countDocuments(JSON.parse(queryStr));

    query = query.skip(startIndex).limit(limit);

    // Executing query
    const inventory = await query;

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
      count: inventory.length,
      pagination,
      total,
      data: inventory
    });
  } catch (err) {
    next(err);
  }
};


