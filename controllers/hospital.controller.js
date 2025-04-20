// controllers/hospital.controller.js
const Hospital = require('../models/hospital.model');
const HospitalContact = require('../models/hospitalContact.model');
const HospitalDepartment = require('../models/hospitalDepartment.model');
const HospitalVisit = require('../models/hospitalVisit.model');
const HospitalAgreement = require('../models/hospitalAgreement.model');
const ErrorResponse = require('../utils/errorResponse');
const { logger } = require('../middlewares/logger.middleware');

/**
 * @desc    Get all hospitals
 * @route   GET /api/v1/hospitals
 * @access  Private
 */
exports.getHospitals = async (req, res, next) => {
  try {
    // Build filter
    const filter = {};
    
    // Filter by city if provided
    if (req.query.city) {
      filter.city = { $regex: req.query.city, $options: 'i' };
    }
    
    // Filter by state if provided
    if (req.query.state) {
      filter.state = { $regex: req.query.state, $options: 'i' };
    }
    
    // Filter by active status if provided
    if (req.query.isActive !== undefined) {
      filter.isActive = req.query.isActive === 'true';
    }

    // Pagination
    const page = parseInt(req.query.page, 10) || 1;
    const limit = parseInt(req.query.limit, 10) || 10;
    const startIndex = (page - 1) * limit;
    const endIndex = page * limit;
    const total = await Hospital.countDocuments(filter);

    // Get hospitals with pagination
    const hospitals = await Hospital.find(filter)
      .skip(startIndex)
      .limit(limit);

    // Pagination results
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
      count: hospitals.length,
      pagination,
      total,
      data: hospitals
    });
  } catch (err) {
    next(err);
  }
};

/**
 * @desc    Get single hospital
 * @route   GET /api/v1/hospitals/:id
 * @access  Private
 */
exports.getHospital = async (req, res, next) => {
  try {
    const hospital = await Hospital.findById(req.params.id);

    if (!hospital) {
      return next(
        new ErrorResponse(`Hospital not found with id of ${req.params.id}`, 404)
      );
    }

    res.status(200).json({
      success: true,
      data: hospital
    });
  } catch (err) {
    next(err);
  }
};

/**
 * @desc    Create new hospital
 * @route   POST /api/v1/hospitals
 * @access  Private
 */
exports.createHospital = async (req, res, next) => {
  try {
    // Add user to request body as creator
    req.body.createdBy = req.user.id;

    const hospital = await Hospital.create(req.body);

    res.status(201).json({
      success: true,
      data: hospital
    });
  } catch (err) {
    next(err);
  }
};

/**
 * @desc    Update hospital
 * @route   PUT /api/v1/hospitals/:id
 * @access  Private
 */
exports.updateHospital = async (req, res, next) => {
  try {
    let hospital = await Hospital.findById(req.params.id);

    if (!hospital) {
      return next(
        new ErrorResponse(`Hospital not found with id of ${req.params.id}`, 404)
      );
    }

    hospital = await Hospital.findByIdAndUpdate(
      req.params.id,
      req.body,
      {
        new: true,
        runValidators: true
      }
    );

    res.status(200).json({
      success: true,
      data: hospital
    });
  } catch (err) {
    next(err);
  }
};

/**
 * @desc    Delete hospital
 * @route   DELETE /api/v1/hospitals/:id
 * @access  Private
 */
exports.deleteHospital = async (req, res, next) => {
  try {
    const hospital = await Hospital.findById(req.params.id);

    if (!hospital) {
      return next(
        new ErrorResponse(`Hospital not found with id of ${req.params.id}`, 404)
      );
    }

    await hospital.deleteOne();

    res.status(200).json({
      success: true,
      data: {}
    });
  } catch (err) {
    next(err);
  }
};

/**
 * @desc    Get hospital contacts
 * @route   GET /api/v1/hospitals/:id/contacts
 * @access  Private
 */
exports.getHospitalContacts = async (req, res, next) => {
  try {
    const hospital = await Hospital.findById(req.params.id);

    if (!hospital) {
      return next(
        new ErrorResponse(`Hospital not found with id of ${req.params.id}`, 404)
      );
    }

    const contacts = await HospitalContact.find({ hospital: req.params.id });

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
 * @desc    Get single hospital contact
 * @route   GET /api/v1/hospitals/:id/contacts/:contactId
 * @access  Private
 */
exports.getHospitalContact = async (req, res, next) => {
  try {
    const hospital = await Hospital.findById(req.params.id);

    if (!hospital) {
      return next(
        new ErrorResponse(`Hospital not found with id of ${req.params.id}`, 404)
      );
    }

    const contact = await HospitalContact.findById(req.params.contactId);

    if (!contact) {
      return next(
        new ErrorResponse(`Contact not found with id of ${req.params.contactId}`, 404)
      );
    }

    // Ensure contact belongs to the specified hospital
    if (contact.hospital.toString() !== req.params.id) {
      return next(
        new ErrorResponse(`Contact not found for this hospital`, 404)
      );
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
 * @desc    Add contact to hospital
 * @route   POST /api/v1/hospitals/:id/contacts
 * @access  Private
 */
exports.addHospitalContact = async (req, res, next) => {
  try {
    const hospital = await Hospital.findById(req.params.id);

    if (!hospital) {
      return next(
        new ErrorResponse(`Hospital not found with id of ${req.params.id}`, 404)
      );
    }

    // Set hospital ID
    req.body.hospital = req.params.id;

    // If this is primary contact, update other contacts to non-primary
    if (req.body.isPrimary) {
      await HospitalContact.updateMany(
        { hospital: req.params.id, isPrimary: true },
        { isPrimary: false }
      );
    }

    const contact = await HospitalContact.create(req.body);

    res.status(201).json({
      success: true,
      data: contact
    });
  } catch (err) {
    next(err);
  }
};

/**
 * @desc    Update hospital contact
 * @route   PUT /api/v1/hospitals/:id/contacts/:contactId
 * @access  Private
 */
exports.updateHospitalContact = async (req, res, next) => {
  try {
    const hospital = await Hospital.findById(req.params.id);

    if (!hospital) {
      return next(
        new ErrorResponse(`Hospital not found with id of ${req.params.id}`, 404)
      );
    }

    let contact = await HospitalContact.findById(req.params.contactId);

    if (!contact) {
      return next(
        new ErrorResponse(`Contact not found with id of ${req.params.contactId}`, 404)
      );
    }

    // Ensure contact belongs to the specified hospital
    if (contact.hospital.toString() !== req.params.id) {
      return next(
        new ErrorResponse(`Contact not found for this hospital`, 404)
      );
    }

    // Don't allow changing hospital
    delete req.body.hospital;

    // If setting as primary, update other contacts
    if (req.body.isPrimary) {
      await HospitalContact.updateMany(
        { hospital: req.params.id, isPrimary: true },
        { isPrimary: false }
      );
    }

    contact = await HospitalContact.findByIdAndUpdate(
      req.params.contactId,
      req.body,
      {
        new: true,
        runValidators: true
      }
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
 * @desc    Delete hospital contact
 * @route   DELETE /api/v1/hospitals/:id/contacts/:contactId
 * @access  Private
 */
exports.deleteHospitalContact = async (req, res, next) => {
  try {
    const hospital = await Hospital.findById(req.params.id);

    if (!hospital) {
      return next(
        new ErrorResponse(`Hospital not found with id of ${req.params.id}`, 404)
      );
    }

    const contact = await HospitalContact.findById(req.params.contactId);

    if (!contact) {
      return next(
        new ErrorResponse(`Contact not found with id of ${req.params.contactId}`, 404)
      );
    }

    // Ensure contact belongs to the specified hospital
    if (contact.hospital.toString() !== req.params.id) {
      return next(
        new ErrorResponse(`Contact not found for this hospital`, 404)
      );
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

// controllers/hospital.controller.js
const Hospital = require('../models/hospital.model');
const HospitalContact = require('../models/hospitalContact.model');
const HospitalDepartment = require('../models/hospitalDepartment.model');
const HospitalVisit = require('../models/hospitalVisit.model');
const HospitalAgreement = require('../models/hospitalAgreement.model');
const ErrorResponse = require('../utils/errorResponse');
const { logger } = require('../middlewares/logger.middleware');

/**
 * @desc    Get all hospitals
 * @route   GET /api/v1/hospitals
 * @access  Private
 */
exports.getHospitals = async (req, res, next) => {
  try {
    // Build filter
    const filter = {};
    
    // Filter by city if provided
    if (req.query.city) {
      filter.city = { $regex: req.query.city, $options: 'i' };
    }
    
    // Filter by state if provided
    if (req.query.state) {
      filter.state = { $regex: req.query.state, $options: 'i' };
    }
    
    // Filter by active status if provided
    if (req.query.isActive !== undefined) {
      filter.isActive = req.query.isActive === 'true';
    }

    // Pagination
    const page = parseInt(req.query.page, 10) || 1;
    const limit = parseInt(req.query.limit, 10) || 10;
    const startIndex = (page - 1) * limit;
    const endIndex = page * limit;
    const total = await Hospital.countDocuments(filter);

    // Get hospitals with pagination
    const hospitals = await Hospital.find(filter)
      .skip(startIndex)
      .limit(limit);

    // Pagination results
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
      count: hospitals.length,
      pagination,
      total,
      data: hospitals
    });
  } catch (err) {
    next(err);
  }
};

/**
 * @desc    Get single hospital
 * @route   GET /api/v1/hospitals/:id
 * @access  Private
 */
exports.getHospital = async (req, res, next) => {
  try {
    const hospital = await Hospital.findById(req.params.id);

    if (!hospital) {
      return next(
        new ErrorResponse(`Hospital not found with id of ${req.params.id}`, 404)
      );
    }

    res.status(200).json({
      success: true,
      data: hospital
    });
  } catch (err) {
    next(err);
  }
};

/**
 * @desc    Create new hospital
 * @route   POST /api/v1/hospitals
 * @access  Private
 */
exports.createHospital = async (req, res, next) => {
  try {
    // Add user to request body as creator
    req.body.createdBy = req.user.id;

    const hospital = await Hospital.create(req.body);

    res.status(201).json({
      success: true,
      data: hospital
    });
  } catch (err) {
    next(err);
  }
};

/**
 * @desc    Update hospital
 * @route   PUT /api/v1/hospitals/:id
 * @access  Private
 */
exports.updateHospital = async (req, res, next) => {
  try {
    let hospital = await Hospital.findById(req.params.id);

    if (!hospital) {
      return next(
        new ErrorResponse(`Hospital not found with id of ${req.params.id}`, 404)
      );
    }

    hospital = await Hospital.findByIdAndUpdate(
      req.params.id,
      req.body,
      {
        new: true,
        runValidators: true
      }
    );

    res.status(200).json({
      success: true,
      data: hospital
    });
  } catch (err) {
    next(err);
  }
};

/**
 * @desc    Delete hospital
 * @route   DELETE /api/v1/hospitals/:id
 * @access  Private
 */
exports.deleteHospital = async (req, res, next) => {
  try {
    const hospital = await Hospital.findById(req.params.id);

    if (!hospital) {
      return next(
        new ErrorResponse(`Hospital not found with id of ${req.params.id}`, 404)
      );
    }

    await hospital.deleteOne();

    res.status(200).json({
      success: true,
      data: {}
    });
  } catch (err) {
    next(err);
  }
};

/**
 * @desc    Get hospital contacts
 * @route   GET /api/v1/hospitals/:id/contacts
 * @access  Private
 */
exports.getHospitalContacts = async (req, res, next) => {
  try {
    const hospital = await Hospital.findById(req.params.id);

    if (!hospital) {
      return next(
        new ErrorResponse(`Hospital not found with id of ${req.params.id}`, 404)
      );
    }

    const contacts = await HospitalContact.find({ hospital: req.params.id });

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
 * @desc    Get single hospital contact
 * @route   GET /api/v1/hospitals/:id/contacts/:contactId
 * @access  Private
 */
exports.getHospitalContact = async (req, res, next) => {
  try {
    const hospital = await Hospital.findById(req.params.id);

    if (!hospital) {
      return next(
        new ErrorResponse(`Hospital not found with id of ${req.params.id}`, 404)
      );
    }

    const contact = await HospitalContact.findById(req.params.contactId);

    if (!contact) {
      return next(
        new ErrorResponse(`Contact not found with id of ${req.params.contactId}`, 404)
      );
    }

    // Ensure contact belongs to the specified hospital
    if (contact.hospital.toString() !== req.params.id) {
      return next(
        new ErrorResponse(`Contact not found for this hospital`, 404)
      );
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
 * @desc    Add contact to hospital
 * @route   POST /api/v1/hospitals/:id/contacts
 * @access  Private
 */
exports.addHospitalContact = async (req, res, next) => {
  try {
    const hospital = await Hospital.findById(req.params.id);

    if (!hospital) {
      return next(
        new ErrorResponse(`Hospital not found with id of ${req.params.id}`, 404)
      );
    }

    // Set hospital ID
    req.body.hospital = req.params.id;

    // If this is primary contact, update other contacts to non-primary
    if (req.body.isPrimary) {
      await HospitalContact.updateMany(
        { hospital: req.params.id, isPrimary: true },
        { isPrimary: false }
      );
    }

    const contact = await HospitalContact.create(req.body);

    res.status(201).json({
      success: true,
      data: contact
    });
  } catch (err) {
    next(err);
  }
};

/**
 * @desc    Update hospital contact
 * @route   PUT /api/v1/hospitals/:id/contacts/:contactId
 * @access  Private
 */
exports.updateHospitalContact = async (req, res, next) => {
  try {
    const hospital = await Hospital.findById(req.params.id);

    if (!hospital) {
      return next(
        new ErrorResponse(`Hospital not found with id of ${req.params.id}`, 404)
      );
    }

    let contact = await HospitalContact.findById(req.params.contactId);

    if (!contact) {
      return next(
        new ErrorResponse(`Contact not found with id of ${req.params.contactId}`, 404)
      );
    }

    // Ensure contact belongs to the specified hospital
    if (contact.hospital.toString() !== req.params.id) {
      return next(
        new ErrorResponse(`Contact not found for this hospital`, 404)
      );
    }

    // Don't allow changing hospital
    delete req.body.hospital;

    // If setting as primary, update other contacts
    if (req.body.isPrimary) {
      await HospitalContact.updateMany(
        { hospital: req.params.id, isPrimary: true },
        { isPrimary: false }
      );
    }

    contact = await HospitalContact.findByIdAndUpdate(
      req.params.contactId,
      req.body,
      {
        new: true,
        runValidators: true
      }
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
 * @desc    Delete hospital contact
 * @route   DELETE /api/v1/hospitals/:id/contacts/:contactId
 * @access  Private
 */
exports.deleteHospitalContact = async (req, res, next) => {
  try {
    const hospital = await Hospital.findById(req.params.id);

    if (!hospital) {
      return next(
        new ErrorResponse(`Hospital not found with id of ${req.params.id}`, 404)
      );
    }

    const contact = await HospitalContact.findById(req.params.contactId);

    if (!contact) {
      return next(
        new ErrorResponse(`Contact not found with id of ${req.params.contactId}`, 404)
      );
    }

    // Ensure contact belongs to the specified hospital
    if (contact.hospital.toString() !== req.params.id) {
      return next(
        new ErrorResponse(`Contact not found for this hospital`, 404)
      );
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