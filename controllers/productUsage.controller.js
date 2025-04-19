// controllers/productUsage.controller.js
const Product = require('../models/product.model');
const ProductInventory = require('../models/productInventory.model');
const ProductInventoryTransaction = require('../models/productInventoryTransaction.model');
const ProductUsage = require('../models/productUsage.model');
const ErrorResponse = require('../utils/errorResponse');
const mongoose = require('mongoose');

/**
 * @desc    Get all product usage
 * @route   GET /api/v1/product-usage
 * @access  Private
 */
exports.getAllProductUsage = async (req, res, next) => {
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
    let query = ProductUsage.find(JSON.parse(queryStr))
      .populate({
        path: 'product',
        select: 'name productCode principle',
        populate: { path: 'principle', select: 'name' }
      })
      .populate('case', 'caseNumber patientName')
      .populate('createdBy', 'name');

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
      query = query.sort('-usedDate');
    }

    // Pagination
    const page = parseInt(req.query.page, 10) || 1;
    const limit = parseInt(req.query.limit, 10) || 25;
    const startIndex = (page - 1) * limit;
    const endIndex = page * limit;
    const total = await ProductUsage.countDocuments(JSON.parse(queryStr));

    query = query.skip(startIndex).limit(limit);

    // Executing query
    const usages = await query;

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
      count: usages.length,
      pagination,
      total,
      data: usages
    });
  } catch (err) {
    next(err);
  }
};

/**
 * @desc    Get product usage by ID
 * @route   GET /api/v1/product-usage/:id
 * @access  Private
 */
exports.getProductUsage = async (req, res, next) => {
  try {
    const usage = await ProductUsage.findById(req.params.id)
      .populate({
        path: 'product',
        select: 'name productCode principle',
        populate: { path: 'principle', select: 'name' }
      })
      .populate('case', 'caseNumber patientName')
      .populate('createdBy', 'name');

    if (!usage) {
      return next(new ErrorResponse(`Product usage not found with id of ${req.params.id}`, 404));
    }

    res.status(200).json({
      success: true,
      data: usage
    });
  } catch (err) {
    next(err);
  }
};

/**
 * @desc    Record product usage
 * @route   POST /api/v1/product-usage
 * @access  Private
 */
exports.recordProductUsage = async (req, res, next) => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    // Check if product exists
    const product = await Product.findById(req.body.product);
    
    if (!product) {
      return next(new ErrorResponse(`Product not found with id of ${req.body.product}`, 404));
    }

    // Add user to request body
    req.body.createdBy = req.user.id;

    // Set dp_value from product if not provided
    if (!req.body.dpValue) {
      req.body.dpValue = product.dpValue;
    }

    // Set default selling price to MRP if not provided
    if (!req.body.sellingPrice) {
      req.body.sellingPrice = product.mrp;
    }

    // Check if batch number is provided and inventory exists
    let inventoryItem;
    if (req.body.batchNumber) {
      inventoryItem = await ProductInventory.findOne({
        product: req.body.product,
        batchNumber: req.body.batchNumber,
        status: 'Available'
      });

      if (!inventoryItem) {
        return next(new ErrorResponse(`No available inventory for product ${product.name} with batch ${req.body.batchNumber}`, 404));
      }

      // Check if there's enough quantity
      if (inventoryItem.quantity < req.body.quantity) {
        return next(new ErrorResponse(`Insufficient quantity available for batch ${req.body.batchNumber}. Available: ${inventoryItem.quantity}, Requested: ${req.body.quantity}`, 400));
      }
    } else {
      // If no batch specified, find any available inventory with sufficient quantity
      inventoryItem = await ProductInventory.findOne({
        product: req.body.product,
        status: 'Available',
        quantity: { $gte: req.body.quantity }
      }).sort('expiryDate'); // Use the batch expiring soonest

      if (!inventoryItem) {
        return next(new ErrorResponse(`No available inventory with sufficient quantity for product ${product.name}`, 404));
      }

      // Set the batch number from found inventory
      req.body.batchNumber = inventoryItem.batchNumber;
    }

    // Create usage record
    const usage = await ProductUsage.create([req.body], { session });

    // Update inventory quantity
    inventoryItem.quantity -= req.body.quantity;
    
    if (inventoryItem.quantity === 0) {
      // If inventory is depleted, mark as Used
      inventoryItem.status = 'Used';
    }
    
    await inventoryItem.save({ session });

    // Create inventory transaction record
    await ProductInventoryTransaction.create([{
      product: req.body.product,
      transactionType: 'Used',
      quantity: req.body.quantity,
      batchNumber: req.body.batchNumber,
      referenceId: req.body.case,
      referenceType: 'case',
      notes: `Used in case ${req.body.case}`,
      createdBy: req.user.id
    }], { session });

    await session.commitTransaction();
    session.endSession();

    res.status(201).json({
      success: true,
      data: usage[0]
    });
  } catch (err) {
    await session.abortTransaction();
    session.endSession();
    next(err);
  }
};

/**
 * @desc    Update product usage
 * @route   PUT /api/v1/product-usage/:id
 * @access  Private
 */
exports.updateProductUsage = async (req, res, next) => {
  try {
    const usage = await ProductUsage.findById(req.params.id);

    if (!usage) {
      return next(new ErrorResponse(`Product usage not found with id of ${req.params.id}`, 404));
    }

    // Only allow updating notes and selling price
    const allowedUpdates = {
      notes: req.body.notes,
      sellingPrice: req.body.sellingPrice
    };

    const updatedUsage = await ProductUsage.findByIdAndUpdate(
      req.params.id,
      allowedUpdates,
      {
        new: true,
        runValidators: true
      }
    );

    res.status(200).json({
      success: true,
      data: updatedUsage
    });
  } catch (err) {
    next(err);
  }
};

/**
 * @desc    Delete product usage (only if recently added)
 * @route   DELETE /api/v1/product-usage/:id
 * @access  Private (Admin)
 */
exports.deleteProductUsage = async (req, res, next) => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const usage = await ProductUsage.findById(req.params.id);

    if (!usage) {
      return next(new ErrorResponse(`Product usage not found with id of ${req.params.id}`, 404));
    }

    // Check if usage was recorded within the last 24 hours
    const hoursElapsed = (Date.now() - usage.createdAt) / (1000 * 60 * 60);
    if (hoursElapsed > 24 && !req.user.roles.includes('admin')) {
      return next(new ErrorResponse('Cannot delete product usage after 24 hours', 403));
    }

    // Find the inventory item for this batch
    const inventoryItem = await ProductInventory.findOne({
      product: usage.product,
      batchNumber: usage.batchNumber
    });

    if (inventoryItem) {
      // Return the quantity to inventory
      inventoryItem.quantity += usage.quantity;
      
      // If it was marked as Used and now has quantity, set back to Available
      if (inventoryItem.status === 'Used' && inventoryItem.quantity > 0) {
        inventoryItem.status = 'Available';
      }
      
      await inventoryItem.save({ session });
      
      // Create inventory transaction record for the return
      await ProductInventoryTransaction.create([{
        product: usage.product,
        transactionType: 'Returned',
        quantity: usage.quantity,
        batchNumber: usage.batchNumber,
        referenceId: usage.case,
        referenceType: 'case',
        notes: `Usage deleted from case ${usage.case}`,
        createdBy: req.user.id
      }], { session });
    } else {
      // Create new inventory item if it doesn't exist anymore
      const newInventory = await ProductInventory.create([{
        product: usage.product,
        batchNumber: usage.batchNumber,
        quantity: usage.quantity,
        dpValue: usage.dpValue,
        status: 'Available',
        updatedBy: req.user.id
      }], { session });
      
      // Create inventory transaction record
      await ProductInventoryTransaction.create([{
        product: usage.product,
        transactionType: 'Returned',
        quantity: usage.quantity,
        batchNumber: usage.batchNumber,
        locationTo: 'Storage', // Default location
        referenceId: usage.case,
        referenceType: 'case',
        notes: `Usage deleted from case ${usage.case}, inventory recreated`,
        createdBy: req.user.id
      }], { session });
    }

    // Delete the usage record
    await usage.deleteOne({ session });

    await session.commitTransaction();
    session.endSession();

    res.status(200).json({
      success: true,
      data: {}
    });
  } catch (err) {
    await session.abortTransaction();
    session.endSession();
    next(err);
  }
};

/**
 * @desc    Get usage statistics
 * @route   GET /api/v1/product-usage/statistics
 * @access  Private
 */
exports.getUsageStatistics = async (req, res, next) => {
  try {
    // Parse date range parameters
    const startDate = req.query.startDate ? new Date(req.query.startDate) : new Date(new Date().setMonth(new Date().getMonth() - 1));
    const endDate = req.query.endDate ? new Date(req.query.endDate) : new Date();
    
    // Adjust end date to include the full day
    endDate.setHours(23, 59, 59, 999);

    const stats = await ProductUsage.aggregate([
      {
        $match: {
          usedDate: { $gte: startDate, $lte: endDate }
        }
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
          productId: '$_id',
          productName: 1,
          productCode: 1,
          principleName: 1,
          caseCount: { $size: '$caseCount' },
          totalQuantityUsed: 1,
          totalRevenue: 1,
          totalProfit: 1,
          avgSellingPrice: { $round: ['$avgSellingPrice', 2] },
          lastUsedDate: 1
        }
      },
      {
        $sort: { totalRevenue: -1 }
      }
    ]);

    // Calculate summary statistics
    const totalRevenue = stats.reduce((sum, item) => sum + item.totalRevenue, 0);
    const totalProfit = stats.reduce((sum, item) => sum + item.totalProfit, 0);
    const totalQuantity = stats.reduce((sum, item) => sum + item.totalQuantityUsed, 0);
    const totalCases = new Set(
      (await ProductUsage.find({
        usedDate: { $gte: startDate, $lte: endDate }
      }).distinct('case'))
    ).size;

    res.status(200).json({
      success: true,
      count: stats.length,
      summary: {
        totalRevenue,
        totalProfit,
        totalQuantity,
        totalCases,
        profitMargin: totalRevenue > 0 ? (totalProfit / totalRevenue) * 100 : 0,
        dateRange: {
          startDate,
          endDate
        }
      },
      data: stats
    });
  } catch (err) {
    next(err);
  }
};