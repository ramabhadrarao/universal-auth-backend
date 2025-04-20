// controllers/department.controller.js
const Department = require('../models/department.model');
const DepartmentEmployee = require('../models/departmentEmployee.model');
const DepartmentTarget = require('../models/departmentTarget.model');
const ErrorResponse = require('../utils/errorResponse');
const { logger } = require('../middlewares/logger.middleware');

/**
 * @desc    Get all departments
 * @route   GET /api/v1/departments
 * @access  Private
 */
exports.getDepartments = async (req, res, next) => {
  try {
    // Add filtering options
    const filter = {};
    
    // Filter by manager if provided
    if (req.query.manager) {
      filter.manager = req.query.manager;
    }
    
    // Filter by parent department if provided
    if (req.query.parentDepartment) {
      filter.parentDepartment = req.query.parentDepartment;
    }
    
    // Filter by active status if provided
    if (req.query.isActive !== undefined) {
      filter.isActive = req.query.isActive === 'true';
    }

    const departments = await Department.find(filter)
      .populate('manager', 'name email')
      .populate('parentDepartment', 'name');

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
 * @desc    Get single department
 * @route   GET /api/v1/departments/:id
 * @access  Private
 */
exports.getDepartment = async (req, res, next) => {
  try {
    const department = await Department.findById(req.params.id)
      .populate('manager', 'name email')
      .populate('parentDepartment', 'name');

    if (!department) {
      return next(
        new ErrorResponse(`Department not found with id of ${req.params.id}`, 404)
      );
    }

    res.status(200).json({
      success: true,
      data: department
    });
  } catch (err) {
    next(err);
  }
};

/**
 * @desc    Create new department
 * @route   POST /api/v1/departments
 * @access  Private/Admin
 */
exports.createDepartment = async (req, res, next) => {
  try {
    // Add user to request body as creator
    req.body.createdBy = req.user.id;

    const department = await Department.create(req.body);

    res.status(201).json({
      success: true,
      data: department
    });
  } catch (err) {
    next(err);
  }
};

/**
 * @desc    Update department
 * @route   PUT /api/v1/departments/:id
 * @access  Private/Admin
 */
exports.updateDepartment = async (req, res, next) => {
  try {
    let department = await Department.findById(req.params.id);

    if (!department) {
      return next(
        new ErrorResponse(`Department not found with id of ${req.params.id}`, 404)
      );
    }

    department = await Department.findByIdAndUpdate(
      req.params.id,
      req.body,
      {
        new: true,
        runValidators: true
      }
    ).populate('manager', 'name email')
     .populate('parentDepartment', 'name');

    res.status(200).json({
      success: true,
      data: department
    });
  } catch (err) {
    next(err);
  }
};

/**
 * @desc    Delete department
 * @route   DELETE /api/v1/departments/:id
 * @access  Private/Admin
 */
exports.deleteDepartment = async (req, res, next) => {
  try {
    const department = await Department.findById(req.params.id);

    if (!department) {
      return next(
        new ErrorResponse(`Department not found with id of ${req.params.id}`, 404)
      );
    }

    // Check if there are any child departments
    const childDepartments = await Department.countDocuments({ parentDepartment: req.params.id });
    if (childDepartments > 0) {
      return next(
        new ErrorResponse(`Cannot delete department with child departments`, 400)
      );
    }

    // Check if there are any employees in this department
    const employees = await DepartmentEmployee.countDocuments({ department: req.params.id });
    if (employees > 0) {
      return next(
        new ErrorResponse(`Cannot delete department with assigned employees`, 400)
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
 * @desc    Get department employees
 * @route   GET /api/v1/departments/:id/employees
 * @access  Private
 */
exports.getDepartmentEmployees = async (req, res, next) => {
  try {
    const department = await Department.findById(req.params.id);

    if (!department) {
      return next(
        new ErrorResponse(`Department not found with id of ${req.params.id}`, 404)
      );
    }

    const employees = await DepartmentEmployee.find({ department: req.params.id })
      .populate('employee', 'name email avatar')
      .populate('department', 'name');

    res.status(200).json({
      success: true,
      count: employees.length,
      data: employees
    });
  } catch (err) {
    next(err);
  }
};

/**
 * @desc    Add employee to department
 * @route   POST /api/v1/departments/:id/employees
 * @access  Private/Admin
 */
exports.addDepartmentEmployee = async (req, res, next) => {
  try {
    const department = await Department.findById(req.params.id);

    if (!department) {
      return next(
        new ErrorResponse(`Department not found with id of ${req.params.id}`, 404)
      );
    }

    // Check if employee is already in this department
    const existingEmployee = await DepartmentEmployee.findOne({
      department: req.params.id,
      employee: req.body.employee
    });

    if (existingEmployee) {
      return next(
        new ErrorResponse(`Employee is already assigned to this department`, 400)
      );
    }

    // Set department ID
    req.body.department = req.params.id;

    const departmentEmployee = await DepartmentEmployee.create(req.body);

    res.status(201).json({
      success: true,
      data: departmentEmployee
    });
  } catch (err) {
    next(err);
  }
};

/**
 * @desc    Remove employee from department
 * @route   DELETE /api/v1/departments/:id/employees/:employeeId
 * @access  Private/Admin
 */
exports.removeDepartmentEmployee = async (req, res, next) => {
  try {
    const departmentEmployee = await DepartmentEmployee.findOne({
      department: req.params.id,
      employee: req.params.employeeId
    });

    if (!departmentEmployee) {
      return next(
        new ErrorResponse(`Employee not found in this department`, 404)
      );
    }

    await departmentEmployee.deleteOne();

    res.status(200).json({
      success: true,
      data: {}
    });
  } catch (err) {
    next(err);
  }
};

/**
 * @desc    Update department employee
 * @route   PUT /api/v1/departments/:id/employees/:employeeId
 * @access  Private/Admin
 */
exports.updateDepartmentEmployee = async (req, res, next) => {
  try {
    let departmentEmployee = await DepartmentEmployee.findOne({
      department: req.params.id,
      employee: req.params.employeeId
    });

    if (!departmentEmployee) {
      return next(
        new ErrorResponse(`Employee not found in this department`, 404)
      );
    }

    // Don't allow changing department or employee
    delete req.body.department;
    delete req.body.employee;

    departmentEmployee = await DepartmentEmployee.findByIdAndUpdate(
      departmentEmployee._id,
      req.body,
      {
        new: true,
        runValidators: true
      }
    ).populate('employee', 'name email avatar')
      .populate('department', 'name');

    res.status(200).json({
      success: true,
      data: departmentEmployee
    });
  } catch (err) {
    next(err);
  }
};

/**
 * @desc    Get department targets
 * @route   GET /api/v1/departments/:id/targets
 * @access  Private
 */
exports.getDepartmentTargets = async (req, res, next) => {
  try {
    const department = await Department.findById(req.params.id);

    if (!department) {
      return next(
        new ErrorResponse(`Department not found with id of ${req.params.id}`, 404)
      );
    }

    // Add filtering options
    const filter = { department: req.params.id };
    
    // Filter by target type if provided
    if (req.query.targetType) {
      filter.targetType = req.query.targetType;
    }
    
    // Filter by date range
    if (req.query.startDate) {
      filter.startDate = { $gte: new Date(req.query.startDate) };
    }
    
    if (req.query.endDate) {
      filter.endDate = { $lte: new Date(req.query.endDate) };
    }

    const targets = await DepartmentTarget.find(filter)
      .populate('department', 'name')
      .populate('createdBy', 'name');

    res.status(200).json({
      success: true,
      count: targets.length,
      data: targets
    });
  } catch (err) {
    next(err);
  }
};

/**
 * @desc    Add target to department
 * @route   POST /api/v1/departments/:id/targets
 * @access  Private/Admin
 */
exports.addDepartmentTarget = async (req, res, next) => {
  try {
    const department = await Department.findById(req.params.id);

    if (!department) {
      return next(
        new ErrorResponse(`Department not found with id of ${req.params.id}`, 404)
      );
    }

    // Set department ID and creator
    req.body.department = req.params.id;
    req.body.createdBy = req.user.id;

    const target = await DepartmentTarget.create(req.body);

    res.status(201).json({
      success: true,
      data: target
    });
  } catch (err) {
    next(err);
  }
};

/**
 * @desc    Update department target
 * @route   PUT /api/v1/departments/:id/targets/:targetId
 * @access  Private/Admin
 */
exports.updateDepartmentTarget = async (req, res, next) => {
  try {
    const department = await Department.findById(req.params.id);

    if (!department) {
      return next(
        new ErrorResponse(`Department not found with id of ${req.params.id}`, 404)
      );
    }

    let target = await DepartmentTarget.findById(req.params.targetId);

    if (!target) {
      return next(
        new ErrorResponse(`Target not found with id of ${req.params.targetId}`, 404)
      );
    }

    // Ensure target belongs to the specified department
    if (target.department.toString() !== req.params.id) {
      return next(
        new ErrorResponse(`Target not found for this department`, 404)
      );
    }

    // Don't allow changing department
    delete req.body.department;

    target = await DepartmentTarget.findByIdAndUpdate(
      req.params.targetId,
      req.body,
      {
        new: true,
        runValidators: true
      }
    ).populate('department', 'name')
      .populate('createdBy', 'name');

    res.status(200).json({
      success: true,
      data: target
    });
  } catch (err) {
    next(err);
  }
};

/**
 * @desc    Delete department target
 * @route   DELETE /api/v1/departments/:id/targets/:targetId
 * @access  Private/Admin
 */
exports.deleteDepartmentTarget = async (req, res, next) => {
  try {
    const department = await Department.findById(req.params.id);

    if (!department) {
      return next(
        new ErrorResponse(`Department not found with id of ${req.params.id}`, 404)
      );
    }

    const target = await DepartmentTarget.findById(req.params.targetId);

    if (!target) {
      return next(
        new ErrorResponse(`Target not found with id of ${req.params.targetId}`, 404)
      );
    }

    // Ensure target belongs to the specified department
    if (target.department.toString() !== req.params.id) {
      return next(
        new ErrorResponse(`Target not found for this department`, 404)
      );
    }

    await target.deleteOne();

    res.status(200).json({
      success: true,
      data: {}
    });
  } catch (err) {
    next(err);
  }
};

/**
 * @desc    Get department hierarchy
 * @route   GET /api/v1/departments/hierarchy
 * @access  Private
 */
exports.getDepartmentHierarchy = async (req, res, next) => {
  try {
    // Get all departments
    const departments = await Department.find()
      .populate('manager', 'name email')
      .populate('parentDepartment', 'name');

    // Build hierarchy
    const hierarchy = buildDepartmentHierarchy(departments);

    res.status(200).json({
      success: true,
      data: hierarchy
    });
  } catch (err) {
    next(err);
  }
};

// Helper function to build department hierarchy
const buildDepartmentHierarchy = (departments) => {
  const departmentMap = {};
  const rootDepartments = [];

  // First pass: create map of departments
  departments.forEach(dept => {
    const deptObj = dept.toObject();
    deptObj.children = [];
    departmentMap[dept._id] = deptObj;
  });

  // Second pass: create hierarchy
  departments.forEach(dept => {
    if (dept.parentDepartment) {
      const parentId = dept.parentDepartment._id || dept.parentDepartment;
      if (departmentMap[parentId]) {
        departmentMap[parentId].children.push(departmentMap[dept._id]);
      } else {
        // If parent doesn't exist, treat as root
        rootDepartments.push(departmentMap[dept._id]);
      }
    } else {
      // No parent, add to root
      rootDepartments.push(departmentMap[dept._id]);
    }
  });

  return rootDepartments;
};