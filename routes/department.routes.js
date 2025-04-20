// routes/department.routes.js
const express = require('express');
const router = express.Router();

const {
  getDepartments,
  getDepartment,
  createDepartment,
  updateDepartment,
  deleteDepartment,
  getDepartmentEmployees,
  addDepartmentEmployee,
  removeDepartmentEmployee,
  updateDepartmentEmployee,
  getDepartmentTargets,
  addDepartmentTarget,
  updateDepartmentTarget,
  deleteDepartmentTarget,
  getDepartmentHierarchy
} = require('../controllers/department.controller');

const { protect, authorize } = require('../middlewares/auth.middleware');

// Protect all routes
router.use(protect);

// Special routes
router.route('/hierarchy')
  .get(getDepartmentHierarchy);

// Main department routes
router.route('/')
  .get(getDepartments)
  .post(authorize('admin'), createDepartment);

router.route('/:id')
  .get(getDepartment)
  .put(authorize('admin'), updateDepartment)
  .delete(authorize('admin'), deleteDepartment);

// Department employees routes
router.route('/:id/employees')
  .get(getDepartmentEmployees)
  .post(authorize('admin'), addDepartmentEmployee);

router.route('/:id/employees/:employeeId')
  .put(authorize('admin'), updateDepartmentEmployee)
  .delete(authorize('admin'), removeDepartmentEmployee);

// Department targets routes
router.route('/:id/targets')
  .get(getDepartmentTargets)
  .post(authorize('admin'), addDepartmentTarget);

router.route('/:id/targets/:targetId')
  .put(authorize('admin'), updateDepartmentTarget)
  .delete(authorize('admin'), deleteDepartmentTarget);

module.exports = router;