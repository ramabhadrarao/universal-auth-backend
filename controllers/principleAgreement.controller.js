// controllers/principleAgreement.controller.js
const PrincipleAgreement = require('../models/principleAgreement.model');
const ErrorResponse = require('../utils/errorResponse');

/**
 * @desc    Get all agreements for a principle
 * @route   GET /api/v1/principles/:principleId/agreements
 * @access  Private
 */
exports.getPrincipleAgreements = async (req, res, next) => {
  try {
    // Add filtering options
    const filter = { principle: req.params.principleId };
    
    // Filter by status if provided
    if (req.query.status) {
      filter.status = req.query.status;
    }
    
    // Filter by agreement type if provided
    if (req.query.agreementType) {
      filter.agreementType = req.query.agreementType;
    }
    
    // Filter by date range
    if (req.query.startDate) {
      if (!filter.startDate) filter.startDate = {};
      filter.startDate.$gte = new Date(req.query.startDate);
    }
    
    if (req.query.endDate) {
      if (!filter.endDate) filter.endDate = {};
      filter.endDate.$lte = new Date(req.query.endDate);
    }

    const agreements = await PrincipleAgreement.find(filter)
      .populate('createdBy', 'name');

    res.status(200).json({
      success: true,
      count: agreements.length,
      data: agreements
    });
  } catch (err) {
    next(err);
  }
};

/**
 * @desc    Get single agreement
 * @route   GET /api/v1/principles/:principleId/agreements/:id
 * @access  Private
 */
exports.getPrincipleAgreement = async (req, res, next) => {
  try {
    const agreement = await PrincipleAgreement.findById(req.params.id)
      .populate('createdBy', 'name');

    if (!agreement) {
      return next(new ErrorResponse(`Agreement not found with id of ${req.params.id}`, 404));
    }

    // Make sure agreement belongs to principle
    if (agreement.principle.toString() !== req.params.principleId) {
      return next(new ErrorResponse(`Agreement not found for this principle`, 404));
    }

    res.status(200).json({
      success: true,
      data: agreement
    });
  } catch (err) {
    next(err);
  }
};

/**
 * @desc    Add new agreement to principle
 * @route   POST /api/v1/principles/:principleId/agreements
 * @access  Private
 */
exports.addPrincipleAgreement = async (req, res, next) => {
  try {
    req.body.principle = req.params.principleId;
    req.body.createdBy = req.user.id;

    const agreement = await PrincipleAgreement.create(req.body);

    res.status(201).json({
      success: true,
      data: agreement
    });
  } catch (err) {
    next(err);
  }
};

/**
 * @desc    Update agreement
 * @route   PUT /api/v1/principles/:principleId/agreements/:id
 * @access  Private
 */
exports.updatePrincipleAgreement = async (req, res, next) => {
  try {
    let agreement = await PrincipleAgreement.findById(req.params.id);

    if (!agreement) {
      return next(new ErrorResponse(`Agreement not found with id of ${req.params.id}`, 404));
    }

    // Make sure agreement belongs to principle
    if (agreement.principle.toString() !== req.params.principleId) {
      return next(new ErrorResponse(`Agreement not found for this principle`, 404));
    }

    agreement = await PrincipleAgreement.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
      runValidators: true
    });

    res.status(200).json({
      success: true,
      data: agreement
    });
  } catch (err) {
    next(err);
  }
};

/**
 * @desc    Delete agreement
 * @route   DELETE /api/v1/principles/:principleId/agreements/:id
 * @access  Private
 */
exports.deletePrincipleAgreement = async (req, res, next) => {
  try {
    const agreement = await PrincipleAgreement.findById(req.params.id);

    if (!agreement) {
      return next(new ErrorResponse(`Agreement not found with id of ${req.params.id}`, 404));
    }

    // Make sure agreement belongs to principle
    if (agreement.principle.toString() !== req.params.principleId) {
      return next(new ErrorResponse(`Agreement not found for this principle`, 404));
    }

    await agreement.deleteOne();

    res.status(200).json({
      success: true,
      data: {}
    });
  } catch (err) {
    next(err);
  }
};

/**
 * @desc    Update agreement status
 * @route   PUT /api/v1/principles/:principleId/agreements/:id/status
 * @access  Private
 */
exports.updateAgreementStatus = async (req, res, next) => {
  try {
    const { status } = req.body;
    
    if (!status) {
      return next(new ErrorResponse('Please provide status', 400));
    }
    
    // Validate status
    const validStatuses = ['Active', 'Expired', 'Cancelled', 'Pending'];
    if (!validStatuses.includes(status)) {
      return next(
        new ErrorResponse(
          `Invalid status. Must be one of: ${validStatuses.join(', ')}`, 
          400
        )
      );
    }
    
    let agreement = await PrincipleAgreement.findById(req.params.id);

    if (!agreement) {
      return next(new ErrorResponse(`Agreement not found with id of ${req.params.id}`, 404));
    }

    // Make sure agreement belongs to principle
    if (agreement.principle.toString() !== req.params.principleId) {
      return next(new ErrorResponse(`Agreement not found for this principle`, 404));
    }

    agreement = await PrincipleAgreement.findByIdAndUpdate(
      req.params.id,
      { status },
      { new: true }
    );

    res.status(200).json({
      success: true,
      data: agreement
    });
  } catch (err) {
    next(err);
  }
};

/**
 * @desc    Get expiring agreements
 * @route   GET /api/v1/principles/expiring-agreements
 * @access  Private
 */
exports.getExpiringAgreements = async (req, res, next) => {
  try {
    // Default to 30 days if not specified
    const days = parseInt(req.query.days) || 30;
    const expiryDate = new Date();
    expiryDate.setDate(expiryDate.getDate() + days);
    
    const agreements = await PrincipleAgreement.find({
      status: 'Active',
      endDate: { 
        $ne: null, 
        $lte: expiryDate 
      }
    })
      .populate('principle', 'name')
      .populate('createdBy', 'name')
      .sort('endDate');
    
    res.status(200).json({
      success: true,
      count: agreements.length,
      data: agreements
    });
  } catch (err) {
    next(err);
  }
};