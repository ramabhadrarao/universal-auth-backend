// controllers/doctor.controller.js
const Doctor = require('../models/doctor.model');
const DoctorHospitalAssociation = require('../models/doctorHospitalAssociation.model');
const DoctorSpecialty = require('../models/doctorSpecialty.model');
const DoctorPreference = require('../models/doctorPreference.model');
const DoctorMeeting = require('../models/doctorMeeting.model');
const DoctorDocument = require('../models/doctorDocument.model');
const ErrorResponse = require('../utils/errorResponse');
const { logger } = require('../middlewares/logger.middleware');

/**
 * @desc    Get all doctors
 * @route   GET /api/v1/doctors
 * @access  Private
 */
exports.getDoctors = async (req, res, next) => {
  try {
    // Build filter
    const filter = {};
    
    // Filter by hospital if provided
    if (req.query.hospital) {
      filter.hospital = req.query.hospital;
    }
    
    // Filter by specialization if provided
    if (req.query.specialization) {
      filter.specialization = { $regex: req.query.specialization, $options: 'i' };
    }
    
    // Filter by location if provided
    if (req.query.location) {
      filter.location = { $regex: req.query.location, $options: 'i' };
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
    const total = await Doctor.countDocuments(filter);

    // Get doctors with pagination
    const doctors = await Doctor.find(filter)
      .populate('hospital', 'name')
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
      count: doctors.length,
      pagination,
      total,
      data: doctors
    });
  } catch (err) {
    next(err);
  }
};

/**
 * @desc    Get single doctor
 * @route   GET /api/v1/doctors/:id
 * @access  Private
 */
exports.getDoctor = async (req, res, next) => {
  try {
    const doctor = await Doctor.findById(req.params.id)
      .populate('hospital', 'name');

    if (!doctor) {
      return next(
        new ErrorResponse(`Doctor not found with id of ${req.params.id}`, 404)
      );
    }

    res.status(200).json({
      success: true,
      data: doctor
    });
  } catch (err) {
    next(err);
  }
};

/**
 * @desc    Create new doctor
 * @route   POST /api/v1/doctors
 * @access  Private
 */
exports.createDoctor = async (req, res, next) => {
  try {
    // Add user to request body as creator
    req.body.createdBy = req.user.id;

    const doctor = await Doctor.create(req.body);

    res.status(201).json({
      success: true,
      data: doctor
    });
  } catch (err) {
    next(err);
  }
};

/**
 * @desc    Update doctor
 * @route   PUT /api/v1/doctors/:id
 * @access  Private
 */
exports.updateDoctor = async (req, res, next) => {
  try {
    let doctor = await Doctor.findById(req.params.id);

    if (!doctor) {
      return next(
        new ErrorResponse(`Doctor not found with id of ${req.params.id}`, 404)
      );
    }

    doctor = await Doctor.findByIdAndUpdate(
      req.params.id,
      req.body,
      {
        new: true,
        runValidators: true
      }
    );

    res.status(200).json({
      success: true,
      data: doctor
    });
  } catch (err) {
    next(err);
  }
};

/**
 * @desc    Delete doctor
 * @route   DELETE /api/v1/doctors/:id
 * @access  Private
 */
exports.deleteDoctor = async (req, res, next) => {
  try {
    const doctor = await Doctor.findById(req.params.id);

    if (!doctor) {
      return next(
        new ErrorResponse(`Doctor not found with id of ${req.params.id}`, 404)
      );
    }

    // Check if doctor has cases before allowing deletion
    // This requires the CaseHistory model which needs to be implemented
    // For now, just check if doctor has committed cases
    if (doctor.committedCases > 0) {
      return next(
        new ErrorResponse(`Cannot delete doctor with committed cases`, 400)
      );
    }

    await doctor.deleteOne();

    res.status(200).json({
      success: true,
      data: {}
    });
  } catch (err) {
    next(err);
  }
};

/**
 * @desc    Get doctor hospital associations
 * @route   GET /api/v1/doctors/:id/associations
 * @access  Private
 */
exports.getDoctorAssociations = async (req, res, next) => {
  try {
    const doctor = await Doctor.findById(req.params.id);

    if (!doctor) {
      return next(
        new ErrorResponse(`Doctor not found with id of ${req.params.id}`, 404)
      );
    }

    const associations = await DoctorHospitalAssociation.find({ doctor: req.params.id })
      .populate('doctor', 'name')
      .populate('hospital', 'name');

    res.status(200).json({
      success: true,
      count: associations.length,
      data: associations
    });
  } catch (err) {
    next(err);
  }
};

/**
 * @desc    Add hospital association to doctor
 * @route   POST /api/v1/doctors/:id/associations
 * @access  Private
 */
exports.addDoctorAssociation = async (req, res, next) => {
  try {
    const doctor = await Doctor.findById(req.params.id);

    if (!doctor) {
      return next(
        new ErrorResponse(`Doctor not found with id of ${req.params.id}`, 404)
      );
    }

    // Check if association already exists
    const existingAssociation = await DoctorHospitalAssociation.findOne({
      doctor: req.params.id,
      hospital: req.body.hospital
    });

    if (existingAssociation) {
      return next(
        new ErrorResponse(`Association with this hospital already exists`, 400)
      );
    }

    // Set doctor ID
    req.body.doctor = req.params.id;

    // If this is primary, update other associations to non-primary
    if (req.body.isPrimary) {
      await DoctorHospitalAssociation.updateMany(
        { doctor: req.params.id, isPrimary: true },
        { isPrimary: false }
      );
      
      // Update doctor's primary hospital too
      await Doctor.findByIdAndUpdate(
        req.params.id,
        { hospital: req.body.hospital }
      );
    }

    const association = await DoctorHospitalAssociation.create(req.body);

    res.status(201).json({
      success: true,
      data: association
    });
  } catch (err) {
    next(err);
  }
};

/**
 * @desc    Update doctor hospital association
 * @route   PUT /api/v1/doctors/:id/associations/:associationId
 * @access  Private
 */
exports.updateDoctorAssociation = async (req, res, next) => {
  try {
    const doctor = await Doctor.findById(req.params.id);

    if (!doctor) {
      return next(
        new ErrorResponse(`Doctor not found with id of ${req.params.id}`, 404)
      );
    }

    let association = await DoctorHospitalAssociation.findById(req.params.associationId);

    if (!association) {
      return next(
        new ErrorResponse(`Association not found with id of ${req.params.associationId}`, 404)
      );
    }

    // Ensure association belongs to the specified doctor
    if (association.doctor.toString() !== req.params.id) {
      return next(
        new ErrorResponse(`Association not found for this doctor`, 404)
      );
    }

    // Don't allow changing doctor
    delete req.body.doctor;

    // If setting as primary, update other associations
    if (req.body.isPrimary) {
      await DoctorHospitalAssociation.updateMany(
        { doctor: req.params.id, isPrimary: true },
        { isPrimary: false }
      );
      
      // Update doctor's primary hospital too
      if (req.body.hospital) {
        await Doctor.findByIdAndUpdate(
          req.params.id,
          { hospital: req.body.hospital }
        );
      } else if (association.hospital) {
        await Doctor.findByIdAndUpdate(
          req.params.id,
          { hospital: association.hospital }
        );
      }
    }

    association = await DoctorHospitalAssociation.findByIdAndUpdate(
      req.params.associationId,
      req.body,
      {
        new: true,
        runValidators: true
      }
    ).populate('doctor', 'name')
      .populate('hospital', 'name');

    res.status(200).json({
      success: true,
      data: association
    });
  } catch (err) {
    next(err);
  }
};

/**
 * @desc    Delete doctor hospital association
 * @route   DELETE /api/v1/doctors/:id/associations/:associationId
 * @access  Private
 */
exports.deleteDoctorAssociation = async (req, res, next) => {
  try {
    const doctor = await Doctor.findById(req.params.id);

    if (!doctor) {
      return next(
        new ErrorResponse(`Doctor not found with id of ${req.params.id}`, 404)
      );
    }

    const association = await DoctorHospitalAssociation.findById(req.params.associationId);

    if (!association) {
      return next(
        new ErrorResponse(`Association not found with id of ${req.params.associationId}`, 404)
      );
    }

    // Ensure association belongs to the specified doctor
    if (association.doctor.toString() !== req.params.id) {
      return next(
        new ErrorResponse(`Association not found for this doctor`, 404)
      );
    }

    // If this was the primary association, update doctor's primary hospital
    if (association.isPrimary) {
      await Doctor.findByIdAndUpdate(
        req.params.id,
        { hospital: null }
      );
    }

    await association.deleteOne();

    res.status(200).json({
      success: true,
      data: {}
    });
  } catch (err) {
    next(err);
  }
};

/**
 * @desc    Get doctor specialties
 * @route   GET /api/v1/doctors/:id/specialties
 * @access  Private
 */
exports.getDoctorSpecialties = async (req, res, next) => {
  try {
    const doctor = await Doctor.findById(req.params.id);

    if (!doctor) {
      return next(
        new ErrorResponse(`Doctor not found with id of ${req.params.id}`, 404)
      );
    }

    const specialties = await DoctorSpecialty.find({ doctor: req.params.id });

    res.status(200).json({
      success: true,
      count: specialties.length,
      data: specialties
    });
  } catch (err) {
    next(err);
  }
};

/**
 * @desc    Add specialty to doctor
 * @route   POST /api/v1/doctors/:id/specialties
 * @access  Private
 */
exports.addDoctorSpecialty = async (req, res, next) => {
  try {
    const doctor = await Doctor.findById(req.params.id);

    if (!doctor) {
      return next(
        new ErrorResponse(`Doctor not found with id of ${req.params.id}`, 404)
      );
    }

    // Set doctor ID
    req.body.doctor = req.params.id;

    const specialty = await DoctorSpecialty.create(req.body);

    res.status(201).json({
      success: true,
      data: specialty
    });
  } catch (err) {
    next(err);
  }
};

/**
 * @desc    Update doctor specialty
 * @route   PUT /api/v1/doctors/:id/specialties/:specialtyId
 * @access  Private
 */
exports.updateDoctorSpecialty = async (req, res, next) => {
  try {
    const doctor = await Doctor.findById(req.params.id);

    if (!doctor) {
      return next(
        new ErrorResponse(`Doctor not found with id of ${req.params.id}`, 404)
      );
    }

    let specialty = await DoctorSpecialty.findById(req.params.specialtyId);

    if (!specialty) {
      return next(
        new ErrorResponse(`Specialty not found with id of ${req.params.specialtyId}`, 404)
      );
    }

    // Ensure specialty belongs to the specified doctor
    if (specialty.doctor.toString() !== req.params.id) {
      return next(
        new ErrorResponse(`Specialty not found for this doctor`, 404)
      );
    }

    // Don't allow changing doctor
    delete req.body.doctor;

    specialty = await DoctorSpecialty.findByIdAndUpdate(
      req.params.specialtyId,
      req.body,
      {
        new: true,
        runValidators: true
      }
    );

    res.status(200).json({
      success: true,
      data: specialty
    });
  } catch (err) {
    next(err);
  }
};

/**
 * @desc    Delete doctor specialty
 * @route   DELETE /api/v1/doctors/:id/specialties/:specialtyId
 * @access  Private
 */
exports.deleteDoctorSpecialty = async (req, res, next) => {
  try {
    const doctor = await Doctor.findById(req.params.id);

    if (!doctor) {
      return next(
        new ErrorResponse(`Doctor not found with id of ${req.params.id}`, 404)
      );
    }

    const specialty = await DoctorSpecialty.findById(req.params.specialtyId);

    if (!specialty) {
      return next(
        new ErrorResponse(`Specialty not found with id of ${req.params.specialtyId}`, 404)
      );
    }

    // Ensure specialty belongs to the specified doctor
    if (specialty.doctor.toString() !== req.params.id) {
      return next(
        new ErrorResponse(`Specialty not found for this doctor`, 404)
      );
    }

    await specialty.deleteOne();

    res.status(200).json({
      success: true,
      data: {}
    });
  } catch (err) {
    next(err);
  }
};

/**
 * @desc    Get doctor preferences
 * @route   GET /api/v1/doctors/:id/preferences
 * @access  Private
 */
exports.getDoctorPreferences = async (req, res, next) => {
  try {
    const doctor = await Doctor.findById(req.params.id);

    if (!doctor) {
      return next(
        new ErrorResponse(`Doctor not found with id of ${req.params.id}`, 404)
      );
    }

    const preferences = await DoctorPreference.find({ doctor: req.params.id })
      .populate('doctor', 'name')
      .populate('category', 'name')
      .populate('subcategory', 'name')
      .populate('product', 'name productCode');

    res.status(200).json({
      success: true,
      count: preferences.length,
      data: preferences
    });
  } catch (err) {
    next(err);
  }
};

/**
 * @desc    Add preference to doctor
 * @route   POST /api/v1/doctors/:id/preferences
 * @access  Private
 */
exports.addDoctorPreference = async (req, res, next) => {
  try {
    const doctor = await Doctor.findById(req.params.id);

    if (!doctor) {
      return next(
        new ErrorResponse(`Doctor not found with id of ${req.params.id}`, 404)
      );
    }

    // Set doctor ID
    req.body.doctor = req.params.id;

    const preference = await DoctorPreference.create(req.body);

    res.status(201).json({
      success: true,
      data: preference
    });
  } catch (err) {
    next(err);
  }
};

/**
 * @desc    Update doctor preference
 * @route   PUT /api/v1/doctors/:id/preferences/:preferenceId
 * @access  Private
 */
exports.updateDoctorPreference = async (req, res, next) => {
  try {
    const doctor = await Doctor.findById(req.params.id);

    if (!doctor) {
      return next(
        new ErrorResponse(`Doctor not found with id of ${req.params.id}`, 404)
      );
    }

    let preference = await DoctorPreference.findById(req.params.preferenceId);

    if (!preference) {
      return next(
        new ErrorResponse(`Preference not found with id of ${req.params.preferenceId}`, 404)
      );
    }

    // Ensure preference belongs to the specified doctor
    if (preference.doctor.toString() !== req.params.id) {
      return next(
        new ErrorResponse(`Preference not found for this doctor`, 404)
      );
    }

    // Don't allow changing doctor
    delete req.body.doctor;

    preference = await DoctorPreference.findByIdAndUpdate(
      req.params.preferenceId,
      req.body,
      {
        new: true,
        runValidators: true
      }
    );

    res.status(200).json({
      success: true,
      data: preference
    });
  } catch (err) {
    next(err);
  }
};

/**
 * @desc    Delete doctor preference
 * @route   DELETE /api/v1/doctors/:id/preferences/:preferenceId
 * @access  Private
 */
exports.deleteDoctorPreference = async (req, res, next) => {
  try {
    const doctor = await Doctor.findById(req.params.id);

    if (!doctor) {
      return next(
        new ErrorResponse(`Doctor not found with id of ${req.params.id}`, 404)
      );
    }

    const preference = await DoctorPreference.findById(req.params.preferenceId);

    if (!preference) {
      return next(
        new ErrorResponse(`Preference not found with id of ${req.params.preferenceId}`, 404)
      );
    }

    // Ensure preference belongs to the specified doctor
    if (preference.doctor.toString() !== req.params.id) {
      return next(
        new ErrorResponse(`Preference not found for this doctor`, 404)
      );
    }

    await preference.deleteOne();

    res.status(200).json({
      success: true,
      data: {}
    });
  } catch (err) {
    next(err);
  }
};

/**
 * @desc    Get doctor meetings
 * @route   GET /api/v1/doctors/:id/meetings
 * @access  Private
 */
exports.getDoctorMeetings = async (req, res, next) => {
  try {
    const doctor = await Doctor.findById(req.params.id);

    if (!doctor) {
      return next(
        new ErrorResponse(`Doctor not found with id of ${req.params.id}`, 404)
      );
    }

    // Add filtering options
    const filter = { doctor: req.params.id };
    
    // Filter by date range
    if (req.query.startDate) {
      filter.meeting_date = { $gte: new Date(req.query.startDate) };
    }
    
    if (req.query.endDate) {
      filter.meeting_date = filter.meeting_date || {};
      filter.meeting_date.$lte = new Date(req.query.endDate);
    }
    
    // Filter by status
    if (req.query.status) {
      filter.status = req.query.status;
    }

    const meetings = await DoctorMeeting.find(filter)
      .populate('doctor', 'name')
      .populate('user', 'name')
      .sort({ meeting_date: -1 });

    res.status(200).json({
      success: true,
      count: meetings.length,
      data: meetings
    });
  } catch (err) {
    next(err);
  }
};

/**
 * @desc    Add meeting with doctor
 * @route   POST /api/v1/doctors/:id/meetings
 * @access  Private
 */
exports.addDoctorMeeting = async (req, res, next) => {
  try {
    const doctor = await Doctor.findById(req.params.id);

    if (!doctor) {
      return next(
        new ErrorResponse(`Doctor not found with id of ${req.params.id}`, 404)
      );
    }

    // Set doctor ID and user ID
    req.body.doctor = req.params.id;
    req.body.user = req.user.id;

    const meeting = await DoctorMeeting.create(req.body);

    res.status(201).json({
      success: true,
      data: meeting
    });
  } catch (err) {
    next(err);
  }
};

/**
 * @desc    Update doctor meeting
 * @route   PUT /api/v1/doctors/:id/meetings/:meetingId
 * @access  Private
 */
exports.updateDoctorMeeting = async (req, res, next) => {
  try {
    const doctor = await Doctor.findById(req.params.id);

    if (!doctor) {
      return next(
        new ErrorResponse(`Doctor not found with id of ${req.params.id}`, 404)
      );
    }

    let meeting = await DoctorMeeting.findById(req.params.meetingId);

    if (!meeting) {
      return next(
        new ErrorResponse(`Meeting not found with id of ${req.params.meetingId}`, 404)
      );
    }

    // Ensure meeting belongs to the specified doctor
    if (meeting.doctor.toString() !== req.params.id) {
      return next(
        new ErrorResponse(`Meeting not found for this doctor`, 404)
      );
    }

    // Check if user is authorized to update this meeting
    if (meeting.user.toString() !== req.user.id && !req.user.roles.includes('admin')) {
      return next(
        new ErrorResponse(`Not authorized to update this meeting`, 403)
      );
    }

    // Don't allow changing doctor or user
    delete req.body.doctor;
    delete req.body.user;

    meeting = await DoctorMeeting.findByIdAndUpdate(
      req.params.meetingId,
      req.body,
      {
        new: true,
        runValidators: true
      }
    ).populate('doctor', 'name')
      .populate('user', 'name');

    res.status(200).json({
      success: true,
      data: meeting
    });
  } catch (err) {
    next(err);
  }
};

/**
 * @desc    Delete doctor meeting
 * @route   DELETE /api/v1/doctors/:id/meetings/:meetingId
 * @access  Private
 */
exports.deleteDoctorMeeting = async (req, res, next) => {
  try {
    const doctor = await Doctor.findById(req.params.id);

    if (!doctor) {
      return next(
        new ErrorResponse(`Doctor not found with id of ${req.params.id}`, 404)
      );
    }

    const meeting = await DoctorMeeting.findById(req.params.meetingId);

    if (!meeting) {
      return next(
        new ErrorResponse(`Meeting not found with id of ${req.params.meetingId}`, 404)
      );
    }

    // Ensure meeting belongs to the specified doctor
    if (meeting.doctor.toString() !== req.params.id) {
      return next(
        new ErrorResponse(`Meeting not found for this doctor`, 404)
      );
    }

    // Check if user is authorized to delete this meeting
    if (meeting.user.toString() !== req.user.id && !req.user.roles.includes('admin')) {
      return next(
        new ErrorResponse(`Not authorized to delete this meeting`, 403)
      );
    }

    await meeting.deleteOne();

    res.status(200).json({
      success: true,
      data: {}
    });
  } catch (err) {
    next(err);
  }
};

/**
 * @desc    Get doctor documents
 * @route   GET /api/v1/doctors/:id/documents
 * @access  Private
 */
exports.getDoctorDocuments = async (req, res, next) => {
  try {
    const doctor = await Doctor.findById(req.params.id);

    if (!doctor) {
      return next(
        new ErrorResponse(`Doctor not found with id of ${req.params.id}`, 404)
      );
    }

    // Filter by document type if provided
    const filter = { doctor: req.params.id };
    if (req.query.documentType) {
      filter.documentType = req.query.documentType;
    }

    const documents = await DoctorDocument.find(filter)
      .populate('doctor', 'name')
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
 * @desc    Upload document for doctor
 * @route   POST /api/v1/doctors/:id/documents
 * @access  Private
 */
exports.uploadDoctorDocument = async (req, res, next) => {
  try {
    const doctor = await Doctor.findById(req.params.id);

    if (!doctor) {
      return next(
        new ErrorResponse(`Doctor not found with id of ${req.params.id}`, 404)
      );
    }

    // Set doctor ID and uploaded by
    req.body.doctor = req.params.id;
    req.body.uploadedBy = req.user.id;
    req.body.uploadedAt = Date.now();

    const document = await DoctorDocument.create(req.body);

    res.status(201).json({
      success: true,
      data: document
    });
  } catch (err) {
    next(err);
  }
};

/**
 * @desc    Get doctors by specialization
 * @route   GET /api/v1/doctors/specialty/:specialization
 * @access  Private
 */
exports.getDoctorsBySpecialization = async (req, res, next) => {
  try {
    const doctors = await Doctor.find({
      specialization: { $regex: req.params.specialization, $options: 'i' }
    }).populate('hospital', 'name');

    res.status(200).json({
      success: true,
      count: doctors.length,
      data: doctors
    });
  } catch (err) {
    next(err);
  }
};

/**
 * @desc    Get doctors by hospital
 * @route   GET /api/v1/doctors/hospital/:hospitalId
 * @access  Private
 */
exports.getDoctorsByHospital = async (req, res, next) => {
  try {
    const doctors = await Doctor.find({
      hospital: req.params.hospitalId
    });

    res.status(200).json({
      success: true,
      count: doctors.length,
      data: doctors
    });
  } catch (err) {
    next(err);
  }
};