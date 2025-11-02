const mongoose = require('mongoose');

const permissionSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Permission name is required'],
    unique: true,
    trim: true,
    lowercase: true,
    maxlength: [100, 'Permission name cannot exceed 100 characters']
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
  category: {
    type: String,
    required: [true, 'Permission category is required'],
    trim: true,
    enum: {
      values: [
        'user_management',
        'role_management', 
        'permission_management',
        'product_management',
        'transaction_management',
        'expense_management',
        'report_management',
        'system_settings',
        'audit_logs'
      ],
      message: 'Invalid permission category'
    }
  },
  action: {
    type: String,
    required: [true, 'Permission action is required'],
    trim: true,
    enum: {
      values: ['create', 'read', 'update', 'delete', 'manage', 'view'],
      message: 'Invalid permission action'
    }
  },
  resource: {
    type: String,
    required: [true, 'Permission resource is required'],
    trim: true,
    lowercase: true,
    maxlength: [50, 'Resource name cannot exceed 50 characters']
  },
  isActive: {
    type: Boolean,
    default: true
  },
  isSystemPermission: {
    type: Boolean,
    default: false // System permissions cannot be deleted
  },
  priority: {
    type: Number,
    default: 0,
    min: [0, 'Priority cannot be negative']
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

// Virtual for full permission name
permissionSchema.virtual('fullName').get(function() {
  return `${this.action}_${this.resource}`;
});

// Virtual for role count using this permission
permissionSchema.virtual('roleCount', {
  ref: 'Role',
  localField: '_id',
  foreignField: 'permissions',
  count: true
});

// Index for better query performance
permissionSchema.index({ name: 1 });
permissionSchema.index({ category: 1 });
permissionSchema.index({ action: 1 });
permissionSchema.index({ resource: 1 });
permissionSchema.index({ isActive: 1 });

// Pre-save middleware to generate name from action and resource
permissionSchema.pre('save', function(next) {
  if (this.isModified('action') || this.isModified('resource')) {
    this.name = `${this.action}_${this.resource}`.toLowerCase();
  }
  next();
});

// Static method to get permissions by category
permissionSchema.statics.getByCategory = function(category) {
  return this.find({ category, isActive: true })
    .sort({ priority: -1, displayName: 1 })
    .select('-__v');
};

// Static method to get all categories with permissions
permissionSchema.statics.getCategories = function() {
  return this.aggregate([
    { $match: { isActive: true } },
    { $group: { _id: '$category', permissions: { $push: '$$ROOT' } } },
    { $sort: { _id: 1 } }
  ]);
};

// Static method to check if permission exists
permissionSchema.statics.permissionExists = function(action, resource) {
  const name = `${action}_${resource}`.toLowerCase();
  return this.findOne({ name, isActive: true });
};

// Static method to create permission if not exists
permissionSchema.statics.findOrCreate = async function(permissionData, createdBy) {
  const existingPermission = await this.permissionExists(
    permissionData.action, 
    permissionData.resource
  );
  
  if (existingPermission) {
    return existingPermission;
  }
  
  return this.create({
    ...permissionData,
    createdBy
  });
};

// Pre-remove middleware to check if permission is in use
permissionSchema.pre('remove', async function(next) {
  if (this.isSystemPermission) {
    const error = new Error('System permissions cannot be deleted');
    error.statusCode = 400;
    return next(error);
  }
  
  const Role = mongoose.model('Role');
  const roleCount = await Role.countDocuments({ permissions: this._id });
  
  if (roleCount > 0) {
    const error = new Error(`Cannot delete permission. ${roleCount} role(s) are using this permission.`);
    error.statusCode = 400;
    return next(error);
  }
  
  next();
});

module.exports = mongoose.model('Permission', permissionSchema);
