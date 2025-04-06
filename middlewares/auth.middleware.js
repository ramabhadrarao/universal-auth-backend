const jwt = require('jsonwebtoken');
const User = require('../models/user.model');
const UserRole = require('../models/userRole.model');
const UserPermission = require('../models/userPermission.model');
const Role = require('../models/role.model');
const Permission = require('../models/permission.model');
const ErrorResponse = require('../utils/errorResponse');

/**
 * Protect routes - Verify JWT token
 */
exports.protect = async (req, res, next) => {
  try {
    let token;

    // Get token from Authorization header or cookie
    if (
      req.headers.authorization &&
      req.headers.authorization.startsWith('Bearer')
    ) {
      // Set token from Bearer token in header
      token = req.headers.authorization.split(' ')[1];
    } else if (req.cookies.token) {
      // Set token from cookie
      token = req.cookies.token;
    }

    // Make sure token exists
    if (!token) {
      return next(new ErrorResponse('Not authorized to access this route', 401));
    }

    try {
      // Verify token
      const decoded = jwt.verify(token, process.env.JWT_SECRET);

      // Check if user exists
      const user = await User.findById(decoded.id);

      if (!user) {
        return next(new ErrorResponse('User no longer exists', 401));
      }

      // Check if user is active
      if (user.status !== 'active') {
        return next(new ErrorResponse('Your account is not active. Please contact admin.', 401));
      }

      // Add user to request
      req.user = user;
      next();
    } catch (err) {
      return next(new ErrorResponse('Not authorized to access this route', 401));
    }
  } catch (err) {
    next(err);
  }
};

/**
 * Grant access to specific roles (RBAC)
 * @param {...String} roles - Roles to check for
 */
exports.authorize = (...roles) => {
  return async (req, res, next) => {
    try {
      // Get user roles
      const userRoles = await UserRole.find({ user: req.user.id })
        .populate('role')
        .select('role');

      // Extract role names
      const roleNames = userRoles.map(userRole => userRole.role.name);

      // Check if user has required role
      const authorized = roles.some(role => roleNames.includes(role));

      if (!authorized) {
        return next(
          new ErrorResponse(
            `User role ${roleNames.join(', ')} is not authorized to access this route`,
            403
          )
        );
      }

      next();
    } catch (err) {
      next(err);
    }
  };
};

/**
 * Check if user has permission to perform action on resource (RBAC + ABAC)
 * @param {String} resource - Resource to check permission for
 * @param {String} action - Action to check permission for
 * @param {Function} attributeCheck - Optional function to check attributes (ABAC)
 */
exports.hasPermission = (resource, action, attributeCheck = null) => {
  return async (req, res, next) => {
    try {
      // Get user id from request
      const userId = req.user.id;

      // Check for direct user permissions first
      const userPermissions = await UserPermission.find({
        user: userId,
        deny: false // Only include allow permissions
      }).populate('permission');
      
      // Filter valid permissions that haven't expired
      const validUserPermissions = userPermissions.filter(up => !up.hasExpired());
      
      // Check direct permission match
      const directPermission = validUserPermissions.find(up => 
        up.permission.resource === resource && 
        (up.permission.action === action || up.permission.action === 'manage')
      );

      // If we have direct permission and it passes attribute check, allow access
      if (directPermission) {
        // If there's an attribute check function, run it
        if (attributeCheck) {
          // Pass both the request and the permission conditions for flexible ABAC
          const hasAttributeAccess = await attributeCheck(req, directPermission.conditions);
          if (hasAttributeAccess) {
            return next();
          }
        } else {
          // No attribute check needed, direct permission is enough
          return next();
        }
      }

      // If no direct permission, check role-based permissions
      const userRoles = await UserRole.find({ 
        user: userId
      }).populate({
        path: 'role',
        populate: {
          path: 'permissions',
          model: 'Permission'
        }
      });
      
      // Filter out role assignments that have expired
      const validUserRoles = userRoles.filter(ur => !ur.hasExpired());
      
      // Check if any role has the required permission
      for (const userRole of validUserRoles) {
        const rolePermissions = userRole.role.permissions || [];
        
        const hasPermission = rolePermissions.some(
          permission => 
            (permission.resource === resource && 
             (permission.action === action || permission.action === 'manage'))
        );
        
        if (hasPermission) {
          // If there's an attribute check, verify with role attributes
          if (attributeCheck) {
            const hasAttributeAccess = await attributeCheck(req, userRole.attributes);
            if (hasAttributeAccess) {
              return next();
            }
          } else {
            // No attribute check, role permission is enough
            return next();
          }
        }
      }

      // If we reach here, the user doesn't have the required permission
      return next(
        new ErrorResponse(
          `Not authorized to ${action} on ${resource}`, 
          403
        )
      );
    } catch (err) {
      next(err);
    }
  };
};

/**
 * Check if user is the owner of a resource (ABAC)
 * @param {Function} getOwnerId - Function to get owner ID from request
 */
exports.isOwner = (getOwnerId) => {
  return async (req, res, next) => {
    try {
      const ownerId = await getOwnerId(req);
      
      // If no owner ID, or owner ID doesn't match user ID, deny access
      if (!ownerId || ownerId.toString() !== req.user.id.toString()) {
        return next(
          new ErrorResponse(
            'Not authorized to access this resource', 
            403
          )
        );
      }
      
      next();
    } catch (err) {
      next(err);
    }
  };
};

/**
 * Check if user has admin role (shorthand)
 */
exports.isAdmin = async (req, res, next) => {
  try {
    // Get user roles
    const userRoles = await UserRole.find({ user: req.user.id })
      .populate('role')
      .select('role');

    // Extract role names
    const roleNames = userRoles.map(userRole => userRole.role.name);

    // Check if user has admin role
    if (!roleNames.includes('admin')) {
      return next(
        new ErrorResponse(
          'Admin access required',
          403
        )
      );
    }

    next();
  } catch (err) {
    next(err);
  }
};
