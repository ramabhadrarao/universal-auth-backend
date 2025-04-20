// routes/doctor.routes.js
const express = require('express');
const router = express.Router();

const {
  getDoctors,
  getDoctor,
  createDoctor,
  updateDoctor,
  deleteDoctor,
  getDoctorAssociations,
  addDoctorAssociation,
  updateDoctorAssociation,
  deleteDoctorAssociation,
  getDoctorSpecialties,
  addDoctorSpecialty,
  updateDoctorSpecialty,
  deleteDoctorSpecialty,
  getDoctorPreferences,
  addDoctorPreference,
  updateDoctorPreference,
  deleteDoctorPreference,
  getDoctorMeetings,
  addDoctorMeeting,
  updateDoctorMeeting,
  deleteDoctorMeeting,
  getDoctorDocuments,
  uploadDoctorDocument,
  getDoctorsBySpecialization,
  getDoctorsByHospital
} = require('../controllers/doctor.controller');

const { protect, authorize } = require('../middlewares/auth.middleware');

// Protect all routes
router.use(protect);

// Special routes
router.route('/specialty/:specialization')
  .get(getDoctorsBySpecialization);

router.route('/hospital/:hospitalId')
  .get(getDoctorsByHospital);

// Main doctor routes
router.route('/')
  .get(getDoctors)
  .post(authorize('admin'), createDoctor);

router.route('/:id')
  .get(getDoctor)
  .put(authorize('admin'), updateDoctor)
  .delete(authorize('admin'), deleteDoctor);

// Hospital associations routes
router.route('/:id/associations')
  .get(getDoctorAssociations)
  .post(authorize('admin'), addDoctorAssociation);

router.route('/:id/associations/:associationId')
  .put(authorize('admin'), updateDoctorAssociation)
  .delete(authorize('admin'), deleteDoctorAssociation);

// Specialties routes
router.route('/:id/specialties')
  .get(getDoctorSpecialties)
  .post(authorize('admin'), addDoctorSpecialty);

router.route('/:id/specialties/:specialtyId')
  .put(authorize('admin'), updateDoctorSpecialty)
  .delete(authorize('admin'), deleteDoctorSpecialty);

// Preferences routes
router.route('/:id/preferences')
  .get(getDoctorPreferences)
  .post(authorize('admin'), addDoctorPreference);

router.route('/:id/preferences/:preferenceId')
  .put(authorize('admin'), updateDoctorPreference)
  .delete(authorize('admin'), deleteDoctorPreference);

// Meetings routes
router.route('/:id/meetings')
  .get(getDoctorMeetings)
  .post(addDoctorMeeting);

router.route('/:id/meetings/:meetingId')
  .put(updateDoctorMeeting)
  .delete(deleteDoctorMeeting);

// Documents routes
router.route('/:id/documents')
  .get(getDoctorDocuments)
  .post(uploadDoctorDocument);

module.exports = router;