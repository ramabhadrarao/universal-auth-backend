const Joi = require('joi');
const ErrorResponse = require('./errorResponse');

/**
 * Validate request data against a Joi schema
 * @param {Object} schema - Joi schema
 * @param {string} source - Request property to validate ('body', 'query', 'params')
 * @returns {Function} - Express middleware
 */
const validate = (schema, source = 'body') => {
  return (req, res, next) => {
    const { error, value } = schema.validate(req[source], {
      abortEarly: false,
      stripUnknown: true
    });

    if (error) {
      const messages = error.details.map(detail => detail.message).join(', ');
      return next(new ErrorResponse(messages, 400));
    }

    // Replace validated data
    req[source] = value;
    next();
  };
};

// Common validation schemas
const schemas = {
  // User validation
  userRegister: Joi.object({
    name: Joi.string().trim().min(2).max(50).required()
      .messages({
        'string.min': 'Name must be at least 2 characters',
        'string.max': 'Name cannot be more than 50 characters',
        'any.required': 'Name is required'
      }),
    email: Joi.string().email().required()
      .messages({
        'string.email': 'Please provide a valid email',
        'any.required': 'Email is required'
      }),
    password: Joi.string().min(6).required()
      .messages({
        'string.min': 'Password must be at least 6 characters',
        'any.required': 'Password is required'
      })
  }),

  userLogin: Joi.object({
    email: Joi.string().email().required()
      .messages({
        'string.email': 'Please provide a valid email',
        'any.required': 'Email is required'
      }),
    password: Joi.string().required()
      .messages({
        'any.required': 'Password is required'
      })
  }),

  updateUserDetails: Joi.object({
    name: Joi.string().trim().min(2).max(50)
      .messages({
        'string.min': 'Name must be at least 2 characters',
        'string.max': 'Name cannot be more than 50 characters'
      }),
    email: Joi.string().email()
      .messages({
        'string.email': 'Please provide a valid email'
      })
  }),

  updatePassword: Joi.object({
    currentPassword: Joi.string().required()
      .messages({
        'any.required': 'Current password is required'
      }),
    newPassword: Joi.string().min(6).required()
      .messages({
        'string.min': 'New password must be at least 6 characters',
        'any.required': 'New password is required'
      })
  }),

  forgotPassword: Joi.object({
    email: Joi.string().email().required()
      .messages({
        'string.email': 'Please provide a valid email',
        'any.required': 'Email is required'
      })
  }),

  resetPassword: Joi.object({
    password: Joi.string().min(6).required()
      .messages({
        'string.min': 'Password must be at least 6 characters',
        'any.required': 'Password is required'
      })
  }),

  // Role validation
  createRole: Joi.object({
    name: Joi.string().trim().min(2).max(20).required()
      .messages({
        'string.min': 'Role name must be at least 2 characters',
        'string.max': 'Role name cannot be more than 20 characters',
        'any.required': 'Role name is required'
      }),
    description: Joi.string().trim().max(200).required()
      .messages({
        'string.max': 'Description cannot be more than 200 characters',
        'any.required': 'Description is required'
      }),
    permissions: Joi.array().items(Joi.string()),
    isSystem: Joi.boolean()
  }),

  updateRole: Joi.object({
    name: Joi.string().trim().min(2).max(20)
      .messages({
        'string.min': 'Role name must be at least 2 characters',
        'string.max': 'Role name cannot be more than 20 characters'
      }),
    description: Joi.string().trim().max(200)
      .messages({
        'string.max': 'Description cannot be more than 200 characters'
      }),
    permissions: Joi.array().items(Joi.string())
  }),

  // Permission validation
  createPermission: Joi.object({
    name: Joi.string().trim().min(2).max(50).required()
      .messages({
        'string.min': 'Permission name must be at least 2 characters',
        'string.max': 'Permission name cannot be more than 50 characters',
        'any.required': 'Permission name is required'
      }),
    description: Joi.string().trim().max(200).required()
      .messages({
        'string.max': 'Description cannot be more than 200 characters',
        'any.required': 'Description is required'
      }),
    resource: Joi.string().trim().required()
      .messages({
        'any.required': 'Resource is required'
      }),
    action: Joi.string().valid('create', 'read', 'update', 'delete', 'manage').required()
      .messages({
        'any.only': 'Action must be one of: create, read, update, delete, manage',
        'any.required': 'Action is required'
      }),
    attributes: Joi.object(),
    isSystem: Joi.boolean()
  }),

  updatePermission: Joi.object({
    name: Joi.string().trim().min(2).max(50)
      .messages({
        'string.min': 'Permission name must be at least 2 characters',
        'string.max': 'Permission name cannot be more than 50 characters'
      }),
    description: Joi.string().trim().max(200)
      .messages({
        'string.max': 'Description cannot be more than 200 characters'
      }),
    resource: Joi.string().trim(),
    action: Joi.string().valid('create', 'read', 'update', 'delete', 'manage')
      .messages({
        'any.only': 'Action must be one of: create, read, update, delete, manage'
      }),
    attributes: Joi.object()
  }),

  assignPermission: Joi.object({
    conditions: Joi.object(),
    resourceId: Joi.string(),
    tenant: Joi.string(),
    expiresAt: Joi.date().min('now'),
    deny: Joi.boolean()
  }),

  // User management validation
  createUser: Joi.object({
    name: Joi.string().trim().min(2).max(50).required()
      .messages({
        'string.min': 'Name must be at least 2 characters',
        'string.max': 'Name cannot be more than 50 characters',
        'any.required': 'Name is required'
      }),
    email: Joi.string().email().required()
      .messages({
        'string.email': 'Please provide a valid email',
        'any.required': 'Email is required'
      }),
    password: Joi.string().min(6).required()
      .messages({
        'string.min': 'Password must be at least 6 characters',
        'any.required': 'Password is required'
      }),
    status: Joi.string().valid('pending', 'active', 'suspended', 'rejected'),
    roles: Joi.array().items(Joi.string())
  }),

  updateUser: Joi.object({
    name: Joi.string().trim().min(2).max(50)
      .messages({
        'string.min': 'Name must be at least 2 characters',
        'string.max': 'Name cannot be more than 50 characters'
      }),
    email: Joi.string().email()
      .messages({
        'string.email': 'Please provide a valid email'
      }),
    status: Joi.string().valid('pending', 'active', 'suspended', 'rejected'),
    roles: Joi.array().items(Joi.string())
  }),

  updateUserStatus: Joi.object({
    status: Joi.string().valid('pending', 'active', 'suspended', 'rejected').required()
      .messages({
        'any.only': 'Status must be one of: pending, active, suspended, rejected',
        'any.required': 'Status is required'
      })
  })
};

module.exports = {
  validate,
  schemas
};
