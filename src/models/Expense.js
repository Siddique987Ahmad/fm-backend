// ===============================================
// models/Expense.js - Expense Management Model
// ===============================================
const mongoose = require('mongoose');

const expenseSchema = new mongoose.Schema({
  // Expense category
  expenseCategory: {
    type: String,
    required: [true, 'Expense category is required'],
    enum: ['home', 'labour', 'factory', 'zakat', 'personal'],
    lowercase: true
  },
  
  // Basic expense information
  title: {
    type: String,
    // required: [true, 'Expense title is required'],
    trim: true,
    maxLength: [100, 'Title cannot exceed 100 characters']
  },
  
  description: {
    type: String,
    trim: true,
    maxLength: [500, 'Description cannot exceed 500 characters']
  },
  
  amount: {
    type: Number,
    required: [true, 'Amount is required'],
    min: [0.01, 'Amount must be greater than 0'],
    validate: {
      validator: function(value) {
        return value > 0;
      },
      message: 'Amount must be a positive number'
    }
  },
  
  // Payment status
  paymentStatus: {
    type: String,
    enum: ['paid', 'pending', 'advance'],
    default: 'pending'
  },
  
  // Amount paid (for tracking partial payments)
  amountPaid: {
    type: Number,
    default: 0,
    min: [0, 'Amount paid cannot be negative']
  },
  
  // Date of expense
  expenseDate: {
    type: Date,
    default: Date.now
  },
  
  // Due date (for pending expenses)
  dueDate: {
    type: Date
  },
  
  // Category-specific fields
  categorySpecific: {
    // Home expenses
    homeType: {
      type: String,
      enum: ['groceries', 'utilities', 'maintenance', 'furniture', 'electronics', 'other']
    },
    
    // Labour expenses
    employeeName: {
      type: String,
      trim: true,
      maxLength: [50, 'Employee name cannot exceed 50 characters']
    },
    employeeType: {
      type: String,
      enum: ['permanent', 'temporary', 'daily-wage', 'contractor']
    },
    salaryMonth: {
      type: String, // Format: YYYY-MM
      validate: {
        validator: function(v) {
          return !v || /^\d{4}-\d{2}$/.test(v);
        },
        message: 'Salary month must be in YYYY-MM format'
      }
    },
    advanceReason: {
      type: String,
      trim: true,
      maxLength: [200, 'Advance reason cannot exceed 200 characters']
    },
    
    // Factory expenses
    factoryType: {
      type: String,
      enum: ['rent', 'electricity', 'maintenance', 'equipment', 'raw-materials', 'transportation', 'other']
    },
    
    // Zakat expenses
    zakatType: {
      type: String,
      enum: ['money', 'goods', 'property', 'business']
    },
    zakatYear: {
      type: Number,
      min: [2020, 'Year must be 2020 or later'],
      max: [new Date().getFullYear() + 1, 'Year cannot be in the future']
    },
    
    // Personal expenses
    personalType: {
      type: String,
      enum: ['medical', 'education', 'transportation', 'entertainment', 'clothing', 'other']
    }
  },
  
  // Receipt/Invoice information
  receiptNumber: {
    type: String,
    trim: true,
    maxLength: [50, 'Receipt number cannot exceed 50 characters']
  },
  
  vendor: {
    type: String,
    trim: true,
    maxLength: [100, 'Vendor name cannot exceed 100 characters']
  },
  
  // Notes
  notes: {
    type: String,
    maxLength: [1000, 'Notes cannot exceed 1000 characters']
  },
  
  // Approval status (for larger expenses)
  approvalStatus: {
    type: String,
    enum: ['pending', 'approved', 'rejected'],
    default: 'approved'
  },
  
  // Recurring expense information
  isRecurring: {
    type: Boolean,
    default: false
  },
  
  recurringFrequency: {
    type: String,
    enum: ['daily', 'weekly', 'monthly', 'yearly']
  },
  
  // Tags for better categorization
  tags: [{
    type: String,
    trim: true,
    maxLength: [20, 'Tag cannot exceed 20 characters']
  }],
  
  // Created by
  createdBy: {
    type: String,
    default: 'system'
  },
  
  // Status
  status: {
    type: String,
    enum: ['active', 'cancelled', 'completed'],
    default: 'active'
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Virtual for outstanding amount
expenseSchema.virtual('outstandingAmount').get(function() {
  return Math.max(0, this.amount - this.amountPaid);
});

// Virtual for payment percentage
expenseSchema.virtual('paymentPercentage').get(function() {
  return this.amount > 0 ? Math.round((this.amountPaid / this.amount) * 100) : 0;
});

// Virtual for formatted amount display
expenseSchema.virtual('amountDisplay').get(function() {
  return `PKR${this.amount.toLocaleString()}`;
});

// Virtual for formatted outstanding display
expenseSchema.virtual('outstandingDisplay').get(function() {
  const outstanding = this.outstandingAmount;
  return outstanding > 0 ? `PKR${outstanding.toLocaleString()}` : 'Paid';
});

// Virtual for category display name
expenseSchema.virtual('categoryDisplay').get(function() {
  const categoryNames = {
    'home': 'Home Expense',
    'labour': 'Labour Expense', 
    'factory': 'Factory Expense',
    'zakat': 'Zakat',
    'personal': 'Personal Expense'
  };
  return categoryNames[this.expenseCategory] || 'Unknown';
});

// Virtual for subcategory display
expenseSchema.virtual('subcategoryDisplay').get(function() {
  const specific = this.categorySpecific;
  if (!specific) return '';
  
  switch(this.expenseCategory) {
    case 'home':
      return specific.homeType ? specific.homeType.replace('-', ' ').replace(/\b\w/g, l => l.toUpperCase()) : '';
    case 'labour':
      return specific.employeeName || 'Labour Expense';
    case 'factory':
      return specific.factoryType ? specific.factoryType.replace('-', ' ').replace(/\b\w/g, l => l.toUpperCase()) : '';
    case 'zakat':
      return specific.zakatType ? `${specific.zakatType} - ${specific.zakatYear || ''}` : '';
    case 'personal':
      return specific.personalType ? specific.personalType.replace('-', ' ').replace(/\b\w/g, l => l.toUpperCase()) : '';
    default:
      return '';
  }
});

// Pre-save middleware to update payment status
expenseSchema.pre('save', function(next) {
  // Update payment status based on amount paid
  if (this.amountPaid >= this.amount) {
    this.paymentStatus = 'paid';
  } else if (this.amountPaid > 0) {
    this.paymentStatus = 'advance';
  } else {
    this.paymentStatus = 'pending';
  }
  
  // Set default due date if not provided (30 days from expense date)
  if (!this.dueDate && this.paymentStatus === 'pending') {
    this.dueDate = new Date(this.expenseDate.getTime() + (30 * 24 * 60 * 60 * 1000));
  }
  
  next();
});

// Static method to get expense summary by category
expenseSchema.statics.getExpenseSummary = async function(category = null, startDate = null, endDate = null) {
  const matchQuery = {};
  
  if (category) {
    matchQuery.expenseCategory = category;
  }
  
  if (startDate || endDate) {
    matchQuery.createdAt = {};
    if (startDate) matchQuery.createdAt.$gte = new Date(startDate);
    if (endDate) matchQuery.createdAt.$lte = new Date(endDate);
  }
  
  const summary = await this.aggregate([
    { $match: matchQuery },
    {
      $group: {
        _id: '$expenseCategory',
        totalAmount: { $sum: '$amount' },
        totalPaid: { $sum: '$amountPaid' },
        count: { $sum: 1 },
        pendingAmount: { $sum: { $subtract: ['$amount', '$amountPaid'] } }
      }
    },
    {
      $project: {
        category: '$_id',
        totalAmount: 1,
        totalPaid: 1,
        count: 1,
        pendingAmount: 1,
        paymentPercentage: {
          $round: [{
            $multiply: [
              { $divide: ['$totalPaid', '$totalAmount'] },
              100
            ]
          }, 2]
        }
      }
    }
  ]);
  
  return summary;
};

// Indexes for better performance
expenseSchema.index({ expenseCategory: 1, createdAt: -1 });
expenseSchema.index({ expenseCategory: 1, paymentStatus: 1 });
expenseSchema.index({ 'categorySpecific.employeeName': 1, expenseCategory: 1 });
expenseSchema.index({ expenseDate: -1 });
expenseSchema.index({ dueDate: 1, paymentStatus: 1 });
expenseSchema.index({ tags: 1 });

module.exports = mongoose.model('Expense', expenseSchema);