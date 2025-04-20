// controllers/principleContact.controller.js
const PrincipleContact = require('../models/principleContact.model');
const ErrorResponse = require('../utils/errorResponse');

/**
 * @desc    Get all contacts for a principle
 * @route   GET /api/v1/principles/:principleId/contacts
 * @access  Private
 */
exports.getPrincipleContacts = async (req, res, next) => {
  try {
    const contacts = await PrincipleContact.find({ 
      principle: req.params.principleId 
    });

    res.status(200).json({
      success: true,
      count: contacts.length,
      data: contacts
    });
  } catch (err) {
    next(err);
  }
};

/**
 * @desc    Get single contact
 * @route   GET /api/v1/principles/:principleId/contacts/:id
 * @access  Private
 */
exports.getPrincipleContact = async (req, res, next) => {
  try {
    const contact = await PrincipleContact.findById(req.params.id);

    if (!contact) {
      return next(new ErrorResponse(`Contact not found with id of ${req.params.id}`, 404));
    }

    // Make sure contact belongs to principle
    if (contact.principle.toString() !== req.params.principleId) {
      return next(new ErrorResponse(`Contact not found for this principle`, 404));
    }

    res.status(200).json({
      success: true,
      data: contact
    });
  } catch (err) {
    next(err);
  }
};

/**
 * @desc    Add contact to principle
 * @route   POST /api/v1/principles/:principleId/contacts
 * @access  Private
 */
exports.addPrincipleContact = async (req, res, next) => {
  try {
    req.body.principle = req.params.principleId;

    const contact = await PrincipleContact.create(req.body);

    // If this is set as primary, update other contacts to non-primary
    if (req.body.isPrimary) {
      await PrincipleContact.updateMany(
        { 
          principle: req.params.principleId, 
          _id: { $ne: contact._id },
          isPrimary: true
        },
        { isPrimary: false }
      );
    }

    res.status(201).json({
      success: true,
      data: contact
    });
  } catch (err) {
    next(err);
  }
};

/**
 * @desc    Update contact
 * @route   PUT /api/v1/principles/:principleId/contacts/:id
 * @access  Private
 */
exports.updatePrincipleContact = async (req, res, next) => {
  try {
    let contact = await PrincipleContact.findById(req.params.id);

    if (!contact) {
      return next(new ErrorResponse(`Contact not found with id of ${req.params.id}`, 404));
    }

    // Make sure contact belongs to principle
    if (contact.principle.toString() !== req.params.principleId) {
      return next(new ErrorResponse(`Contact not found for this principle`, 404));
    }

    // If setting as primary, update other contacts
    if (req.body.isPrimary) {
      await PrincipleContact.updateMany(
        { 
          principle: req.params.principleId, 
          _id: { $ne: req.params.id },
          isPrimary: true
        },
        { isPrimary: false }
      );
    }

    contact = await PrincipleContact.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
      runValidators: true
    });

    res.status(200).json({
      success: true,
      data: contact
    });
  } catch (err) {
    next(err);
  }
};

/**
 * @desc    Delete contact
 * @route   DELETE /api/v1/principles/:principleId/contacts/:id
 * @access  Private
 */
exports.deletePrincipleContact = async (req, res, next) => {
  try {
    const contact = await PrincipleContact.findById(req.params.id);

    if (!contact) {
      return next(new ErrorResponse(`Contact not found with id of ${req.params.id}`, 404));
    }

    // Make sure contact belongs to principle
    if (contact.principle.toString() !== req.params.principleId) {
      return next(new ErrorResponse(`Contact not found for this principle`, 404));
    }

    await contact.deleteOne();

    res.status(200).json({
      success: true,
      data: {}
    });
  } catch (err) {
    next(err);
  }
};

/**
 * @desc    Set primary contact
 * @route   PUT /api/v1/principles/:principleId/contacts/:id/set-primary
 * @access  Private
 */
exports.setPrimaryContact = async (req, res, next) => {
  try {
    let contact = await PrincipleContact.findById(req.params.id);

    if (!contact) {
      return next(new ErrorResponse(`Contact not found with id of ${req.params.id}`, 404));
    }

    // Make sure contact belongs to principle
    if (contact.principle.toString() !== req.params.principleId) {
      return next(new ErrorResponse(`Contact not found for this principle`, 404));
    }

    // Clear any existing primary contacts
    await PrincipleContact.updateMany(
      { principle: req.params.principleId },
      { isPrimary: false }
    );

    // Set this contact as primary
    contact = await PrincipleContact.findByIdAndUpdate(
      req.params.id,
      { isPrimary: true },
      { new: true }
    );

    res.status(200).json({
      success: true,
      data: contact
    });
  } catch (err) {
    next(err);
  }
};

/**
 * @desc    Get primary contacts for all principles
 * @route   GET /api/v1/principles/primary-contacts
 * @access  Private
 */
exports.getPrimaryContacts = async (req, res, next) => {
  try {
    // Find all primary contacts across principles
    const primaryContacts = await PrincipleContact.find({
      isPrimary: true
    }).populate('principle', 'name');

    res.status(200).json({
      success: true,
      count: primaryContacts.length,
      data: primaryContacts
    });
  } catch (err) {
    next(err);
  }
};

/**
 * @desc    Search contacts
 * @route   GET /api/v1/principles/search-contacts
 * @access  Private
 */
exports.searchContacts = async (req, res, next) => {
  try {
    const { query } = req.query;

    if (!query) {
      return next(new ErrorResponse('Search query is required', 400));
    }

    // Search contact name, email, designation, or department
    const contacts = await PrincipleContact.find({
      $or: [
        { name: { $regex: query, $options: 'i' } },
        { email: { $regex: query, $options: 'i' } },
        { designation: { $regex: query, $options: 'i' } },
        { department: { $regex: query, $options: 'i' } }
      ]
    }).populate('principle', 'name');

    res.status(200).json({
      success: true,
      count: contacts.length,
      data: contacts
    });
  } catch (err) {
    next(err);
  }
};