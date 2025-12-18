// ===============================================
// models/Employee.js - Employee/Labour Management Model
// ===============================================
const mongoose = require('mongoose');

const employeeSchema = new mongoose.Schema({
  // Basic Information
  firstName: {
    type: String,
    required: [true, 'First name is required'],
    trim: true,
    maxlength: [50, 'First name cannot exceed 50 characters']
  },
  lastName: {
    type: String,
    required: [true, 'Last name is required'],
    trim: true,
    maxlength: [50, 'Last name cannot exceed 50 characters']
  },
  employeeId: {
    type: String,
    required: [true, 'Employee ID is required'],
    unique: true,
    trim: true,
    uppercase: true,
    maxlength: [20, 'Employee ID cannot exceed 20 characters']
  },
  
  // Contact Information
  phone: {
    type: String,
    trim: true,
    match: [/^[\+]?[0-9][\d\-\s]{8,15}$/, 'Please enter a valid phone number']
  },
  email: {
    type: String,
    trim: true,
    lowercase: true,
    match: [/^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/, 'Please enter a valid email']
  },
  
  // Work Information
  department: {
    type: String,
    required: [true, 'Department is required'],
    trim: true,
    maxlength: [100, 'Department name cannot exceed 100 characters']
  },
  position: {
    type: String,
    required: [true, 'Position is required'],
    trim: true,
    maxlength: [100, 'Position cannot exceed 100 characters']
  },
  employeeType: {
    type: String,
    required: [true, 'Employee type is required'],
    enum: ['permanent', 'temporary', 'daily-wage', 'contractor'],
    default: 'permanent'
  },
  
  // Employment Details
  hireDate: {
    type: Date,
    required: [true, 'Hire date is required'],
    default: Date.now
  },
  salary: {
    type: Number,
    min: [0, 'Salary cannot be negative']
  },
  salaryType: {
    type: String,
    enum: ['monthly', 'daily', 'hourly', 'contract'],
    default: 'monthly'
  },
  
  // Status
  isActive: {
    type: Boolean,
    default: true
  },
  status: {
    type: String,
    enum: ['active', 'inactive', 'terminated', 'on-leave'],
    default: 'active'
  },
  
  // Address Information
  address: {
    street: {
      type: String,
      trim: true,
      maxlength: [200, 'Street address cannot exceed 200 characters']
    },
    city: {
      type: String,
      trim: true,
      maxlength: [50, 'City cannot exceed 50 characters']
    },
    state: {
      type: String,
      trim: true,
      maxlength: [50, 'State cannot exceed 50 characters']
    },
    zipCode: {
      type: String,
      trim: true,
      maxlength: [10, 'ZIP code cannot exceed 10 characters']
    },
    country: {
      type: String,
      default: 'India',
      trim: true
    }
  },
  
  // Emergency Contact
  emergencyContact: {
    name: {
      type: String,
      trim: true,
      maxlength: [100, 'Emergency contact name cannot exceed 100 characters']
    },
    relationship: {
      type: String,
      trim: true,
      maxlength: [50, 'Relationship cannot exceed 50 characters']
    },
    phone: {
      type: String,
      trim: true,
      match: [/^[\+]?[0-9][\d\-\s]{8,15}$/, 'Please enter a valid phone number']
    },
    email: {
      type: String,
      trim: true,
      lowercase: true,
      match: [/^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/, 'Please enter a valid email']
    }
  },
  
  // Additional Information
  notes: {
    type: String,
    maxlength: [1000, 'Notes cannot exceed 1000 characters']
  },
  
  // System Fields
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

// Virtual for full name
employeeSchema.virtual('fullName').get(function() {
  return `${this.firstName} ${this.lastName}`;
});

// Virtual for display name with employee ID
employeeSchema.virtual('displayName').get(function() {
  return `${this.firstName} ${this.lastName} (${this.employeeId})`;
});

// Virtual for formatted salary display
employeeSchema.virtual('salaryDisplay').get(function() {
  if (!this.salary) return 'Not set';
  return `PKR${this.salary.toLocaleString()}`;
});

// Virtual for employment duration
employeeSchema.virtual('employmentDuration').get(function() {
  const now = new Date();
  const hireDate = new Date(this.hireDate);
  const diffTime = Math.abs(now - hireDate);
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  
  if (diffDays < 30) {
    return `${diffDays} days`;
  } else if (diffDays < 365) {
    const months = Math.floor(diffDays / 30);
    return `${months} month${months > 1 ? 's' : ''}`;
  } else {
    const years = Math.floor(diffDays / 365);
    const remainingMonths = Math.floor((diffDays % 365) / 30);
    return `${years} year${years > 1 ? 's' : ''} ${remainingMonths} month${remainingMonths > 1 ? 's' : ''}`;
  }
});

// Indexes for better performance
employeeSchema.index({ employeeId: 1 });
employeeSchema.index({ firstName: 1, lastName: 1 });
employeeSchema.index({ department: 1 });
employeeSchema.index({ position: 1 });
employeeSchema.index({ employeeType: 1 });
employeeSchema.index({ isActive: 1 });
employeeSchema.index({ status: 1 });
employeeSchema.index({ hireDate: -1 });

// Pre-save middleware to normalize employee ID
employeeSchema.pre('save', function(next) {
  if (this.isModified('employeeId')) {
    this.employeeId = this.employeeId.toUpperCase().trim();
  }
  next();
});

// Static method to get employee statistics
employeeSchema.statics.getEmployeeStats = async function() {
  const totalEmployees = await this.countDocuments();
  const activeEmployees = await this.countDocuments({ isActive: true });
  const inactiveEmployees = await this.countDocuments({ isActive: false });
  
  // Get employees by type
  const employeesByType = await this.aggregate([
    {
      $group: {
        _id: '$employeeType',
        count: { $sum: 1 }
      }
    },
    {
      $project: {
        type: '$_id',
        count: 1,
        _id: 0
      }
    }
  ]);
  
  // Get employees by department
  const employeesByDepartment = await this.aggregate([
    {
      $group: {
        _id: '$department',
        count: { $sum: 1 }
      }
    },
    {
      $sort: { count: -1 }
    },
    {
      $limit: 10
    },
    {
      $project: {
        department: '$_id',
        count: 1,
        _id: 0
      }
    }
  ]);
  
  return {
    totalEmployees,
    activeEmployees,
    inactiveEmployees,
    employeesByType,
    employeesByDepartment
  };
};

// Static method to get employees for expense creation
employeeSchema.statics.getEmployeesForExpense = async function() {
  return this.find({ isActive: true })
    .select('employeeId firstName lastName department position employeeType salary salaryType')
    .sort({ firstName: 1, lastName: 1 });
};

module.exports = mongoose.model('Employee', employeeSchema);
