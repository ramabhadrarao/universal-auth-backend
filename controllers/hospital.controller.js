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

/**
 * @desc    Set primary contact for hospital
 * @route   PUT /api/v1/hospitals/:id/contacts/:contactId/set-primary
 * @access  Private
 */
exports.setPrimaryContact = async (req, res, next) => {
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

    // Update all contacts to non-primary
    await HospitalContact.updateMany(
      { hospital: req.params.id },
      { isPrimary: false }
    );

    // Set specified contact as primary
    const updatedContact = await HospitalContact.findByIdAndUpdate(
      req.params.contactId,
      { isPrimary: true },
      {
        new: true,
        runValidators: true
      }
    );

    res.status(200).json({
      success: true,
      data: updatedContact
    });
  } catch (err) {
    next(err);
  }
};

/**
 * @desc    Get hospital departments
 * @route   GET /api/v1/hospitals/:id/departments
 * @access  Private
 */
exports.getHospitalDepartments = async (req, res, next) => {
  try {
    const hospital = await Hospital.findById(req.params.id);

    if (!hospital) {
      return next(
        new ErrorResponse(`Hospital not found with id of ${req.params.id}`, 404)
      );
    }

    const departments = await HospitalDepartment.find({ hospital: req.params.id });

    res.status(200).json({
      success: true,
      count: departments.length,
      data: departments
    });
  } catch (err) {
    next(err);
  }
};

/**
 * @desc    Add department to hospital
 * @route   POST /api/v1/hospitals/:id/departments
 * @access  Private
 */
exports.addHospitalDepartment = async (req, res, next) => {
  try {
    const hospital = await Hospital.findById(req.params.id);

    if (!hospital) {
      return next(
        new ErrorResponse(`Hospital not found with id of ${req.params.id}`, 404)
      );
    }

    // Set hospital ID
    req.body.hospital = req.params.id;

    const department = await HospitalDepartment.create(req.body);

    res.status(201).json({
      success: true,
      data: department
    });
  } catch (err) {
    next(err);
  }
};

/**
 * @desc    Update hospital department
 * @route   PUT /api/v1/hospitals/:id/departments/:departmentId
 * @access  Private
 */
exports.updateHospitalDepartment = async (req, res, next) => {
  try {
    const hospital = await Hospital.findById(req.params.id);

    if (!hospital) {
      return next(
        new ErrorResponse(`Hospital not found with id of ${req.params.id}`, 404)
      );
    }

    let department = await HospitalDepartment.findById(req.params.departmentId);

    if (!department) {
      return next(
        new ErrorResponse(`Department not found with id of ${req.params.departmentId}`, 404)
      );
    }

    // Ensure department belongs to the specified hospital
    if (department.hospital.toString() !== req.params.id) {
      return next(
        new ErrorResponse(`Department not found for this hospital`, 404)
      );
    }

    // Don't allow changing hospital
    delete req.body.hospital;

    department = await HospitalDepartment.findByIdAndUpdate(
      req.params.departmentId,
      req.body,
      {
        new: true,
        runValidators: true
      }
    );

    res.status(200).json({
      success: true,
      data: department
    });
  } catch (err) {
    next(err);
  }
};

/**
 * @desc    Delete hospital department
 * @route   DELETE /api/v1/hospitals/:id/departments/:departmentId
 * @access  Private
 */
exports.deleteHospitalDepartment = async (req, res, next) => {
  try {
    const hospital = await Hospital.findById(req.params.id);

    if (!hospital) {
      return next(
        new ErrorResponse(`Hospital not found with id of ${req.params.id}`, 404)
      );
    }

    const department = await HospitalDepartment.findById(req.params.departmentId);

    if (!department) {
      return next(
        new ErrorResponse(`Department not found with id of ${req.params.departmentId}`, 404)
      );
    }

    // Ensure department belongs to the specified hospital
    if (department.hospital.toString() !== req.params.id) {
      return next(
        new ErrorResponse(`Department not found for this hospital`, 404)
      );
    }

    await department.deleteOne();

    res.status(200).json({
      success: true,
      data: {}
    });
  } catch (err) {
    next(err);
  }
};

/**
 * @desc    Get hospital visits
 * @route   GET /api/v1/hospitals/:id/visits
 * @access  Private
 */
exports.getHospitalVisits = async (req, res, next) => {
  try {
    const hospital = await Hospital.findById(req.params.id);

    if (!hospital) {
      return next(
        new ErrorResponse(`Hospital not found with id of ${req.params.id}`, 404)
      );
    }

    const filter = { hospital: req.params.id };
    
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

    const visits = await HospitalVisit.find(filter)
      .populate('visitor', 'name')
      .sort({ visitDate: -1 });

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
 * @route   GET /api/v1/hospitals/:id/visits/:visitId
 * @access  Private
 */
exports.getHospitalVisit = async (req, res, next) => {
  try {
    const hospital = await Hospital.findById(req.params.id);

    if (!hospital) {
      return next(
        new ErrorResponse(`Hospital not found with id of ${req.params.id}`, 404)
      );
    }

    const visit = await HospitalVisit.findById(req.params.visitId)
      .populate('visitor', 'name');

    if (!visit) {
      return next(
        new ErrorResponse(`Visit not found with id of ${req.params.visitId}`, 404)
      );
    }

    // Ensure visit belongs to the specified hospital
    if (visit.hospital.toString() !== req.params.id) {
      return next(
        new ErrorResponse(`Visit not found for this hospital`, 404)
      );
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
 * @desc    Add visit to hospital
 * @route   POST /api/v1/hospitals/:id/visits
 * @access  Private
 */
exports.addHospitalVisit = async (req, res, next) => {
  try {
    const hospital = await Hospital.findById(req.params.id);

    if (!hospital) {
      return next(
        new ErrorResponse(`Hospital not found with id of ${req.params.id}`, 404)
      );
    }

    // Set hospital ID and visitor
    req.body.hospital = req.params.id;
    req.body.visitor = req.user.id;

    const visit = await HospitalVisit.create(req.body);

    res.status(201).json({
      success: true,
      data: visit
    });
  } catch (err) {
    next(err);
  }
};

/**
 * @desc    Update hospital visit
 * @route   PUT /api/v1/hospitals/:id/visits/:visitId
 * @access  Private
 */
exports.updateHospitalVisit = async (req, res, next) => {
  try {
    const hospital = await Hospital.findById(req.params.id);

    if (!hospital) {
      return next(
        new ErrorResponse(`Hospital not found with id of ${req.params.id}`, 404)
      );
    }

    let visit = await HospitalVisit.findById(req.params.visitId);

    if (!visit) {
      return next(
        new ErrorResponse(`Visit not found with id of ${req.params.visitId}`, 404)
      );
    }

    // Ensure visit belongs to the specified hospital
    if (visit.hospital.toString() !== req.params.id) {
      return next(
        new ErrorResponse(`Visit not found for this hospital`, 404)
      );
    }

    // Users can only update their own visits unless they're admins
    if (visit.visitor.toString() !== req.user.id && !req.user.roles.includes('admin')) {
      return next(
        new ErrorResponse(`Not authorized to update this visit`, 403)
      );
    }

    // Don't allow changing hospital or visitor
    delete req.body.hospital;
    delete req.body.visitor;

    visit = await HospitalVisit.findByIdAndUpdate(
      req.params.visitId,
      req.body,
      {
        new: true,
        runValidators: true
      }
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
 * @desc    Delete hospital visit
 * @route   DELETE /api/v1/hospitals/:id/visits/:visitId
 * @access  Private
 */
exports.deleteHospitalVisit = async (req, res, next) => {
  try {
    const hospital = await Hospital.findById(req.params.id);

    if (!hospital) {
      return next(
        new ErrorResponse(`Hospital not found with id of ${req.params.id}`, 404)
      );
    }

    const visit = await HospitalVisit.findById(req.params.visitId);

    if (!visit) {
      return next(
        new ErrorResponse(`Visit not found with id of ${req.params.visitId}`, 404)
      );
    }

    // Ensure visit belongs to the specified hospital
    if (visit.hospital.toString() !== req.params.id) {
      return next(
        new ErrorResponse(`Visit not found for this hospital`, 404)
      );
    }

    // Users can only delete their own visits unless they're admins
    if (visit.visitor.toString() !== req.user.id && !req.user.roles.includes('admin')) {
      return next(
        new ErrorResponse(`Not authorized to delete this visit`, 403)
      );
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
 * @desc    Get hospital agreements
 * @route   GET /api/v1/hospitals/:id/agreements
 * @access  Private
 */
exports.getHospitalAgreements = async (req, res, next) => {
  try {
    const hospital = await Hospital.findById(req.params.id);

    if (!hospital) {
      return next(
        new ErrorResponse(`Hospital not found with id of ${req.params.id}`, 404)
      );
    }

    // Add filtering options
    const filter = { hospital: req.params.id };
    
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

    const agreements = await HospitalAgreement.find(filter)
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
 * @route   GET /api/v1/hospitals/:id/agreements/:agreementId
 * @access  Private
 */
exports.getHospitalAgreement = async (req, res, next) => {
  try {
    const hospital = await Hospital.findById(req.params.id);

    if (!hospital) {
      return next(
        new ErrorResponse(`Hospital not found with id of ${req.params.id}`, 404)
      );
    }

    const agreement = await HospitalAgreement.findById(req.params.agreementId)
      .populate('createdBy', 'name');

    if (!agreement) {
      return next(
        new ErrorResponse(`Agreement not found with id of ${req.params.agreementId}`, 404)
      );
    }

    // Ensure agreement belongs to the specified hospital
    if (agreement.hospital.toString() !== req.params.id) {
      return next(
        new ErrorResponse(`Agreement not found for this hospital`, 404)
      );
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
 * @desc    Add agreement to hospital
 * @route   POST /api/v1/hospitals/:id/agreements
 * @access  Private
 */
exports.addHospitalAgreement = async (req, res, next) => {
  try {
    const hospital = await Hospital.findById(req.params.id);

    if (!hospital) {
      return next(
        new ErrorResponse(`Hospital not found with id of ${req.params.id}`, 404)
      );
    }

    // Set hospital ID and creator
    req.body.hospital = req.params.id;
    req.body.createdBy = req.user.id;

    const agreement = await HospitalAgreement.create(req.body);

    res.status(201).json({
      success: true,
      data: agreement
    });
  } catch (err) {
    next(err);
  }
};

/**
 * @desc    Update hospital agreement
 * @route   PUT /api/v1/hospitals/:id/agreements/:agreementId
 * @access  Private
 */
exports.updateHospitalAgreement = async (req, res, next) => {
  try {
    const hospital = await Hospital.findById(req.params.id);

    if (!hospital) {
      return next(
        new ErrorResponse(`Hospital not found with id of ${req.params.id}`, 404)
      );
    }

    let agreement = await HospitalAgreement.findById(req.params.agreementId);

    if (!agreement) {
      return next(
        new ErrorResponse(`Agreement not found with id of ${req.params.agreementId}`, 404)
      );
    }

    // Ensure agreement belongs to the specified hospital
    if (agreement.hospital.toString() !== req.params.id) {
      return next(
        new ErrorResponse(`Agreement not found for this hospital`, 404)
      );
    }

    // Don't allow changing hospital
    delete req.body.hospital;
    delete req.body.createdBy;

    agreement = await HospitalAgreement.findByIdAndUpdate(
      req.params.agreementId,
      req.body,
      {
        new: true,
        runValidators: true
      }
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
 * @desc    Delete hospital agreement
 * @route   DELETE /api/v1/hospitals/:id/agreements/:agreementId
 * @access  Private
 */
exports.deleteHospitalAgreement = async (req, res, next) => {
  try {
    const hospital = await Hospital.findById(req.params.id);

    if (!hospital) {
      return next(
        new ErrorResponse(`Hospital not found with id of ${req.params.id}`, 404)
      );
    }

    const agreement = await HospitalAgreement.findById(req.params.agreementId);

    if (!agreement) {
      return next(
        new ErrorResponse(`Agreement not found with id of ${req.params.agreementId}`, 404)
      );
    }

    // Ensure agreement belongs to the specified hospital
    if (agreement.hospital.toString() !== req.params.id) {
      return next(
        new ErrorResponse(`Agreement not found for this hospital`, 404)
      );
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
 * @route   PUT /api/v1/hospitals/:id/agreements/:agreementId/status
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
    
    const hospital = await Hospital.findById(req.params.id);

    if (!hospital) {
      return next(
        new ErrorResponse(`Hospital not found with id of ${req.params.id}`, 404)
      );
    }

    let agreement = await HospitalAgreement.findById(req.params.agreementId);

    if (!agreement) {
      return next(
        new ErrorResponse(`Agreement not found with id of ${req.params.agreementId}`, 404)
      );
    }

    // Ensure agreement belongs to the specified hospital
    if (agreement.hospital.toString() !== req.params.id) {
      return next(
        new ErrorResponse(`Agreement not found for this hospital`, 404)
      );
    }

    agreement = await HospitalAgreement.findByIdAndUpdate(
      req.params.agreementId,
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
 * @desc    Get hospitals by city
 * @route   GET /api/v1/hospitals/by-city/:city
 * @access  Private
 */
exports.getHospitalsByCity = async (req, res, next) => {
    try {
      const hospitals = await Hospital.find({
        city: { $regex: req.params.city, $options: 'i' }
      });
  
      res.status(200).json({
        success: true,
        count: hospitals.length,
        data: hospitals
      });
    } catch (err) {
      next(err);
    }
  };
  
  /**
   * @desc    Get hospitals by state
   * @route   GET /api/v1/hospitals/by-state/:state
   * @access  Private
   */
  exports.getHospitalsByState = async (req, res, next) => {
    try {
      const hospitals = await Hospital.find({
        state: { $regex: req.params.state, $options: 'i' }
      });
  
      res.status(200).json({
        success: true,
        count: hospitals.length,
        data: hospitals
      });
    } catch (err) {
      next(err);
    }
  };
  
  /**
   * @desc    Get upcoming visits
   * @route   GET /api/v1/hospitals/upcoming-visits
   * @access  Private
   */
  exports.getUpcomingVisits = async (req, res, next) => {
    try {
      const today = new Date();
      
      // Get future visits
      const upcomingVisits = await HospitalVisit.find({
        visitDate: { $gte: today },
        status: { $ne: 'Cancelled' }
      })
        .populate('hospital', 'name')
        .populate('visitor', 'name')
        .sort('visitDate');
      
      // Get pending follow-ups
      const pendingFollowUps = await HospitalVisit.find({
        followUpDate: { $gte: today },
        status: 'Completed'
      })
        .populate('hospital', 'name')
        .populate('visitor', 'name')
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