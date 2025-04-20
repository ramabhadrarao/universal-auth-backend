// routes/hospital.routes.js
const express = require('express');
const router = express.Router();

const {
  getHospitals,
  getHospital,
  createHospital,
  updateHospital,
  deleteHospital,
  getHospitalContacts,
  getHospitalContact,
  addHospitalContact,
  updateHospitalContact,
  deleteHospitalContact,
  setPrimaryContact,
  getHospitalDepartments,
  addHospitalDepartment,
  updateHospitalDepartment,
  deleteHospitalDepartment,
  getHospitalVisits,
  getHospitalVisit,
  addHospitalVisit,
  updateHospitalVisit,
  deleteHospitalVisit,
  getHospitalAgreements,
  getHospitalAgreement,
  addHospitalAgreement,
  updateHospitalAgreement,
  deleteHospitalAgreement,
  updateAgreementStatus,
  getHospitalsByCity,
  getHospitalsByState,
  getUpcomingVisits
} = require('../controllers/hospital.controller');

const { protect, authorize } = require('../middlewares/auth.middleware');

// Protect all routes
router.use(protect);

// Special routes
router.route('/by-city/:city')
  .get(getHospitalsByCity);

router.route('/by-state/:state')
  .get(getHospitalsByState);

router.route('/upcoming-visits')
  .get(getUpcomingVisits);

// Main hospital routes
router.route('/')
  .get(getHospitals)
  .post(authorize('admin'), createHospital);

router.route('/:id')
  .get(getHospital)
  .put(authorize('admin'), updateHospital)
  .delete(authorize('admin'), deleteHospital);

// Contacts routes
router.route('/:id/contacts')
  .get(getHospitalContacts)
  .post(authorize('admin'), addHospitalContact);

router.route('/:id/contacts/:contactId')
  .get(getHospitalContact)
  .put(authorize('admin'), updateHospitalContact)
  .delete(authorize('admin'), deleteHospitalContact);

router.route('/:id/contacts/:contactId/set-primary')
  .put(authorize('admin'), setPrimaryContact);

// Departments routes
router.route('/:id/departments')
  .get(getHospitalDepartments)
  .post(authorize('admin'), addHospitalDepartment);

router.route('/:id/departments/:departmentId')
  .put(authorize('admin'), updateHospitalDepartment)
  .delete(authorize('admin'), deleteHospitalDepartment);

// Visits routes
router.route('/:id/visits')
  .get(getHospitalVisits)
  .post(addHospitalVisit);

router.route('/:id/visits/:visitId')
  .get(getHospitalVisit)
  .put(updateHospitalVisit)
  .delete(deleteHospitalVisit);

// Agreements routes
router.route('/:id/agreements')
  .get(getHospitalAgreements)
  .post(authorize('admin'), addHospitalAgreement);

router.route('/:id/agreements/:agreementId')
  .get(getHospitalAgreement)
  .put(authorize('admin'), updateHospitalAgreement)
  .delete(authorize('admin'), deleteHospitalAgreement);

router.route('/:id/agreements/:agreementId/status')
  .put(authorize('admin'), updateAgreementStatus);

module.exports = router;