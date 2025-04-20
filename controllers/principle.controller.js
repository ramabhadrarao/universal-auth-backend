// controllers/principle.controller.js
const Principle = require('../models/principle.model');
const ErrorResponse = require('../utils/errorResponse');

/**
 * @desc    Get all principles with pagination and filtering
 * @route   GET /api/v1/principles
 * @access  Private
 */
exports.getPrinciples = async (req, res, next) => {
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

    // Default to only active principles unless specifically queried
    if (!reqQuery.isActive) {
      queryStr = JSON.parse(queryStr);
      queryStr.isActive = true;
      queryStr = JSON.stringify(queryStr);
    }

    // Finding resource
    let query = Principle.find(JSON.parse(queryStr));

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
    const total = await Principle.countDocuments(JSON.parse(queryStr));

    query = query.skip(startIndex).limit(limit);

    // Executing query
    const principles = await query;

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
      count: principles.length,
      pagination,
      total,
      data: principles
    });
  } catch (err) {
    next(err);
  }
};

/**
 * @desc    Get single principle
 * @route   GET /api/v1/principles/:id
 * @access  Private
 */
exports.getPrinciple = async (req, res, next) => {
  try {
    const principle = await Principle.findById(req.params.id);

    if (!principle) {
      return next(new ErrorResponse(`Principle not found with id of ${req.params.id}`, 404));
    }

    res.status(200).json({
      success: true,
      data: principle
    });
  } catch (err) {
    next(err);
  }
};

/**
 * @desc    Create new principle
 * @route   POST /api/v1/principles
 * @access  Private
 */
exports.createPrinciple = async (req, res, next) => {
  try {
    // Add user to request body
    req.body.createdBy = req.user.id;

    const principle = await Principle.create(req.body);

    res.status(201).json({
      success: true,
      data: principle
    });
  } catch (err) {
    next(err);
  }
};

/**
 * @desc    Update principle
 * @route   PUT /api/v1/principles/:id
 * @access  Private
 */
exports.updatePrinciple = async (req, res, next) => {
  try {
    let principle = await Principle.findById(req.params.id);

    if (!principle) {
      return next(new ErrorResponse(`Principle not found with id of ${req.params.id}`, 404));
    }

    principle = await Principle.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
      runValidators: true
    });

    res.status(200).json({
      success: true,
      data: principle
    });
  } catch (err) {
    next(err);
  }
};

/**
 * @desc    Delete principle (soft delete by setting isActive to false)
 * @route   DELETE /api/v1/principles/:id
 * @access  Private (Admin)
 */
exports.deletePrinciple = async (req, res, next) => {
  try {
    const principle = await Principle.findById(req.params.id);

    if (!principle) {
      return next(new ErrorResponse(`Principle not found with id of ${req.params.id}`, 404));
    }

    // Perform soft delete by setting isActive to false
    principle.isActive = false;
    await principle.save();

    res.status(200).json({
      success: true,
      data: {}
    });
  } catch (err) {
    next(err);
  }
};

/**
 * @desc    Get principles with active agreements
 * @route   GET /api/v1/principles/with-agreements
 * @access  Private
 */
exports.getPrinciplesWithAgreements = async (req, res, next) => {
  try {
    // This would require an aggregation to simulate the SQL view
    const principles = await Principle.aggregate([
      {
        $lookup: {
          from: 'principleagreements',
          localField: '_id',
          foreignField: 'principle',
          as: 'agreements'
        }
      },
      {
        $match: {
          'agreements.status': 'Active',
          'agreements.endDate': { 
            $gt: new Date() 
          }
        }
      },
      {
        $project: {
          _id: 1,
          name: 1,
          agreementType: { $arrayElemAt: ['$agreements.agreementType', 0] },
          startDate: { $arrayElemAt: ['$agreements.startDate', 0] },
          endDate: { $arrayElemAt: ['$agreements.endDate', 0] },
          discountPercentage: { $arrayElemAt: ['$agreements.discountPercentage', 0] },
          paymentTerms: { $arrayElemAt: ['$agreements.paymentTerms', 0] },
          agreementStatus: { $arrayElemAt: ['$agreements.status', 0] }
        }
      }
    ]);

    res.status(200).json({
      success: true,
      count: principles.length,
      data: principles
    });
  } catch (err) {
    next(err);
  }
};

/**
 * @desc    Get principle summary with aggregated data
 * @route   GET /api/v1/principles/summary
 * @access  Private
 */
exports.getPrincipleSummary = async (req, res, next) => {
  try {
    // This would require multiple aggregations to simulate the SQL view
    const principles = await Principle.aggregate([
      {
        $lookup: {
          from: 'principleproducts',
          localField: '_id',
          foreignField: 'principle',
          as: 'products'
        }
      },
      {
        $lookup: {
          from: 'principlecategories',
          localField: '_id',
          foreignField: 'principle',
          as: 'categories'
        }
      },
      // TODO: Add lookup for cases once the cases model is implemented
      {
        $project: {
          _id: 1,
          name: 1,
          contactPerson: 1,
          phone: 1,
          email: 1,
          isActive: 1,
          productCount: { $size: '$products' },
          categoryCount: { $size: '$categories' },
          caseCount: 0, // Placeholder until cases are implemented
          totalRevenue: 0, // Placeholder until cases are implemented
          lastCaseDate: null // Placeholder until cases are implemented
        }
      }
    ]);

    res.status(200).json({
      success: true,
      count: principles.length,
      data: principles
    });
  } catch (err) {
    next(err);
  }
};