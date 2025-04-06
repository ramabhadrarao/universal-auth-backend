const Role = require('../models/role.model');
const UserRole = require('../models/userRole.model');
const Permission = require('../models/permission.model');
const ErrorResponse = require('../utils/errorResponse');

/**
 * @desc    Get all roles
 * @route   GET /api/v1/roles
 * @access  Private/Admin
 */
exports.getRoles = async (req, res, next) => {
  try {
    const roles = await Role.find().populate('permissions');

    res.status(200).json({
      success: true,
      count: roles.length,
      data: roles
    });
  } catch (err) {
    next(err);
  }
};

/**
 * @desc    Get single role
 * @route   GET /api/v1/roles/:id
 * @access  Private/Admin
 */
exports.getRole = async (req, res, next) => {
  try {
    const role = await Role.findById(req.params.id).populate('permissions');

    if (!role) {
      return next(
        new ErrorResponse(`Role not found with id of ${req.params.id}`, 404)
      );
    }

    res.status(200).json({
      success: true,
      data: role
    });
  } catch (err) {
    next(err);
  }
};

/**
 * @desc    Create role
 * @route   POST /api/v1/roles
 * @access  Private/Admin
 */
exports.createRole = async (req, res, next) => {
  try {
    const { name, description, permissions, isSystem } = req.body;

    // Create role
    const role = await Role.create({
      name,
      description,
      isSystem: isSystem || false
    });

    // Add permissions if provided
    if (permissions && Array.isArray(permissions)) {
      const permissionObjects = await Permission.find({
        _id: { $in: permissions }
      });

      if (permissionObjects.length > 0) {
        role.permissions = permissionObjects.map(p => p._id);
        await role.save();
      }
    }

    // Get role with populated permissions
    const populatedRole = await Role.findById(role._id).populate('permissions');

    res.status(201).json({
      success: true,
      data: populatedRole
    });
  } catch (err) {
    next(err);
  }
};

/**
 * @desc    Update role
 * @route   PUT /api/v1/roles/:id
 * @access  Private/Admin
 */
exports.updateRole = async (req, res, next) => {
  try {
    // Find role
    let role = await Role.findById(req.params.id);

    if (!role) {
      return next(
        new ErrorResponse(`Role not found with id of ${req.params.id}`, 404)
      );
    }

    // Check if it's a system role
    if (role.isSystem) {
      // For system roles, only allow updating permissions, not name or description
      if (req.body.name || req.body.description) {
        return next(
          new ErrorResponse('Cannot modify name or description of system roles', 403)
        );
      }
    }

    // Update basic fields
    if (req.body.name) role.name = req.body.name;
    if (req.body.description) role.description = req.body.description;

    // Update permissions
    if (req.body.permissions && Array.isArray(req.body.permissions)) {
      role.permissions = req.body.permissions;
    }

    // Save changes
    await role.save();

    // Get updated role with populated permissions
    const updatedRole = await Role.findById(role._id).populate('permissions');

    res.status(200).json({
      success: true,
      data: updatedRole
    });
  } catch (err) {
    next(err);
  }
};

/**
 * @desc    Delete role
 * @route   DELETE /api/v1/roles/:id
 * @access  Private/Admin
 */
exports.deleteRole = async (req, res, next) => {
  try {
    const role = await Role.findById(req.params.id);

    if (!role) {
      return next(
        new ErrorResponse(`Role not found with id of ${req.params.id}`, 404)
      );
    }

    // Prevent deletion of system roles
    if (role.isSystem) {
      return next(
        new ErrorResponse('Cannot delete system roles', 403)
      );
    }

    // Check if the role is assigned to any users
    const userCount = await UserRole.countDocuments({ role: role._id });
    if (userCount > 0) {
      return next(
        new ErrorResponse(
          `Cannot delete role assigned to ${userCount} users. Please reassign users first.`,
          400
        )
      );
    }

    // Delete the role
    await role.deleteOne();

    res.status(200).json({
      success: true,
      data: {}
    });
  } catch (err) {
    next(err);
  }
};

/**
 * @desc    Get users with a specific role
 * @route   GET /api/v1/roles/:id/users
 * @access  Private/Admin
 */
exports.getRoleUsers = async (req, res, next) => {
  try {
    const role = await Role.findById(req.params.id);

    if (!role) {
      return next(
        new ErrorResponse(`Role not found with id of ${req.params.id}`, 404)
      );
    }

    // Find user role assignments
    const userRoles = await UserRole.find({ role: role._id }).populate('user');

    // Extract user data
    const users = userRoles.map(ur => ur.user);

    res.status(200).json({
      success: true,
      count: users.length,
      data: users
    });
  } catch (err) {
    next(err);
  }
};

/**
 * @desc    Add permissions to role
 * @route   POST /api/v1/roles/:id/permissions
 * @access  Private/Admin
 */
exports.addPermissionsToRole = async (req, res, next) => {
  try {
    const { permissions } = req.body;

    if (!permissions || !Array.isArray(permissions)) {
      return next(
        new ErrorResponse('Please provide permissions array', 400)
      );
    }

    // Find role
    const role = await Role.findById(req.params.id);

    if (!role) {
      return next(
        new ErrorResponse(`Role not found with id of ${req.params.id}`, 404)
      );
    }

    // Get current permissions
    const currentPermissions = role.permissions || [];
    
    // Add new permissions (avoid duplicates)
    const newPermissions = [...new Set([
      ...currentPermissions.map(p => p.toString()),
      ...permissions
    ])];
    
    // Update role
    role.permissions = newPermissions;
    await role.save();

    // Get updated role with populated permissions
    const updatedRole = await Role.findById(role._id).populate('permissions');

    res.status(200).json({
      success: true,
      data: updatedRole
    });
  } catch (err) {
    next(err);
  }
};

/**
 * @desc    Remove permissions from role
 * @route   DELETE /api/v1/roles/:id/permissions
 * @access  Private/Admin
 */
exports.removePermissionsFromRole = async (req, res, next) => {
  try {
    const { permissions } = req.body;

    if (!permissions || !Array.isArray(permissions)) {
      return next(
        new ErrorResponse('Please provide permissions array', 400)
      );
    }

    // Find role
    const role = await Role.findById(req.params.id);

    if (!role) {
      return next(
        new ErrorResponse(`Role not found with id of ${req.params.id}`, 404)
      );
    }

    // Get current permissions
    const currentPermissions = role.permissions || [];
    
    // Remove specified permissions
    const updatedPermissions = currentPermissions
      .filter(pId => !permissions.includes(pId.toString()));
    
    // Update role
    role.permissions = updatedPermissions;
    await role.save();

    // Get updated role with populated permissions
    const updatedRole = await Role.findById(role._id).populate('permissions');

    res.status(200).json({
      success: true,
      data: updatedRole
    });
  } catch (err) {
    next(err);
  }
};
