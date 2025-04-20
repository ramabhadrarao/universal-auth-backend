// controllers/principleVisit.controller.js
const PrincipleVisit = require('../models/principleVisit.model');
const ErrorResponse = require('../utils/errorResponse');

/**
 * @desc    Get all visits for a principle
 * @route   GET /api/v1/principles/:principleId/visits
 * @access  Private
 */
exports.getPrincipleVisits = async (req, res, next) => {
  try {
    const filter = { principle: req.params.principleId };
    
    // Add date filtering if provided
    if (req.query.startDate) {
      filter.visitDate = { ...filter.visitDate, $gte: new Date(req.query.startDate) };
    }
    
    if (req.query.endDate) {
      filter.visitDate = { ...filter.visitDate, $lte: new Date(req.query.endDate) };
    }
    
    // Add status filtering if provided
    if (req.query.status) {
      filter.status = req.query.status;
    }

    // Sort options
    const sort = {};
    if (req.query.sortBy) {
      sort[req.query.sortBy] = req.query.sortOrder === 'desc' ? -1 : 1;
    } else {
      sort.visitDate = -1; // Default: most recent first
    }

    const visits = await PrincipleVisit.find(filter)
      .populate('user', 'name')
      .sort(sort);

    res.status(200).json({
      success: true,
      count: visits.length,
      data: visits
    });
  } catch (err) {
    next(err);
  }
};

/**
 * @desc    Get single visit
 * @route   GET /api/v1/principles/:principleId/visits/:id
 * @access  Private
 */
exports.getPrincipleVisit = async (req, res, next) => {
  try {
    const visit = await PrincipleVisit.findById(req.params.id)
      .populate('user', 'name');

    if (!visit) {
      return next(new ErrorResponse(`Visit not found with id of ${req.params.id}`, 404));
    }

    // Make sure visit belongs to principle
    if (visit.principle.toString() !== req.params.principleId) {
      return next(new ErrorResponse(`Visit not found for this principle`, 404));
    }

    res.status(200).json({
      success: true,
      data: visit
    });
  } catch (err) {
    next(err);
  }
};

/**
 * @desc    Add new visit to principle
 * @route   POST /api/v1/principles/:principleId/visits
 * @access  Private
 */
exports.addPrincipleVisit = async (req, res, next) => {
  try {
    req.body.principle = req.params.principleId;
    req.body.user = req.user.id;

    const visit = await PrincipleVisit.create(req.body);

    res.status(201).json({
      success: true,
      data: visit
    });
  } catch (err) {
    next(err);
  }
};

/**
 * @desc    Update visit
 * @route   PUT /api/v1/principles/:principleId/visits/:id
 * @access  Private
 */
exports.updatePrincipleVisit = async (req, res, next) => {
  try {
    let visit = await PrincipleVisit.findById(req.params.id);

    if (!visit) {
      return next(new ErrorResponse(`Visit not found with id of ${req.params.id}`, 404));
    }

    // Make sure visit belongs to principle
    if (visit.principle.toString() !== req.params.principleId) {
      return next(new ErrorResponse(`Visit not found for this principle`, 404));
    }

    // Users can only update their own visits unless they're admins
    if (visit.user.toString() !== req.user.id && !req.user.roles.includes('admin')) {
      return next(new ErrorResponse(`Not authorized to update this visit`, 403));
    }

    visit = await PrincipleVisit.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
      runValidators: true
    });

    res.status(200).json({
      success: true,
      data: visit
    });
  } catch (err) {
    next(err);
  }
};

/**
 * @desc    Delete visit
 * @route   DELETE /api/v1/principles/:principleId/visits/:id
 * @access  Private
 */
exports.deletePrincipleVisit = async (req, res, next) => {
  try {
    const visit = await PrincipleVisit.findById(req.params.id);

    if (!visit) {
      return next(new ErrorResponse(`Visit not found with id of ${req.params.id}`, 404));
    }

    // Make sure visit belongs to principle
    if (visit.principle.toString() !== req.params.principleId) {
      return next(new ErrorResponse(`Visit not found for this principle`, 404));
    }

    // Users can only delete their own visits unless they're admins
    if (visit.user.toString() !== req.user.id && !req.user.roles.includes('admin')) {
      return next(new ErrorResponse(`Not authorized to delete this visit`, 403));
    }

    await visit.deleteOne();

    res.status(200).json({
      success: true,
      data: {}
    });
  } catch (err) {
    next(err);
  }
};

/**
 * @desc    Get upcoming visits and follow-ups
 * @route   GET /api/v1/principles/upcoming-visits
 * @access  Private
 */
exports.getUpcomingVisits = async (req, res, next) => {
  try {
    const today = new Date();
    
    // Get future visits
    const upcomingVisits = await PrincipleVisit.find({
      visitDate: { $gte: today },
      status: { $ne: 'Cancelled' }
    })
      .populate('principle', 'name')
      .populate('user', 'name')
      .sort('visitDate');
    
    // Get pending follow-ups
    const pendingFollowUps = await PrincipleVisit.find({
      followUpDate: { $gte: today },
      status: 'Completed'
    })
      .populate('principle', 'name')
      .populate('user', 'name')
      .sort('followUpDate');
    
    res.status(200).json({
      success: true,
      data: {
        upcomingVisits: {
          count: upcomingVisits.length,
          visits: upcomingVisits
        },
        pendingFollowUps: {
          count: pendingFollowUps.length,
          followUps: pendingFollowUps
        }
      }
    });
  } catch (err) {
    next(err);
  }
};

/**
 * @desc    Mark visit as completed
 * @route   PUT /api/v1/principles/:principleId/visits/:id/complete
 * @access  Private
 */
exports.completeVisit = async (req, res, next) => {
  try {
    let visit = await PrincipleVisit.findById(req.params.id);

    if (!visit) {
      return next(new ErrorResponse(`Visit not found with id of ${req.params.id}`, 404));
    }

    // Make sure visit belongs to principle
    if (visit.principle.toString() !== req.params.principleId) {
      return next(new ErrorResponse(`Visit not found for this principle`, 404));
    }

    // Users can only complete their own visits unless they're admins
    if (visit.user.toString() !== req.user.id && !req.user.roles.includes('admin')) {
      return next(new ErrorResponse(`Not authorized to complete this visit`, 403));
    }

    // Update status and other details
    const updateData = {
      status: 'Completed',
      outcome: req.body.outcome || visit.outcome,
      discussion: req.body.discussion || visit.discussion,
      followUpDate: req.body.followUpDate || visit.followUpDate,
      followUpAction: req.body.followUpAction || visit.followUpAction
    };

    visit = await PrincipleVisit.findByIdAndUpdate(
      req.params.id,
      updateData,
      { new: true }
    );

    res.status(200).json({
      success: true,
      data: visit
    });
  } catch (err) {
    next(err);
  }
};

/**
 * @desc    Reschedule visit
 * @route   PUT /api/v1/principles/:principleId/visits/:id/reschedule
 * @access  Private
 */
exports.rescheduleVisit = async (req, res, next) => {
  try {
    if (!req.body.visitDate) {
      return next(new ErrorResponse('New visit date is required', 400));
    }

    let visit = await PrincipleVisit.findById(req.params.id);

    if (!visit) {
      return next(new ErrorResponse(`Visit not found with id of ${req.params.id}`, 404));
    }

    // Make sure visit belongs to principle
    if (visit.principle.toString() !== req.params.principleId) {
      return next(new ErrorResponse(`Visit not found for this principle`, 404));
    }

    // Users can only reschedule their own visits unless they're admins
    if (visit.user.toString() !== req.user.id && !req.user.roles.includes('admin')) {
      return next(new ErrorResponse(`Not authorized to reschedule this visit`, 403));
    }

    visit = await PrincipleVisit.findByIdAndUpdate(
      req.params.id,
      {
        visitDate: new Date(req.body.visitDate),
        status: 'Rescheduled'
      },
      { new: true }
    );

    res.status(200).json({
      success: true,
      data: visit
    });
  } catch (err) {
    next(err);
  }
};