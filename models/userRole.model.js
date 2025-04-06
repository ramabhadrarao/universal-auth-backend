const mongoose = require('mongoose');

const UserRoleSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  role: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Role',
    required: true
  },
  // For tenant-based applications (optional)
  tenant: {
    type: String,
    default: 'default'
  },
  // Specific attribute-based conditions for this user-role assignment
  attributes: {
    type: mongoose.Schema.Types.Mixed,
    default: {}
  },
  // When this role assignment expires (optional)
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

// Create a compound index for user and role to ensure uniqueness
UserRoleSchema.index({ user: 1, role: 1, tenant: 1 }, { unique: true });

// Check if user role assignment has expired
UserRoleSchema.methods.hasExpired = function() {
  if (!this.expiresAt) {
    return false;
  }
  return new Date() > this.expiresAt;
};

module.exports = mongoose.model('UserRole', UserRoleSchema);
