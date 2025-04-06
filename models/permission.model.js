const mongoose = require('mongoose');

const PermissionSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Please add a permission name'],
    unique: true,
    trim: true,
    maxlength: [50, 'Permission name cannot be more than 50 characters']
  },
  description: {
    type: String,
    required: [true, 'Please add a description'],
    maxlength: [200, 'Description cannot be more than 200 characters']
  },
  // The resource this permission applies to (e.g., 'users', 'posts', etc.)
  resource: {
    type: String,
    required: [true, 'Please specify a resource'],
    trim: true
  },
  // The action this permission grants (e.g., 'read', 'create', 'update', 'delete')
  action: {
    type: String,
    required: [true, 'Please specify an action'],
    enum: ['create', 'read', 'update', 'delete', 'manage'],
    trim: true
  },
  // Attributes the permission applies to (for ABAC)
  attributes: {
    type: mongoose.Schema.Types.Mixed,
    default: {}
  },
  // For system permissions that cannot be deleted
  isSystem: {
    type: Boolean,
    default: false
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true
});

// Create a compound index on resource and action to ensure uniqueness
PermissionSchema.index({ resource: 1, action: 1 }, { unique: true });

// Prevent deletion of system permissions
PermissionSchema.pre('remove', async function(next) {
  if (this.isSystem) {
    const error = new Error('Cannot delete system permissions');
    return next(error);
  }
  next();
});

module.exports = mongoose.model('Permission', PermissionSchema);
