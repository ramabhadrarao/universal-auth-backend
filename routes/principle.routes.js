// routes/principle.routes.js
const express = require('express');
const router = express.Router();

// Load controllers
const {
  getPrinciples,
  getPrinciple,
  createPrinciple,
  updatePrinciple,
  deletePrinciple,
  getPrinciplesWithAgreements,
  getPrincipleSummary
} = require('../controllers/principle.controller');

const {
  getPrincipleContacts,
  getPrincipleContact,
  addPrincipleContact,
  updatePrincipleContact,
  deletePrincipleContact,
  setPrimaryContact
} = require('../controllers/principleContact.controller');

const {
  getPrincipleCategories,
  addPrincipleCategory,
  updatePrincipleCategory,
  deletePrincipleCategory,
  getPrimaryCategories
} = require('../controllers/principleCategory.controller');

const {
  getPrincipleAgreements,
  getPrincipleAgreement,
  addPrincipleAgreement,
  updatePrincipleAgreement,
  deletePrincipleAgreement,
  updateAgreementStatus,
  getExpiringAgreements
} = require('../controllers/principleAgreement.controller');

const {
  getPrincipleVisits,
  getPrincipleVisit,
  addPrincipleVisit,
  updatePrincipleVisit,
  deletePrincipleVisit,
  getUpcomingVisits,
  completeVisit,
  rescheduleVisit
} = require('../controllers/principleVisit.controller');

const {
  getPrincipleProducts,
  getPrincipleProduct,
  addPrincipleProduct,
  updatePrincipleProduct,
  deletePrincipleProduct,
  togglePreferredStatus,
  getProductPricing,
  getProductsByLeadTime
} = require('../controllers/principleProduct.controller');

const {
  getPrincipleDocuments,
  getPrincipleDocument,
  uploadPrincipleDocument,
  updatePrincipleDocument,
  deletePrincipleDocument,
  getDocumentsByType,
  getRecentDocuments
} = require('../controllers/principleDocument.controller');

// Middleware
const { protect, authorize } = require('../middlewares/auth.middleware');

// Protect all routes
router.use(protect);

// Principle routes
router.route('/')
  .get(getPrinciples)
  .post(authorize('admin'), createPrinciple);

router.route('/with-agreements')
  .get(getPrinciplesWithAgreements);

router.route('/summary')
  .get(getPrincipleSummary);

router.route('/:id')
  .get(getPrinciple)
  .put(authorize('admin'), updatePrinciple)
  .delete(authorize('admin'), deletePrinciple);

// Principle contacts routes
router.route('/:principleId/contacts')
  .get(getPrincipleContacts)
  .post(authorize('admin'), addPrincipleContact);

router.route('/:principleId/contacts/:id')
  .get(getPrincipleContact)
  .put(authorize('admin'), updatePrincipleContact)
  .delete(authorize('admin'), deletePrincipleContact);

router.route('/:principleId/contacts/:id/set-primary')
  .put(authorize('admin'), setPrimaryContact);

// Principle categories routes
router.route('/:principleId/categories')
  .get(getPrincipleCategories)
  .post(authorize('admin'), addPrincipleCategory);

router.route('/:principleId/categories/:id')
  .put(authorize('admin'), updatePrincipleCategory)
  .delete(authorize('admin'), deletePrincipleCategory);

router.route('/primary-categories')
  .get(getPrimaryCategories);

// Principle agreements routes
router.route('/:principleId/agreements')
  .get(getPrincipleAgreements)
  .post(authorize('admin'), addPrincipleAgreement);

router.route('/:principleId/agreements/:id')
  .get(getPrincipleAgreement)
  .put(authorize('admin'), updatePrincipleAgreement)
  .delete(authorize('admin'), deletePrincipleAgreement);

router.route('/:principleId/agreements/:id/status')
  .put(authorize('admin'), updateAgreementStatus);

router.route('/expiring-agreements')
  .get(getExpiringAgreements);

// Principle visits routes
router.route('/:principleId/visits')
  .get(getPrincipleVisits)
  .post(addPrincipleVisit);

router.route('/:principleId/visits/:id')
  .get(getPrincipleVisit)
  .put(updatePrincipleVisit)
  .delete(deletePrincipleVisit);

router.route('/:principleId/visits/:id/complete')
  .put(completeVisit);

router.route('/:principleId/visits/:id/reschedule')
  .put(rescheduleVisit);

router.route('/upcoming-visits')
  .get(getUpcomingVisits);

// Principle products routes
router.route('/:principleId/products')
  .get(getPrincipleProducts)
  .post(authorize('admin'), addPrincipleProduct);

router.route('/:principleId/products/:id')
  .get(getPrincipleProduct)
  .put(authorize('admin'), updatePrincipleProduct)
  .delete(authorize('admin'), deletePrincipleProduct);

router.route('/:principleId/products/:id/toggle-preferred')
  .put(authorize('admin'), togglePreferredStatus);

router.route('/product-pricing')
  .get(getProductPricing);

router.route('/products-by-lead-time')
  .get(getProductsByLeadTime);

// Principle documents routes
router.route('/:principleId/documents')
  .get(getPrincipleDocuments)
  .post(authorize('admin'), uploadPrincipleDocument);

router.route('/:principleId/documents/:id')
  .get(getPrincipleDocument)
  .put(authorize('admin'), updatePrincipleDocument)
  .delete(authorize('admin'), deletePrincipleDocument);

router.route('/documents-by-type/:documentType')
  .get(getDocumentsByType);

router.route('/recent-documents')
  .get(getRecentDocuments);

module.exports = router;