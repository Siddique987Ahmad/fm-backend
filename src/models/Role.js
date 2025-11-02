const mongoose = require('mongoose');

const roleSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Role name is required'],
    unique: true,
    trim: true,
    lowercase: true,
    maxlength: [50, 'Role name cannot exceed 50 characters']
  },
  displayName: {
    type: String,
    required: [true, 'Display name is required'],
    trim: true,
    maxlength: [100, 'Display name cannot exceed 100 characters']
  },
  description: {
    type: String,
    trim: true,
    maxlength: [500, 'Description cannot exceed 500 characters']
  },
  permissions: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Permission'
  }],
  isActive: {
    type: Boolean,
    default: true
  },
  isSystemRole: {
    type: Boolean,
    default: false // System roles cannot be deleted
  },
  priority: {
    type: Number,
    default: 0, // Higher number = higher priority
    min: [0, 'Priority cannot be negative']
  },
  color: {
    type: String,
    default: '#3B82F6', // Default blue color
    match: [/^#[0-9A-F]{6}$/i, 'Color must be a valid hex color']
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  updatedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Virtual for user count with this role
roleSchema.virtual('userCount', {
  ref: 'User',
  localField: '_id',
  foreignField: 'role',
  count: true
});

// Index for better query performance
roleSchema.index({ name: 1 });
roleSchema.index({ isActive: 1 });
roleSchema.index({ priority: -1 });

// Pre-save middleware to normalize name
roleSchema.pre('save', function(next) {
  if (this.isModified('name')) {
    this.name = this.name.toLowerCase().replace(/\s+/g, '-');
  }
  next();
});

// Static method to get role hierarchy
roleSchema.statics.getHierarchy = function() {
  return this.find({ isActive: true })
    .sort({ priority: -1, createdAt: 1 })
    .populate('permissions', 'name displayName')
    .select('-__v');
};

// Static method to check if role has permission
roleSchema.methods.hasPermission = function(permissionName) {
  return this.permissions.some(permission => 
    permission.name === permissionName || permission._id.toString() === permissionName
  );
};

// Static method to add permission to role
roleSchema.methods.addPermission = function(permissionId) {
  if (!this.permissions.includes(permissionId)) {
    this.permissions.push(permissionId);
    return this.save();
  }
  return Promise.resolve(this);
};

// Static method to remove permission from role
roleSchema.methods.removePermission = function(permissionId) {
  this.permissions = this.permissions.filter(
    perm => perm.toString() !== permissionId.toString()
  );
  return this.save();
};

// Pre-remove middleware to check if role is in use
roleSchema.pre('remove', async function(next) {
  if (this.isSystemRole) {
    const error = new Error('System roles cannot be deleted');
    error.statusCode = 400;
    return next(error);
  }
  
  const User = mongoose.model('User');
  const userCount = await User.countDocuments({ role: this._id });
  
  if (userCount > 0) {
    const error = new Error(`Cannot delete role. ${userCount} user(s) are assigned to this role.`);
    error.statusCode = 400;
    return next(error);
  }
  
  next();
});

module.exports = mongoose.model('Role', roleSchema);
