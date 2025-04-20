// routes/case.routes.js
const express = require('express');
const router = express.Router();

const {
  getCases,
  getCase,
  createCase,
  updateCase,
  deleteCase,
  getCaseProducts,
  addCaseProduct,
  updateCaseProduct,
  removeCaseProduct,
  getCaseNotes,
  addCaseNote,
  getCaseStatusHistory,
  updateCaseStatus,
  getCaseDocuments,
  uploadCaseDocument,
  deleteCaseDocument,
  getCaseFollowups,
  addCaseFollowup,
  updateCaseFollowup,
  deleteCaseFollowup,
  getCasesByDoctor,
  getCasesByHospital,
  getCasesByPrinciple,
  getCasesByCategory,
  getCasesByUser,
  getCaseStatistics
} = require('../controllers/case.controller');

const { protect, authorize, hasPermission } = require('../middlewares/auth.middleware');
const validateRequest = require('../middlewares/validator.middleware');
const { schemas } = require('../utils/validation');

// Protect all routes
router.use(protect);

// Special routes for statistics and filtering
router.get('/statistics', hasPermission('cases', 'read'), getCaseStatistics);
router.get('/doctor/:doctorId', hasPermission('cases', 'read'), getCasesByDoctor);
router.get('/hospital/:hospitalId', hasPermission('cases', 'read'), getCasesByHospital);
router.get('/principle/:principleId', hasPermission('cases', 'read'), getCasesByPrinciple);
router.get('/category/:categoryId', hasPermission('cases', 'read'), getCasesByCategory);
router.get('/user', getCasesByUser);

// Main case routes
router.route('/')
  .get(hasPermission('cases', 'read'), getCases)
  .post(
    hasPermission('cases', 'create'), 
    validateRequest(schemas.createCase), 
    createCase
  );

router.route('/:id')
  .get(hasPermission('cases', 'read'), getCase)
  .put(
    hasPermission('cases', 'update'), 
    validateRequest(schemas.updateCase), 
    updateCase
  )
  .delete(hasPermission('cases', 'delete'), deleteCase);

// Case status routes
router.route('/:id/status')
  .put(
    hasPermission('cases', 'update'), 
    validateRequest(schemas.updateCaseStatus), 
    updateCaseStatus
  );

// Status history routes
router.route('/:id/history')
  .get(hasPermission('cases', 'read'), getCaseStatusHistory);

// Products routes
router.route('/:id/products')
  .get(hasPermission('cases', 'read'), getCaseProducts)
  .post(
    hasPermission('cases', 'update'), 
    validateRequest(schemas.addCaseProduct), 
    addCaseProduct
  );

router.route('/:id/products/:productId')
  .put(hasPermission('cases', 'update'), updateCaseProduct)
  .delete(hasPermission('cases', 'update'), removeCaseProduct);

// Notes routes
router.route('/:id/notes')
  .get(hasPermission('cases', 'read'), getCaseNotes)
  .post(
    hasPermission('cases', 'update'), 
    validateRequest(schemas.addCaseNote), 
    addCaseNote
  );

// Documents routes
router.route('/:id/documents')
  .get(hasPermission('cases', 'read'), getCaseDocuments)
  .post(
    hasPermission('cases', 'update'), 
    validateRequest(schemas.uploadCaseDocument), 
    uploadCaseDocument
  );

router.route('/:id/documents/:documentId')
  .delete(hasPermission('cases', 'update'), deleteCaseDocument);

// Followups routes
router.route('/:id/followups')
  .get(hasPermission('cases', 'read'), getCaseFollowups)
  .post(
    hasPermission('cases', 'update'), 
    validateRequest(schemas.addCaseFollowup), 
    addCaseFollowup
  );

router.route('/:id/followups/:followupId')
  .put(
    hasPermission('cases', 'update'), 
    validateRequest(schemas.updateCaseFollowup), 
    updateCaseFollowup
  )
  .delete(hasPermission('cases', 'update'), deleteCaseFollowup);

module.exports = router;