// controllers/principleDocument.controller.js
const PrincipleDocument = require('../models/principleDocument.model');
const ErrorResponse = require('../utils/errorResponse');

/**
 * @desc    Get all documents for a principle
 * @route   GET /api/v1/principles/:principleId/documents
 * @access  Private
 */
exports.getPrincipleDocuments = async (req, res, next) => {
  try {
    // Add filtering by document type if provided
    const filter = { principle: req.params.principleId };
    
    if (req.query.documentType) {
      filter.documentType = req.query.documentType;
    }

    const documents = await PrincipleDocument.find(filter)
      .populate('uploadedBy', 'name');

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
 * @desc    Get single document
 * @route   GET /api/v1/principles/:principleId/documents/:id
 * @access  Private
 */
exports.getPrincipleDocument = async (req, res, next) => {
  try {
    const document = await PrincipleDocument.findById(req.params.id)
      .populate('uploadedBy', 'name');

    if (!document) {
      return next(new ErrorResponse(`Document not found with id of ${req.params.id}`, 404));
    }

    // Make sure document belongs to principle
    if (document.principle.toString() !== req.params.principleId) {
      return next(new ErrorResponse(`Document not found for this principle`, 404));
    }

    res.status(200).json({
      success: true,
      data: document
    });
  } catch (err) {
    next(err);
  }
};

/**
 * @desc    Upload document to principle
 * @route   POST /api/v1/principles/:principleId/documents
 * @access  Private
 */
exports.uploadPrincipleDocument = async (req, res, next) => {
  try {
    req.body.principle = req.params.principleId;
    req.body.uploadedBy = req.user.id;
    req.body.uploadedAt = Date.now();

    const document = await PrincipleDocument.create(req.body);

    res.status(201).json({
      success: true,
      data: document
    });
  } catch (err) {
    next(err);
  }
};

/**
 * @desc    Update document
 * @route   PUT /api/v1/principles/:principleId/documents/:id
 * @access  Private
 */
exports.updatePrincipleDocument = async (req, res, next) => {
  try {
    let document = await PrincipleDocument.findById(req.params.id);

    if (!document) {
      return next(new ErrorResponse(`Document not found with id of ${req.params.id}`, 404));
    }

    // Make sure document belongs to principle
    if (document.principle.toString() !== req.params.principleId) {
      return next(new ErrorResponse(`Document not found for this principle`, 404));
    }

    // Only allow updates to specific fields, not the file itself
    const allowedUpdates = {
      documentType: req.body.documentType,
      documentName: req.body.documentName
    };

    document = await PrincipleDocument.findByIdAndUpdate(
      req.params.id,
      allowedUpdates,
      {
        new: true,
        runValidators: true
      }
    );

    res.status(200).json({
      success: true,
      data: document
    });
  } catch (err) {
    next(err);
  }
};

/**
 * @desc    Delete document
 * @route   DELETE /api/v1/principles/:principleId/documents/:id
 * @access  Private
 */
exports.deletePrincipleDocument = async (req, res, next) => {
  try {
    const document = await PrincipleDocument.findById(req.params.id);

    if (!document) {
      return next(new ErrorResponse(`Document not found with id of ${req.params.id}`, 404));
    }

    // Make sure document belongs to principle
    if (document.principle.toString() !== req.params.principleId) {
      return next(new ErrorResponse(`Document not found for this principle`, 404));
    }

    await document.deleteOne();

    // TODO: In a real implementation, you would also delete the actual file from storage
    // This would depend on your file storage solution (local, S3, etc.)

    res.status(200).json({
      success: true,
      data: {}
    });
  } catch (err) {
    next(err);
  }
};

/**
 * @desc    Get documents by type
 * @route   GET /api/v1/principles/documents-by-type/:documentType
 * @access  Private
 */
exports.getDocumentsByType = async (req, res, next) => {
  try {
    const documents = await PrincipleDocument.find({
      documentType: req.params.documentType
    })
      .populate('principle', 'name')
      .populate('uploadedBy', 'name');
    
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
 * @desc    Get recent documents
 * @route   GET /api/v1/principles/recent-documents
 * @access  Private
 */
exports.getRecentDocuments = async (req, res, next) => {
  try {
    // Get limit from query or default to 10
    const limit = parseInt(req.query.limit) || 10;
    
    const documents = await PrincipleDocument.find()
      .populate('principle', 'name')
      .populate('uploadedBy', 'name')
      .sort({ uploadedAt: -1 })
      .limit(limit);
    
    res.status(200).json({
      success: true,
      count: documents.length,
      data: documents
    });
  } catch (err) {
    next(err);
  }
};