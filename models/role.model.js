const mongoose = require('mongoose');

const RoleSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Please add a role name'],
    unique: true,
    trim: true,
    maxlength: [20, 'Role name cannot be more than 20 characters']
  },
  description: {
    type: String,
    required: [true, 'Please add a description'],
    maxlength: [200, 'Description cannot be more than 200 characters']
  },
  // Store permissions that this role has
  permissions: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Permission'
  }],
  // For system roles that cannot be deleted (admin, user, etc.)
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

// Prevent deletion of system roles
RoleSchema.pre('remove', async function(next) {
  if (this.isSystem) {
    const error = new Error('Cannot delete system roles');
    return next(error);
  }
  next();
});

module.exports = mongoose.model('Role', RoleSchema);
