// controllers/case.controller.js
const Case = require('../models/case.model');
const CaseProduct = require('../models/caseProduct.model');
const CaseNote = require('../models/caseNote.model');
const CaseStatusHistory = require('../models/caseStatusHistory.model');
const CaseDocument = require('../models/caseDocument.model');
const CaseFollowup = require('../models/caseFollowup.model');
const ProductInventory = require('../models/productInventory.model');
const ProductInventoryTransaction = require('../models/productInventoryTransaction.model');
const ProductUsage = require('../models/productUsage.model');
const ErrorResponse = require('../utils/errorResponse');
const mongoose = require('mongoose');
const { logger } = require('../middlewares/logger.middleware');

/**
 * @desc    Get all cases with pagination and filtering
 * @route   GET /api/v1/cases
 * @access  Private
 */
exports.getCases = async (req, res, next) => {
  try {
    // Copy req.query
    const reqQuery = { ...req.query };

    // Fields to exclude from matching
    const removeFields = ['select', 'sort', 'page', 'limit'];
    removeFields.forEach(param => delete reqQuery[param]);

    // Create query string and handle advanced filtering
    let queryStr = JSON.stringify(reqQuery);
    queryStr = queryStr.replace(/\b(gt|gte|lt|lte|in)\b/g, match => `$${match}`);
    
    // Build the query
    let query = Case.find(JSON.parse(queryStr))
      .populate('hospital', 'name')
      .populate('doctor', 'name')
      .populate('principle', 'name')
      .populate('category', 'name')
      .populate('subcategory', 'name')
      .populate('createdBy', 'name');

    // Select specific fields
    if (req.query.select) {
      const fields = req.query.select.split(',').join(' ');
      query = query.select(fields);
    }

    // Sort results
    if (req.query.sort) {
      const sortBy = req.query.sort.split(',').join(' ');
      query = query.sort(sortBy);
    } else {
      query = query.sort('-surgeryDate'); // Default sort
    }

    // Pagination
    const page = parseInt(req.query.page, 10) || 1;
    const limit = parseInt(req.query.limit, 10) || 10;
    const startIndex = (page - 1) * limit;
    const endIndex = page * limit;
    const total = await Case.countDocuments(JSON.parse(queryStr));

    query = query.skip(startIndex).limit(limit);

    // Execute query
    const cases = await query;

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
      count: cases.length,
      pagination,
      total,
      data: cases
    });
  } catch (err) {
    next(err);
  }
};

/**
 * @desc    Get single case
 * @route   GET /api/v1/cases/:id
 * @access  Private
 */
exports.getCase = async (req, res, next) => {
  try {
    const caseItem = await Case.findById(req.params.id)
      .populate('hospital', 'name')
      .populate('doctor', 'name')
      .populate('principle', 'name')
      .populate('category', 'name')
      .populate('subcategory', 'name')
      .populate('createdBy', 'name');

    if (!caseItem) {
      return next(new ErrorResponse(`Case not found with id of ${req.params.id}`, 404));
    }

    res.status(200).json({
      success: true,
      data: caseItem
    });
  } catch (err) {
    next(err);
  }
};

/**
 * @desc    Create new case
 * @route   POST /api/v1/cases
 * @access  Private
 */
exports.createCase = async (req, res, next) => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    // Add user to request body as creator
    req.body.createdBy = req.user.id;

    // Generate case number if not provided
    if (!req.body.caseNumber) {
      const dateStr = new Date().toISOString().slice(0, 10).replace(/-/g, '');
      const randomStr = Math.random().toString(36).substring(2, 7).toUpperCase();
      req.body.caseNumber = `CASE-${dateStr}-${randomStr}`;
    }

    // Create case
    const caseItem = await Case.create([req.body], { session });

    // If products are provided, add them to the case
    if (req.body.products && Array.isArray(req.body.products) && req.body.products.length > 0) {
      const caseProducts = [];
      
      for (const productData of req.body.products) {
        // Create case product
        const caseProduct = await CaseProduct.create([{
          case: caseItem[0]._id,
          product: productData.product,
          quantity: productData.quantity || 1,
          unit_price: productData.unit_price,
          dp_value: productData.dp_value,
          batch_number: productData.batch_number,
          used_from_inventory: productData.used_from_inventory !== false
        }], { session });
        
        caseProducts.push(caseProduct[0]);
        
        // If used from inventory, update inventory and create usage record
        if (productData.used_from_inventory !== false) {
          // Find inventory item by batch if provided
          const inventoryQuery = { product: productData.product };
          if (productData.batch_number) {
            inventoryQuery.batchNumber = productData.batch_number;
          }
          inventoryQuery.status = 'Available';
          
          const inventoryItem = await ProductInventory.findOne(inventoryQuery)
            .sort({ expiryDate: 1 }) // Use oldest inventory first
            .session(session);
          
          if (!inventoryItem) {
            // Rollback transaction if inventory not found
            await session.abortTransaction();
            session.endSession();
            return next(new ErrorResponse(`No available inventory found for product in case`, 400));
          }
          
          // Check if there's enough quantity
          if (inventoryItem.quantity < productData.quantity) {
            await session.abortTransaction();
            session.endSession();
            return next(new ErrorResponse(`Insufficient quantity in inventory for product. Available: ${inventoryItem.quantity}, Required: ${productData.quantity}`, 400));
          }
          
          // Update inventory
          inventoryItem.quantity -= productData.quantity;
          if (inventoryItem.quantity === 0) {
            inventoryItem.status = 'Used';
          }
          await inventoryItem.save({ session });
          
          // Create inventory transaction record
          await ProductInventoryTransaction.create([{
            product: productData.product,
            transactionType: 'Used',
            quantity: productData.quantity,
            batchNumber: inventoryItem.batchNumber,
            referenceId: caseItem[0]._id,
            referenceType: 'case',
            notes: `Used in case ${req.body.caseNumber}`,
            createdBy: req.user.id
          }], { session });
          
          // Create product usage record
          await ProductUsage.create([{
            product: productData.product,
            case: caseItem[0]._id,
            quantity: productData.quantity,
            batchNumber: inventoryItem.batchNumber,
            usedDate: req.body.surgeryDate || new Date(),
            dpValue: productData.dp_value || inventoryItem.dpValue,
            sellingPrice: productData.unit_price,
            createdBy: req.user.id
          }], { session });
        }
      }
    }

    // If initial note is provided, add it
    if (req.body.note) {
      await CaseNote.create([{
        case: caseItem[0]._id,
        noteText: req.body.note,
        createdBy: req.user.id
      }], { session });
    }

    // Create initial status history entry
    await CaseStatusHistory.create([{
      case: caseItem[0]._id,
      newStatus: req.body.status || 'Active',
      changedBy: req.user.id,
      notes: 'Case created'
    }], { session });

    // Commit transaction
    await session.commitTransaction();
    session.endSession();

    // Return created case
    const fullCase = await Case.findById(caseItem[0]._id)
      .populate('hospital', 'name')
      .populate('doctor', 'name')
      .populate('principle', 'name')
      .populate('category', 'name')
      .populate('subcategory', 'name')
      .populate('createdBy', 'name');

    res.status(201).json({
      success: true,
      data: fullCase
    });
  } catch (err) {
    await session.abortTransaction();
    session.endSession();
    next(err);
  }
};

/**
 * @desc    Update case
 * @route   PUT /api/v1/cases/:id
 * @access  Private
 */
exports.updateCase = async (req, res, next) => {
  try {
    let caseItem = await Case.findById(req.params.id);

    if (!caseItem) {
      return next(new ErrorResponse(`Case not found with id of ${req.params.id}`, 404));
    }

    // Store old status to check if it changed
    const oldStatus = caseItem.status;

    // Update case
    caseItem = await Case.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
      runValidators: true
    }).populate('hospital', 'name')
      .populate('doctor', 'name')
      .populate('principle', 'name')
      .populate('category', 'name')
      .populate('subcategory', 'name')
      .populate('createdBy', 'name');

    // If status changed, add to history
    if (req.body.status && oldStatus !== req.body.status) {
      await CaseStatusHistory.create({
        case: caseItem._id,
        previousStatus: oldStatus,
        newStatus: req.body.status,
        notes: req.body.statusNote || 'Status updated',
        changedBy: req.user.id
      });
    }

    // If note provided, add it
    if (req.body.note) {
      await CaseNote.create({
        case: caseItem._id,
        noteText: req.body.note,
        createdBy: req.user.id
      });
    }

    res.status(200).json({
      success: true,
      data: caseItem
    });
  } catch (err) {
    next(err);
  }
};

/**
 * @desc    Delete case
 * @route   DELETE /api/v1/cases/:id
 * @access  Private/Admin
 */
exports.deleteCase = async (req, res, next) => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const caseItem = await Case.findById(req.params.id);

    if (!caseItem) {
      return next(new ErrorResponse(`Case not found with id of ${req.params.id}`, 404));
    }

    // Check if case has already been used in critical operations
    const productsUsed = await CaseProduct.countDocuments({ case: caseItem._id });
    
    if (productsUsed > 0) {
      // Don't allow deletion of cases with products used, just change status instead
      caseItem.status = 'Cancelled';
      await caseItem.save({ session });
      
      // Add status history entry
      await CaseStatusHistory.create([{
        case: caseItem._id,
        previousStatus: 'Active',
        newStatus: 'Cancelled',
        notes: 'Case cancelled instead of deleted because products were already used',
        changedBy: req.user.id
      }], { session });
      
      await session.commitTransaction();
      session.endSession();
      
      return res.status(200).json({
        success: true,
        message: 'Case cancelled instead of deleted since products were already used',
        data: {}
      });
    }
    
    // Delete related records
    await CaseNote.deleteMany({ case: caseItem._id }, { session });
    await CaseStatusHistory.deleteMany({ case: caseItem._id }, { session });
    await CaseDocument.deleteMany({ case: caseItem._id }, { session });
    await CaseFollowup.deleteMany({ case: caseItem._id }, { session });
    await CaseProduct.deleteMany({ case: caseItem._id }, { session });
    await ProductUsage.deleteMany({ case: caseItem._id }, { session });

    // Delete the case
    await caseItem.deleteOne({ session });

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
 * @desc    Get case products
 * @route   GET /api/v1/cases/:id/products
 * @access  Private
 */
exports.getCaseProducts = async (req, res, next) => {
  try {
    const caseItem = await Case.findById(req.params.id);

    if (!caseItem) {
      return next(new ErrorResponse(`Case not found with id of ${req.params.id}`, 404));
    }

    const products = await CaseProduct.find({ case: req.params.id })
      .populate({
        path: 'product',
        select: 'name productCode principle',
        populate: { path: 'principle', select: 'name' }
      });

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
 * @desc    Add product to case
 * @route   POST /api/v1/cases/:id/products
 * @access  Private
 */
exports.addCaseProduct = async (req, res, next) => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const caseItem = await Case.findById(req.params.id);

    if (!caseItem) {
      return next(new ErrorResponse(`Case not found with id of ${req.params.id}`, 404));
    }

    // Add case ID to product data
    req.body.case = req.params.id;

    // Create case product
    const caseProduct = await CaseProduct.create([req.body], { session });

    // If used from inventory, update inventory and create usage record
    if (req.body.used_from_inventory !== false) {
      // Find inventory item by batch if provided
      const inventoryQuery = { product: req.body.product };
      if (req.body.batch_number) {
        inventoryQuery.batchNumber = req.body.batch_number;
      }
      inventoryQuery.status = 'Available';
      
      const inventoryItem = await ProductInventory.findOne(inventoryQuery)
        .sort({ expiryDate: 1 }) // Use oldest inventory first
        .session(session);
      
      if (!inventoryItem) {
        // Rollback transaction if inventory not found
        await session.abortTransaction();
        session.endSession();
        return next(new ErrorResponse(`No available inventory found for product in case`, 400));
      }
      
      // Check if there's enough quantity
      if (inventoryItem.quantity < req.body.quantity) {
        await session.abortTransaction();
        session.endSession();
        return next(new ErrorResponse(`Insufficient quantity in inventory for product. Available: ${inventoryItem.quantity}, Required: ${req.body.quantity}`, 400));
      }
      
      // Update inventory
      inventoryItem.quantity -= req.body.quantity;
      if (inventoryItem.quantity === 0) {
        inventoryItem.status = 'Used';
      }
      await inventoryItem.save({ session });
      
      // Create inventory transaction record
      await ProductInventoryTransaction.create([{
        product: req.body.product,
        transactionType: 'Used',
        quantity: req.body.quantity,
        batchNumber: inventoryItem.batchNumber,
        referenceId: caseItem._id,
        referenceType: 'case',
        notes: `Used in case ${caseItem.caseNumber}`,
        createdBy: req.user.id
      }], { session });
      
      // Create product usage record
      await ProductUsage.create([{
        product: req.body.product,
        case: caseItem._id,
        quantity: req.body.quantity,
        batchNumber: inventoryItem.batchNumber,
        usedDate: caseItem.surgeryDate || new Date(),
        dpValue: req.body.dp_value || inventoryItem.dpValue,
        sellingPrice: req.body.unit_price,
        createdBy: req.user.id
      }], { session });
    }

    // Commit transaction
    await session.commitTransaction();
    session.endSession();

    // Return created product with populated data
    const newProduct = await CaseProduct.findById(caseProduct[0]._id)
      .populate({
        path: 'product',
        select: 'name productCode principle',
        populate: { path: 'principle', select: 'name' }
      });

    res.status(201).json({
      success: true,
      data: newProduct
    });
  } catch (err) {
    await session.abortTransaction();
    session.endSession();
    next(err);
  }
};

/**
 * @desc    Update case product
 * @route   PUT /api/v1/cases/:id/products/:productId
 * @access  Private
 */
exports.updateCaseProduct = async (req, res, next) => {
    try {
      const caseItem = await Case.findById(req.params.id);
  
      if (!caseItem) {
        return next(new ErrorResponse(`Case not found with id of ${req.params.id}`, 404));
      }
  
      let caseProduct = await CaseProduct.findById(req.params.productId);
  
      if (!caseProduct) {
        return next(new ErrorResponse(`Product not found with id of ${req.params.productId}`, 404));
      }
  
      // Ensure product belongs to the specified case
      if (caseProduct.case.toString() !== req.params.id) {
        return next(new ErrorResponse(`Product not found for this case`, 404));
      }
  
      // Update case product (only allow updating certain fields)
      const updatableFields = {
        quantity: req.body.quantity,
        unit_price: req.body.unit_price,
        dp_value: req.body.dp_value,
        batch_number: req.body.batch_number,
        used_from_inventory: req.body.used_from_inventory
      };
  
      // Filter out undefined fields
      Object.keys(updatableFields).forEach(key => {
        if (updatableFields[key] === undefined) {
          delete updatableFields[key];
        }
      });
  
      // Update the product
      caseProduct = await CaseProduct.findByIdAndUpdate(
        req.params.productId,
        updatableFields,
        { new: true, runValidators: true }
      ).populate({
        path: 'product',
        select: 'name productCode principle',
        populate: { path: 'principle', select: 'name' }
      });
  
      res.status(200).json({
        success: true,
        data: caseProduct
      });
    } catch (err) {
      next(err);
    }
  };
  
  /**
   * @desc    Remove product from case
   * @route   DELETE /api/v1/cases/:id/products/:productId
   * @access  Private
   */
  exports.removeCaseProduct = async (req, res, next) => {
    try {
      const caseItem = await Case.findById(req.params.id);
  
      if (!caseItem) {
        return next(new ErrorResponse(`Case not found with id of ${req.params.id}`, 404));
      }
  
      const caseProduct = await CaseProduct.findById(req.params.productId);
  
      if (!caseProduct) {
        return next(new ErrorResponse(`Product not found with id of ${req.params.productId}`, 404));
      }
  
      // Ensure product belongs to the specified case
      if (caseProduct.case.toString() !== req.params.id) {
        return next(new ErrorResponse(`Product not found for this case`, 404));
      }
  
      // Delete product usage records related to this case product
      await ProductUsage.deleteMany({
        case: caseItem._id,
        product: caseProduct.product
      });
  
      // Delete the case product
      await caseProduct.deleteOne();
  
      res.status(200).json({
        success: true,
        data: {}
      });
    } catch (err) {
      next(err);
    }
  };
  
  /**
   * @desc    Get case notes
   * @route   GET /api/v1/cases/:id/notes
   * @access  Private
   */
  exports.getCaseNotes = async (req, res, next) => {
    try {
      const caseItem = await Case.findById(req.params.id);
  
      if (!caseItem) {
        return next(new ErrorResponse(`Case not found with id of ${req.params.id}`, 404));
      }
  
      const notes = await CaseNote.find({ case: req.params.id })
        .populate('createdBy', 'name')
        .sort('-createdAt');
  
      res.status(200).json({
        success: true,
        count: notes.length,
        data: notes
      });
    } catch (err) {
      next(err);
    }
  };
  
  /**
   * @desc    Add note to case
   * @route   POST /api/v1/cases/:id/notes
   * @access  Private
   */
  exports.addCaseNote = async (req, res, next) => {
    try {
      const caseItem = await Case.findById(req.params.id);
  
      if (!caseItem) {
        return next(new ErrorResponse(`Case not found with id of ${req.params.id}`, 404));
      }
  
      // Create note
      const note = await CaseNote.create({
        case: req.params.id,
        noteText: req.body.noteText,
        createdBy: req.user.id
      });
  
      const populatedNote = await CaseNote.findById(note._id)
        .populate('createdBy', 'name');
  
      res.status(201).json({
        success: true,
        data: populatedNote
      });
    } catch (err) {
      next(err);
    }
  };
  
  /**
   * @desc    Get case status history
   * @route   GET /api/v1/cases/:id/history
   * @access  Private
   */
  exports.getCaseStatusHistory = async (req, res, next) => {
    try {
      const caseItem = await Case.findById(req.params.id);
  
      if (!caseItem) {
        return next(new ErrorResponse(`Case not found with id of ${req.params.id}`, 404));
      }
  
      const history = await CaseStatusHistory.find({ case: req.params.id })
        .populate('changedBy', 'name')
        .sort('-createdAt');
  
      res.status(200).json({
        success: true,
        count: history.length,
        data: history
      });
    } catch (err) {
      next(err);
    }
  };
  
  /**
   * @desc    Update case status
   * @route   PUT /api/v1/cases/:id/status
   * @access  Private
   */
  exports.updateCaseStatus = async (req, res, next) => {
    try {
      const { status, notes } = req.body;
  
      if (!status) {
        return next(new ErrorResponse('Please provide a status', 400));
      }
  
      const caseItem = await Case.findById(req.params.id);
  
      if (!caseItem) {
        return next(new ErrorResponse(`Case not found with id of ${req.params.id}`, 404));
      }
  
      // Don't update if status is the same
      if (caseItem.status === status) {
        return res.status(200).json({
          success: true,
          message: 'Case status is already set to ' + status,
          data: caseItem
        });
      }
  
      // Update status
      const updatedCase = await Case.findByIdAndUpdate(
        req.params.id,
        { status },
        { new: true, runValidators: true }
      ).populate('hospital', 'name')
        .populate('doctor', 'name')
        .populate('principle', 'name')
        .populate('category', 'name')
        .populate('subcategory', 'name')
        .populate('createdBy', 'name');
  
      // Add status change to history
      await CaseStatusHistory.create({
        case: caseItem._id,
        previousStatus: caseItem.status,
        newStatus: status,
        notes,
        changedBy: req.user.id
      });
  
      res.status(200).json({
        success: true,
        data: updatedCase
      });
    } catch (err) {
      next(err);
    }
  };
  
  /**
   * @desc    Get case documents
   * @route   GET /api/v1/cases/:id/documents
   * @access  Private
   */
  exports.getCaseDocuments = async (req, res, next) => {
    try {
      const caseItem = await Case.findById(req.params.id);
  
      if (!caseItem) {
        return next(new ErrorResponse(`Case not found with id of ${req.params.id}`, 404));
      }
  
      const documents = await CaseDocument.find({ case: req.params.id })
        .populate('uploadedBy', 'name')
        .sort('-createdAt');
  
      res.status(200).json({
        success: true,
        count: documents.length,
        data: documents
      });
    } catch (err) {
      next(err);
    }
  };
  
  /**
   * @desc    Upload document to case
   * @route   POST /api/v1/cases/:id/documents
   * @access  Private
   */
  exports.uploadCaseDocument = async (req, res, next) => {
    try {
      const caseItem = await Case.findById(req.params.id);
  
      if (!caseItem) {
        return next(new ErrorResponse(`Case not found with id of ${req.params.id}`, 404));
      }
  
      // Create document
      const document = await CaseDocument.create({
        case: req.params.id,
        documentName: req.body.documentName,
        documentType: req.body.documentType,
        filePath: req.body.filePath,
        uploadedBy: req.user.id
      });
  
      const populatedDocument = await CaseDocument.findById(document._id)
        .populate('uploadedBy', 'name');
  
      res.status(201).json({
        success: true,
        data: populatedDocument
      });
    } catch (err) {
      next(err);
    }
  };
  
  /**
   * @desc    Delete case document
   * @route   DELETE /api/v1/cases/:id/documents/:documentId
   * @access  Private
   */
  exports.deleteCaseDocument = async (req, res, next) => {
    try {
      const caseItem = await Case.findById(req.params.id);
  
      if (!caseItem) {
        return next(new ErrorResponse(`Case not found with id of ${req.params.id}`, 404));
      }
  
      const document = await CaseDocument.findById(req.params.documentId);
  
      if (!document) {
        return next(new ErrorResponse(`Document not found with id of ${req.params.documentId}`, 404));
      }
  
      // Ensure document belongs to the specified case
      if (document.case.toString() !== req.params.id) {
        return next(new ErrorResponse(`Document not found for this case`, 404));
      }
  
      await document.deleteOne();
  
      res.status(200).json({
        success: true,
        data: {}
      });
    } catch (err) {
      next(err);
    }
  };
  
  /**
   * @desc    Get case followups
   * @route   GET /api/v1/cases/:id/followups
   * @access  Private
   */
  exports.getCaseFollowups = async (req, res, next) => {
    try {
      const caseItem = await Case.findById(req.params.id);
  
      if (!caseItem) {
        return next(new ErrorResponse(`Case not found with id of ${req.params.id}`, 404));
      }
  
      const followups = await CaseFollowup.find({ case: req.params.id })
        .populate('createdBy', 'name')
        .populate('completedBy', 'name')
        .sort('-followupDate');
  
      res.status(200).json({
        success: true,
        count: followups.length,
        data: followups
      });
    } catch (err) {
      next(err);
    }
  };
  
  /**
   * @desc    Add followup to case
   * @route   POST /api/v1/cases/:id/followups
   * @access  Private
   */
  exports.addCaseFollowup = async (req, res, next) => {
    try {
      const caseItem = await Case.findById(req.params.id);
  
      if (!caseItem) {
        return next(new ErrorResponse(`Case not found with id of ${req.params.id}`, 404));
      }
  
      // Create followup
      const followup = await CaseFollowup.create({
        case: req.params.id,
        followupDate: req.body.followupDate,
        description: req.body.description,
        status: req.body.status || 'Pending',
        createdBy: req.user.id
      });
  
      const populatedFollowup = await CaseFollowup.findById(followup._id)
        .populate('createdBy', 'name')
        .populate('completedBy', 'name');
  
      res.status(201).json({
        success: true,
        data: populatedFollowup
      });
    } catch (err) {
      next(err);
    }
  };
  
  /**
   * @desc    Update case followup
   * @route   PUT /api/v1/cases/:id/followups/:followupId
   * @access  Private
   */
  exports.updateCaseFollowup = async (req, res, next) => {
    try {
      const caseItem = await Case.findById(req.params.id);
  
      if (!caseItem) {
        return next(new ErrorResponse(`Case not found with id of ${req.params.id}`, 404));
      }
  
      let followup = await CaseFollowup.findById(req.params.followupId);
  
      if (!followup) {
        return next(new ErrorResponse(`Followup not found with id of ${req.params.followupId}`, 404));
      }
  
      // Ensure followup belongs to the specified case
      if (followup.case.toString() !== req.params.id) {
        return next(new ErrorResponse(`Followup not found for this case`, 404));
      }
  
      // If status is changing to 'Completed', set completedAt and completedBy
      const updateData = { ...req.body };
      if (req.body.status === 'Completed' && followup.status !== 'Completed') {
        updateData.completedAt = Date.now();
        updateData.completedBy = req.user.id;
      }
  
      // Update followup
      followup = await CaseFollowup.findByIdAndUpdate(
        req.params.followupId,
        updateData,
        { new: true, runValidators: true }
      ).populate('createdBy', 'name')
        .populate('completedBy', 'name');
  
      res.status(200).json({
        success: true,
        data: followup
      });
    } catch (err) {
      next(err);
    }
  };
  
  /**
   * @desc    Delete case followup
   * @route   DELETE /api/v1/cases/:id/followups/:followupId
   * @access  Private
   */
  exports.deleteCaseFollowup = async (req, res, next) => {
    try {
      const caseItem = await Case.findById(req.params.id);
  
      if (!caseItem) {
        return next(new ErrorResponse(`Case not found with id of ${req.params.id}`, 404));
      }
  
      const followup = await CaseFollowup.findById(req.params.followupId);
  
      if (!followup) {
        return next(new ErrorResponse(`Followup not found with id of ${req.params.followupId}`, 404));
      }
  
      // Ensure followup belongs to the specified case
      if (followup.case.toString() !== req.params.id) {
        return next(new ErrorResponse(`Followup not found for this case`, 404));
      }
  
      await followup.deleteOne();
  
      res.status(200).json({
        success: true,
        data: {}
      });
    } catch (err) {
      next(err);
    }
  };
  
  /**
   * @desc    Get cases by doctor
   * @route   GET /api/v1/cases/doctor/:doctorId
   * @access  Private
   */
  exports.getCasesByDoctor = async (req, res, next) => {
    try {
      const cases = await Case.find({ doctor: req.params.doctorId })
        .populate('hospital', 'name')
        .populate('doctor', 'name')
        .populate('principle', 'name')
        .populate('category', 'name')
        .populate('subcategory', 'name')
        .sort('-surgeryDate');
  
      res.status(200).json({
        success: true,
        count: cases.length,
        data: cases
      });
    } catch (err) {
      next(err);
    }
  };
  
  /**
   * @desc    Get cases by hospital
   * @route   GET /api/v1/cases/hospital/:hospitalId
   * @access  Private
   */
  exports.getCasesByHospital = async (req, res, next) => {
    try {
      const cases = await Case.find({ hospital: req.params.hospitalId })
        .populate('hospital', 'name')
        .populate('doctor', 'name')
        .populate('principle', 'name')
        .populate('category', 'name')
        .populate('subcategory', 'name')
        .sort('-surgeryDate');
  
      res.status(200).json({
        success: true,
        count: cases.length,
        data: cases
      });
    } catch (err) {
      next(err);
    }
  };
  
  /**
   * @desc    Get cases by principle
   * @route   GET /api/v1/cases/principle/:principleId
   * @access  Private
   */
  exports.getCasesByPrinciple = async (req, res, next) => {
    try {
      const cases = await Case.find({ principle: req.params.principleId })
        .populate('hospital', 'name')
        .populate('doctor', 'name')
        .populate('principle', 'name')
        .populate('category', 'name')
        .populate('subcategory', 'name')
        .sort('-surgeryDate');
  
      res.status(200).json({
        success: true,
        count: cases.length,
        data: cases
      });
    } catch (err) {
      next(err);
    }
  };
  
  /**
   * @desc    Get cases by category
   * @route   GET /api/v1/cases/category/:categoryId
   * @access  Private
   */
  exports.getCasesByCategory = async (req, res, next) => {
    try {
      const cases = await Case.find({ category: req.params.categoryId })
        .populate('hospital', 'name')
        .populate('doctor', 'name')
        .populate('principle', 'name')
        .populate('category', 'name')
        .populate('subcategory', 'name')
        .sort('-surgeryDate');
  
      res.status(200).json({
        success: true,
        count: cases.length,
        data: cases
      });
    } catch (err) {
      next(err);
    }
  };
  
  /**
   * @desc    Get cases by user
   * @route   GET /api/v1/cases/user
   * @access  Private
   */
  exports.getCasesByUser = async (req, res, next) => {
    try {
      const cases = await Case.find({ createdBy: req.user.id })
        .populate('hospital', 'name')
        .populate('doctor', 'name')
        .populate('principle', 'name')
        .populate('category', 'name')
        .populate('subcategory', 'name')
        .sort('-surgeryDate');
  
      res.status(200).json({
        success: true,
        count: cases.length,
        data: cases
      });
    } catch (err) {
      next(err);
    }
  };
  
  /**
   * @desc    Get case statistics
   * @route   GET /api/v1/cases/statistics
   * @access  Private
   */
  exports.getCaseStatistics = async (req, res, next) => {
    try {
      // Get time period from query or default to last month
      const period = req.query.period || 'month';
      
      // Define start date based on period
      let startDate = new Date();
      if (period === 'week') {
        startDate.setDate(startDate.getDate() - 7);
      } else if (period === 'month') {
        startDate.setMonth(startDate.getMonth() - 1);
      } else if (period === 'quarter') {
        startDate.setMonth(startDate.getMonth() - 3);
      } else if (period === 'year') {
        startDate.setFullYear(startDate.getFullYear() - 1);
      } else if (period === 'custom' && req.query.startDate) {
        startDate = new Date(req.query.startDate);
      }
      
      const endDate = req.query.endDate ? new Date(req.query.endDate) : new Date();
      
      // Count total cases
      const totalCases = await Case.countDocuments({
        surgeryDate: { $gte: startDate, $lte: endDate }
      });
      
      // Count cases by status
      const casesByStatus = await Case.aggregate([
        {
          $match: {
            surgeryDate: { $gte: startDate, $lte: endDate }
          }
        },
        {
          $group: {
            _id: '$status',
            count: { $sum: 1 }
          }
        }
      ]);
      
      // Get total revenue
      const revenueData = await Case.aggregate([
        {
          $match: {
            surgeryDate: { $gte: startDate, $lte: endDate }
          }
        },
        {
          $group: {
            _id: null,
            totalRevenue: { $sum: '$sellingPrice' },
            totalCost: { $sum: '$dpValue' }
          }
        }
      ]);
      
      const revenue = {
        totalRevenue: revenueData.length > 0 ? revenueData[0].totalRevenue : 0,
        totalCost: revenueData.length > 0 ? revenueData[0].totalCost : 0,
        profit: revenueData.length > 0 ? revenueData[0].totalRevenue - revenueData[0].totalCost : 0
      };
      
      // Get top hospitals
      const topHospitals = await Case.aggregate([
        {
          $match: {
            surgeryDate: { $gte: startDate, $lte: endDate }
          }
        },
        {
          $group: {
            _id: '$hospital',
            count: { $sum: 1 },
            revenue: { $sum: '$sellingPrice' }
          }
        },
        {
          $sort: { count: -1 }
        },
        {
          $limit: 5
        },
        {
          $lookup: {
            from: 'hospitals',
            localField: '_id',
            foreignField: '_id',
            as: 'hospitalDetails'
          }
        },
        {
          $project: {
            _id: 1,
            name: { $arrayElemAt: ['$hospitalDetails.name', 0] },
            count: 1,
            revenue: 1
          }
        }
      ]);
      
      // Get top doctors
      const topDoctors = await Case.aggregate([
        {
          $match: {
            surgeryDate: { $gte: startDate, $lte: endDate }
          }
        },
        {
          $group: {
            _id: '$doctor',
            count: { $sum: 1 },
            revenue: { $sum: '$sellingPrice' }
          }
        },
        {
          $sort: { count: -1 }
        },
        {
          $limit: 5
        },
        {
          $lookup: {
            from: 'doctors',
            localField: '_id',
            foreignField: '_id',
            as: 'doctorDetails'
          }
        },
        {
          $project: {
            _id: 1,
            name: { $arrayElemAt: ['$doctorDetails.name', 0] },
            count: 1,
            revenue: 1
          }
        }
      ]);
      
      // Prepare status counts
      const statusCounts = {};
      casesByStatus.forEach(status => {
        statusCounts[status._id] = status.count;
      });
      
      res.status(200).json({
        success: true,
        data: {
          totalCases,
          statusCounts,
          revenue,
          topHospitals,
          topDoctors,
          period,
          dateRange: {
            startDate,
            endDate
          }
        }
      });
    } catch (err) {
      next(err);
    }
  };
  
  module.exports = exports;