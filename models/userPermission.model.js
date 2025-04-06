const mongoose = require('mongoose');

const UserPermissionSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  permission: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Permission',
    required: true
  },
  // For tenant-based applications (optional)
  tenant: {
    type: String,
    default: 'default'
  },
  // Specific resource instances this permission applies to (ABAC)
  resourceId: {
    type: mongoose.Schema.Types.ObjectId,
    default: null
  },
  // Additional conditions/attributes for this permission (ABAC)
  conditions: {
    type: mongoose.Schema.Types.Mixed,
    default: {}
  },
  // Whether this is a deny rule (takes precedence over allow)
  deny: {
    type: Boolean,
    default: false
  },
  // When this permission expires (optional)
  expiresAt: {
    type: Date,
    default: null
  },
  assignedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true
});

// Create a compound index for uniqueness
UserPermissionSchema.index(
  { user: 1, permission: 1, tenant: 1, resourceId: 1 },
  { unique: true }
);

// Check if permission has expired
UserPermissionSchema.methods.hasExpired = function() {
  if (!this.expiresAt) {
    return false;
  }
  return new Date() > this.expiresAt;
};

module.exports = mongoose.model('UserPermission', UserPermissionSchema);
