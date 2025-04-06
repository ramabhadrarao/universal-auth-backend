const Permission = require('../models/permission.model');
const Role = require('../models/role.model');
const UserPermission = require('../models/userPermission.model');
const ErrorResponse = require('../utils/errorResponse');

/**
 * @desc    Get all permissions
 * @route   GET /api/v1/permissions
 * @access  Private/Admin
 */
exports.getPermissions = async (req, res, next) => {
  try {
    // Filter
    const filter = {};
    
    if (req.query.resource) {
      filter.resource = req.query.resource;
    }
    
    if (req.query.action) {
      filter.action = req.query.action;
    }
    
    const permissions = await Permission.find(filter);

    res.status(200).json({
      success: true,
      count: permissions.length,
      data: permissions
    });
  } catch (err) {
    next(err);
  }
};

/**
 * @desc    Get single permission
 * @route   GET /api/v1/permissions/:id
 * @access  Private/Admin
 */
exports.getPermission = async (req, res, next) => {
  try {
    const permission = await Permission.findById(req.params.id);

    if (!permission) {
      return next(
        new ErrorResponse(`Permission not found with id of ${req.params.id}`, 404)
      );
    }

    res.status(200).json({
      success: true,
      data: permission
    });
  } catch (err) {
    next(err);
  }
};

/**
 * @desc    Create permission
 * @route   POST /api/v1/permissions
 * @access  Private/Admin
 */
exports.createPermission = async (req, res, next) => {
  try {
    const { name, description, resource, action, attributes, isSystem } = req.body;

    // Create permission
    const permission = await Permission.create({
      name,
      description,
      resource,
      action,
      attributes: attributes || {},
      isSystem: isSystem || false
    });

    res.status(201).json({
      success: true,
      data: permission
    });
  } catch (err) {
    next(err);
  }
};

/**
 * @desc    Update permission
 * @route   PUT /api/v1/permissions/:id
 * @access  Private/Admin
 */
exports.updatePermission = async (req, res, next) => {
  try {
    let permission = await Permission.findById(req.params.id);

    if (!permission) {
      return next(
        new ErrorResponse(`Permission not found with id of ${req.params.id}`, 404)
      );
    }

    // Check if it's a system permission
    if (permission.isSystem) {
      // For system permissions, don't allow modifying certain fields
      if (req.body.resource || req.body.action) {
        return next(
          new ErrorResponse('Cannot modify resource or action of system permissions', 403)
        );
      }
    }

    // Update permission fields
    const fieldsToUpdate = {
      name: req.body.name,
      description: req.body.description,
      resource: req.body.resource,
      action: req.body.action,
      attributes: req.body.attributes
    };

    // Remove undefined fields
    Object.keys(fieldsToUpdate).forEach(key => 
      fieldsToUpdate[key] === undefined && delete fieldsToUpdate[key]
    );

    // Update permission
    permission = await Permission.findByIdAndUpdate(
      req.params.id,
      fieldsToUpdate,
      {
        new: true,
        runValidators: true
      }
    );

    res.status(200).json({
      success: true,
      data: permission
    });
  } catch (err) {
    next(err);
  }
};

/**
 * @desc    Delete permission
 * @route   DELETE /api/v1/permissions/:id
 * @access  Private/Admin
 */
exports.deletePermission = async (req, res, next) => {
  try {
    const permission = await Permission.findById(req.params.id);

    if (!permission) {
      return next(
        new ErrorResponse(`Permission not found with id of ${req.params.id}`, 404)
      );
    }

    // Prevent deletion of system permissions
    if (permission.isSystem) {
      return next(
        new ErrorResponse('Cannot delete system permissions', 403)
      );
    }

    // Check if permission is assigned to any roles
    const rolesWithPermission = await Role.countDocuments({
      permissions: permission._id
    });

    if (rolesWithPermission > 0) {
      return next(
        new ErrorResponse(
          `Cannot delete permission used by ${rolesWithPermission} roles. Remove from roles first.`,
          400
        )
      );
    }

    // Check if permission is directly assigned to any users
    const userPermissions = await UserPermission.countDocuments({
      permission: permission._id
    });

    if (userPermissions > 0) {
      return next(
        new ErrorResponse(
          `Cannot delete permission assigned to ${userPermissions} users. Remove from users first.`,
          400
        )
      );
    }

    // Delete permission
    await permission.deleteOne();

    res.status(200).json({
      success: true,
      data: {}
    });
  } catch (err) {
    next(err);
  }
};

/**
 * @desc    Get roles with specific permission
 * @route   GET /api/v1/permissions/:id/roles
 * @access  Private/Admin
 */
exports.getPermissionRoles = async (req, res, next) => {
  try {
    const permission = await Permission.findById(req.params.id);

    if (!permission) {
      return next(
        new ErrorResponse(`Permission not found with id of ${req.params.id}`, 404)
      );
    }

    // Find roles with this permission
    const roles = await Role.find({
      permissions: permission._id
    });

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
 * @desc    Get unique resources
 * @route   GET /api/v1/permissions/resources
 * @access  Private/Admin
 */
exports.getResources = async (req, res, next) => {
  try {
    const resources = await Permission.distinct('resource');

    res.status(200).json({
      success: true,
      count: resources.length,
      data: resources
    });
  } catch (err) {
    next(err);
  }
};

/**
 * @desc    Assign permission directly to user (ABAC)
 * @route   POST /api/v1/permissions/:id/users/:userId
 * @access  Private/Admin
 */
exports.assignPermissionToUser = async (req, res, next) => {
  try {
    const { conditions, resourceId, tenant, expiresAt, deny } = req.body;
    
    // Find permission
    const permission = await Permission.findById(req.params.id);
    if (!permission) {
      return next(
        new ErrorResponse(`Permission not found with id of ${req.params.id}`, 404)
      );
    }

    // Create or update user permission
    let userPermission = await UserPermission.findOne({
      user: req.params.userId,
      permission: req.params.id,
      resourceId: resourceId || null
    });

    if (userPermission) {
      // Update existing permission
      userPermission.conditions = conditions || {};
      userPermission.deny = deny || false;
      userPermission.tenant = tenant || 'default';
      
      if (expiresAt) {
        userPermission.expiresAt = new Date(expiresAt);
      }
      
      await userPermission.save();
    } else {
      // Create new permission assignment
      userPermission = await UserPermission.create({
        user: req.params.userId,
        permission: req.params.id,
        resourceId: resourceId || null,
        conditions: conditions || {},
        deny: deny || false,
        tenant: tenant || 'default',
        expiresAt: expiresAt ? new Date(expiresAt) : null,
        assignedBy: req.user.id
      });
    }

    res.status(200).json({
      success: true,
      data: userPermission
    });
  } catch (err) {
    next(err);
  }
};

/**
 * @desc    Remove permission from user
 * @route   DELETE /api/v1/permissions/:id/users/:userId
 * @access  Private/Admin
 */
exports.removePermissionFromUser = async (req, res, next) => {
  try {
    const { resourceId } = req.query;
    
    const query = {
      user: req.params.userId,
      permission: req.params.id
    };
    
    // If resourceId is provided, use it for specific resource permission
    if (resourceId) {
      query.resourceId = resourceId;
    }
    
    const result = await UserPermission.deleteOne(query);

    if (result.deletedCount === 0) {
      return next(
        new ErrorResponse('User permission not found', 404)
      );
    }

    res.status(200).json({
      success: true,
      data: {}
    });
  } catch (err) {
    next(err);
  }
};

/**
 * @desc    Get user's direct permissions
 * @route   GET /api/v1/permissions/users/:userId
 * @access  Private/Admin
 */
exports.getUserPermissions = async (req, res, next) => {
  try {
    const userPermissions = await UserPermission.find({
      user: req.params.userId
    }).populate('permission');

    res.status(200).json({
      success: true,
      count: userPermissions.length,
      data: userPermissions
    });
  } catch (err) {
    next(err);
  }
};
