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
  }),
  // CategoryApplication validation
createCategoryApplication: Joi.object({
  category: Joi.string().required()
    .messages({
      'any.required': 'Category is required'
    }),
  subcategory: Joi.string().allow(null, ''),
  applicationName: Joi.string().required()
    .messages({
      'any.required': 'Application name is required'
    }),
  description: Joi.string().allow(null, ''),
  isActive: Joi.boolean()
}),

updateCategoryApplication: Joi.object({
  category: Joi.string(),
  subcategory: Joi.string().allow(null, ''),
  applicationName: Joi.string(),
  description: Joi.string().allow(null, ''),
  isActive: Joi.boolean()
}),
// Add to utils/validation.js, in the schemas object

// Product validation
createProduct: Joi.object({
  name: Joi.string().trim().max(255).required()
    .messages({
      'string.max': 'Product name cannot be more than 255 characters',
      'any.required': 'Product name is required'
    }),
  productCode: Joi.string().trim().max(100).required()
    .messages({
      'string.max': 'Product code cannot be more than 100 characters',
      'any.required': 'Product code is required'
    }),
  principle: Joi.string().required()
    .messages({
      'any.required': 'Principle is required'
    }),
  batchNumber: Joi.string().trim().max(50)
    .messages({
      'string.max': 'Batch number cannot be more than 50 characters'
    }),
  dpValue: Joi.number().min(0).required()
    .messages({
      'number.min': 'Dealer price cannot be negative',
      'any.required': 'Dealer price is required'
    }),
  mrp: Joi.number().min(0).required()
    .messages({
      'number.min': 'Maximum retail price cannot be negative',
      'any.required': 'Maximum retail price is required'
    }),
  expiryDate: Joi.date(),
  quantity: Joi.number().min(0).default(1)
    .messages({
      'number.min': 'Quantity cannot be negative'
    }),
  description: Joi.string(),
  isActive: Joi.boolean().default(true),
  specifications: Joi.array().items(
    Joi.object({
      specName: Joi.string().trim().max(100).required()
        .messages({
          'string.max': 'Specification name cannot be more than 100 characters',
          'any.required': 'Specification name is required'
        }),
      specValue: Joi.string().required()
        .messages({
          'any.required': 'Specification value is required'
        }),
      specUnit: Joi.string().trim().max(20)
        .messages({
          'string.max': 'Unit cannot be more than 20 characters'
        })
    })
  ),
  images: Joi.array().items(
    Joi.object({
      imagePath: Joi.string().required()
        .messages({
          'any.required': 'Image path is required'
        }),
      imageType: Joi.string().valid('main', 'thumbnail', 'alternate').default('main'),
      displayOrder: Joi.number().default(0)
    })
  ),
  documents: Joi.array().items(
    Joi.object({
      documentType: Joi.string().required()
        .messages({
          'any.required': 'Document type is required'
        }),
      documentName: Joi.string().required()
        .messages({
          'any.required': 'Document name is required'
        }),
      filePath: Joi.string().required()
        .messages({
          'any.required': 'File path is required'
        })
    })
  ),
  initialInventory: Joi.object({
    quantity: Joi.number().min(1),
    location: Joi.string().required()
      .messages({
        'any.required': 'Location is required for initial inventory'
      })
  })
}),

updateProduct: Joi.object({
  name: Joi.string().trim().max(255)
    .messages({
      'string.max': 'Product name cannot be more than 255 characters'
    }),
  productCode: Joi.string().trim().max(100)
    .messages({
      'string.max': 'Product code cannot be more than 100 characters'
    }),
  principle: Joi.string(),
  batchNumber: Joi.string().trim().max(50)
    .messages({
      'string.max': 'Batch number cannot be more than 50 characters'
    }),
  dpValue: Joi.number().min(0)
    .messages({
      'number.min': 'Dealer price cannot be negative'
    }),
  mrp: Joi.number().min(0)
    .messages({
      'number.min': 'Maximum retail price cannot be negative'
    }),
  expiryDate: Joi.date(),
  quantity: Joi.number().min(0)
    .messages({
      'number.min': 'Quantity cannot be negative'
    }),
  description: Joi.string(),
  isActive: Joi.boolean(),
  specifications: Joi.array().items(
    Joi.object({
      specName: Joi.string().trim().max(100).required()
        .messages({
          'string.max': 'Specification name cannot be more than 100 characters',
          'any.required': 'Specification name is required'
        }),
      specValue: Joi.string().required()
        .messages({
          'any.required': 'Specification value is required'
        }),
      specUnit: Joi.string().trim().max(20)
        .messages({
          'string.max': 'Unit cannot be more than 20 characters'
        })
    })
  ),
  images: Joi.array().items(
    Joi.object({
      imagePath: Joi.string().required()
        .messages({
          'any.required': 'Image path is required'
        }),
      imageType: Joi.string().valid('main', 'thumbnail', 'alternate').default('main'),
      displayOrder: Joi.number().default(0)
    })
  ),
  documents: Joi.array().items(
    Joi.object({
      documentType: Joi.string().required()
        .messages({
          'any.required': 'Document type is required'
        }),
      documentName: Joi.string().required()
        .messages({
          'any.required': 'Document name is required'
        }),
      filePath: Joi.string().required()
        .messages({
          'any.required': 'File path is required'
        })
    })
  )
}),

// Inventory validation
createInventory: Joi.object({
  product: Joi.string().required()
    .messages({
      'any.required': 'Product is required'
    }),
  batchNumber: Joi.string().trim().max(50)
    .messages({
      'string.max': 'Batch number cannot be more than 50 characters'
    }),
  location: Joi.string().trim().max(100)
    .messages({
      'string.max': 'Location cannot be more than 100 characters'
    }),
  quantity: Joi.number().min(1).required()
    .messages({
      'number.min': 'Quantity must be at least 1',
      'any.required': 'Quantity is required'
    }),
  dpValue: Joi.number().min(0)
    .messages({
      'number.min': 'Dealer price cannot be negative'
    }),
  expiryDate: Joi.date(),
  receivedDate: Joi.date().default(Date.now),
  status: Joi.string().valid('Available', 'Reserved', 'Used', 'Expired', 'Damaged').default('Available'),
  notes: Joi.string()
}),

updateInventory: Joi.object({
  quantity: Joi.number().min(0)
    .messages({
      'number.min': 'Quantity cannot be negative'
    }),
  location: Joi.string().trim().max(100)
    .messages({
      'string.max': 'Location cannot be more than 100 characters'
    }),
  dpValue: Joi.number().min(0)
    .messages({
      'number.min': 'Dealer price cannot be negative'
    }),
  expiryDate: Joi.date(),
  notes: Joi.string()
}),

updateInventoryStatus: Joi.object({
  status: Joi.string().valid('Available', 'Reserved', 'Used', 'Expired', 'Damaged').required()
    .messages({
      'any.required': 'Status is required',
      'any.only': 'Status must be one of: Available, Reserved, Used, Expired, Damaged'
    }),
  notes: Joi.string(),
  referenceId: Joi.string(),
  referenceType: Joi.string().valid('case', 'transfer', 'adjustment', 'receipt')
}),

// Product Usage validation
recordProductUsage: Joi.object({
  product: Joi.string().required()
    .messages({
      'any.required': 'Product is required'
    }),
  case: Joi.string().required()
    .messages({
      'any.required': 'Case is required'
    }),
  quantity: Joi.number().min(1).default(1)
    .messages({
      'number.min': 'Quantity must be at least 1'
    }),
  batchNumber: Joi.string().trim().max(50),
  usedDate: Joi.date().default(Date.now).required()
    .messages({
      'any.required': 'Usage date is required'
    }),
  dpValue: Joi.number().min(0)
    .messages({
      'number.min': 'Dealer price cannot be negative'
    }),
  sellingPrice: Joi.number().min(0)
    .messages({
      'number.min': 'Selling price cannot be negative'
    }),
  notes: Joi.string()
}),

updateProductUsage: Joi.object({
  sellingPrice: Joi.number().min(0)
    .messages({
      'number.min': 'Selling price cannot be negative'
    }),
  notes: Joi.string()
}),

// Product Alternatives validation
createProductAlternative: Joi.object({
  alternativeProduct: Joi.string().required()
    .messages({
      'any.required': 'Alternative product is required'
    }),
  compatibilityLevel: Joi.string().valid('Full', 'Partial', 'Emergency Only').default('Full'),
  priceDifference: Joi.number(),
  notes: Joi.string(),
  createReverse: Joi.boolean().default(false)
}),

updateProductAlternative: Joi.object({
  compatibilityLevel: Joi.string().valid('Full', 'Partial', 'Emergency Only'),
  priceDifference: Joi.number(),
  notes: Joi.string()
}),

// Add these case validation schemas to the existing schemas object in utils/validation.js

// Case validation schemas
createCase: Joi.object({
  caseNumber: Joi.string(),  // Optional, system will generate if not provided
  patientName: Joi.string().max(100).required()
    .messages({
      'string.max': 'Patient name cannot be more than 100 characters',
      'any.required': 'Patient name is required'
    }),
  patientAge: Joi.number().min(0)
    .messages({
      'number.min': 'Age cannot be negative'
    }),
  patientGender: Joi.string().valid('Male', 'Female', 'Other'),
  surgeryDate: Joi.date().required()
    .messages({
      'any.required': 'Surgery date is required'
    }),
  hospital: Joi.string().required()
    .messages({
      'any.required': 'Hospital is required'
    }),
  doctor: Joi.string().required()
    .messages({
      'any.required': 'Doctor is required'
    }),
  principle: Joi.string().required()
    .messages({
      'any.required': 'Principle is required'
    }),
  category: Joi.string().required()
    .messages({
      'any.required': 'Category is required'
    }),
  subcategory: Joi.string(),
  dpValue: Joi.number().min(0),
  sellingPrice: Joi.number().min(0),
  status: Joi.string().valid('Active', 'Completed', 'Cancelled', 'Pending').default('Active'),
  notes: Joi.string(),
  note: Joi.string(),  // Initial note to be added
  products: Joi.array().items(
    Joi.object({
      product: Joi.string().required()
        .messages({
          'any.required': 'Product ID is required'
        }),
      quantity: Joi.number().min(1).default(1)
        .messages({
          'number.min': 'Quantity must be at least 1'
        }),
      unit_price: Joi.number().min(0).required()
        .messages({
          'number.min': 'Unit price cannot be negative',
          'any.required': 'Unit price is required'
        }),
      dp_value: Joi.number().min(0).required()
        .messages({
          'number.min': 'DP value cannot be negative',
          'any.required': 'DP value is required'
        }),
      batch_number: Joi.string().max(50)
        .messages({
          'string.max': 'Batch number cannot be more than 50 characters'
        }),
      used_from_inventory: Joi.boolean().default(true)
    })
  )
}),

updateCase: Joi.object({
  patientName: Joi.string().max(100)
    .messages({
      'string.max': 'Patient name cannot be more than 100 characters'
    }),
  patientAge: Joi.number().min(0)
    .messages({
      'number.min': 'Age cannot be negative'
    }),
  patientGender: Joi.string().valid('Male', 'Female', 'Other'),
  surgeryDate: Joi.date(),
  hospital: Joi.string(),
  doctor: Joi.string(),
  principle: Joi.string(),
  category: Joi.string(),
  subcategory: Joi.string(),
  dpValue: Joi.number().min(0),
  sellingPrice: Joi.number().min(0),
  status: Joi.string().valid('Active', 'Completed', 'Cancelled', 'Pending'),
  notes: Joi.string(),
  note: Joi.string(),  // Additional note to be added
  statusNote: Joi.string()  // Note for status change
}),

updateCaseStatus: Joi.object({
  status: Joi.string().valid('Active', 'Completed', 'Cancelled', 'Pending').required()
    .messages({
      'any.required': 'Status is required',
      'any.only': 'Status must be one of: Active, Completed, Cancelled, Pending'
    }),
  notes: Joi.string()
}),

addCaseProduct: Joi.object({
  product: Joi.string().required()
    .messages({
      'any.required': 'Product ID is required'
    }),
  quantity: Joi.number().min(1).default(1)
    .messages({
      'number.min': 'Quantity must be at least 1'
    }),
  unit_price: Joi.number().min(0).required()
    .messages({
      'number.min': 'Unit price cannot be negative',
      'any.required': 'Unit price is required'
    }),
  dp_value: Joi.number().min(0).required()
    .messages({
      'number.min': 'DP value cannot be negative',
      'any.required': 'DP value is required'
    }),
  batch_number: Joi.string().max(50)
    .messages({
      'string.max': 'Batch number cannot be more than 50 characters'
    }),
  used_from_inventory: Joi.boolean().default(true)
}),

addCaseNote: Joi.object({
  noteText: Joi.string().required()
    .messages({
      'any.required': 'Note text is required'
    })
}),

uploadCaseDocument: Joi.object({
  documentName: Joi.string().required().max(255)
    .messages({
      'any.required': 'Document name is required',
      'string.max': 'Document name cannot be more than 255 characters'
    }),
  documentType: Joi.string().max(100)
    .messages({
      'string.max': 'Document type cannot be more than 100 characters'
    }),
  filePath: Joi.string().required().max(500)
    .messages({
      'any.required': 'File path is required',
      'string.max': 'File path cannot be more than 500 characters'
    })
}),

addCaseFollowup: Joi.object({
  followupDate: Joi.date().required()
    .messages({
      'any.required': 'Follow-up date is required'
    }),
  description: Joi.string(),
  status: Joi.string().valid('Pending', 'Completed', 'Cancelled').default('Pending')
}),

updateCaseFollowup: Joi.object({
  followupDate: Joi.date(),
  description: Joi.string(),
  status: Joi.string().valid('Pending', 'Completed', 'Cancelled')
})


};

module.exports = {
  validate,
  schemas
};
