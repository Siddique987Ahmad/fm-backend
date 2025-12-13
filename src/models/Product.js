// ===============================================
// models/Product.js - Generic MongoDB Model for All Products
// ===============================================
const mongoose = require('mongoose');

const productSchema = new mongoose.Schema({
  // NEW FIELD - Product type to differentiate between oil types
  productType: {
    type: String,
    required: [true, 'Product type is required'],
    trim: true,
    lowercase: true
  },
  // Change this part in your model:

  transactionType: {
    type: String,
    required: [true, 'Transaction type is required'],
    enum: ['sale', 'purchase'],
    lowercase: true
  },
  clientName: {
    type: String,
    required: [true, 'Client/Supplier name is required'],
    trim: true,
    maxLength: [100, 'Name cannot exceed 100 characters']
  },
  weight: {
    type: Number,
    required: [true, 'Weight is required'],
    min: [0.01, 'Weight must be greater than 0'],
    validate: {
      validator: function(value) {
        return value > 0;
      },
      message: 'Weight must be a positive number'
    }
  },
  // Added weight unit field for clarity
  weightUnit: {
    type: String,
    default: 'kg',
    enum: ['kg', 'g', 'ton'],
    lowercase: true
  },
  rate: {
    type: Number,
    required: [true, 'Rate is required'],
    min: [0.01, 'Rate must be greater than 0'],
    validate: {
      validator: function(value) {
        return value > 0;
      },
      message: 'Rate must be a positive number'
    }
  },
  // Added rate unit field for clarity
  rateUnit: {
    type: String,
    default: 'per_kg',
    enum: ['per_kg', 'per_g', 'per_ton', 'per_liter'],
    lowercase: true
  },
  remainingAmount: {
    type: Number,
    required: [true, 'Remaining amount/Amount paid is required'],
    min: [0, 'Amount cannot be negative']
  },
  totalBalance: {
    type: Number,
    required: [true, 'Total balance is required'],
    min: [0, 'Total balance cannot be negative']
  },
  // Payment status fields for advance payment tracking
  paymentStatus: {
    type: String,
    enum: ['pending', 'full', 'advance', 'overpaid'],
    default: 'pending'
  },
  advanceAmount: {
    type: Number,
    default: 0,
    min: [0, 'Advance amount cannot be negative']
  },
  calculatedTotal: {
    type: Number,
    default: function() {
      return this.weight * this.rate;
    }
  },
  status: {
    type: String,
    enum: ['pending', 'completed', 'cancelled'],
    default: 'pending'
  },
  notes: {
    type: String,
    maxLength: [500, 'Notes cannot exceed 500 characters']
  },
  isInternalTransaction: {
    type: Boolean,
    default: false
  },
  // Nug calculation fields
  useNugCalculation: {
    type: Boolean,
    default: false
  },
  nugEntries: [{
    containers: {
      type: Number,
      min: [0, 'Containers cannot be negative']
    },
    tareWeightPerContainer: {
      type: Number,
      min: [0, 'Tare weight cannot be negative']
    },
    grossWeight: {
      type: Number,
      min: [0, 'Gross weight cannot be negative']
    },
    netWeight: {
      type: Number,
      min: [0, 'Net weight cannot be negative']
    }
  }],
  totalNetWeight: {
    type: Number,
    default: 0,
    min: [0, 'Total net weight cannot be negative']
  },
  createdBy: {
    type: String,
    default: 'system'
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Virtual for outstanding amount with advance payment logic
productSchema.virtual('outstandingAmount').get(function() {
  const total = this.totalBalance;
  const received = this.remainingAmount;
  
  if (this.transactionType === 'sale') {
    if (received > total) {
      return 0; // No outstanding, advance payment made
    } else {
      return total - received; // Normal outstanding amount
    }
  } else { // purchase
    if (received > total) {
      return 0; // No outstanding, overpayment made
    } else {
      return total - received; // Normal outstanding amount
    }
  }
});

// Virtual for actual advance payment amount
productSchema.virtual('actualAdvanceAmount').get(function() {
  const total = this.totalBalance;
  const received = this.remainingAmount;
  
  if (received > total) {
    return received - total;
  }
  return 0;
});

// Virtual for payment status description
productSchema.virtual('paymentStatusDescription').get(function() {
  const total = this.totalBalance;
  const received = this.remainingAmount;
  
  if (this.transactionType === 'sale') {
    if (received > total) {
      return `Advance Payment: PKR${(received - total).toFixed(2)}`;
    } else if (received === total) {
      return 'Full Payment Received';
    } else {
      return `Pending: PKR${(total - received).toFixed(2)}`;
    }
  } else {
    if (received > total) {
      return `Overpaid: PKR${(received - total).toFixed(2)}`;
    } else if (received === total) {
      return 'Full Payment Made';
    } else {
      return `Pending: PKR${(total - received).toFixed(2)}`;
    }
  }
});

// Virtual for weight in different units (conversion helpers)
productSchema.virtual('weightInTons').get(function() {
  if (!this.weight || !this.weightUnit) return null;
  
  if (this.weightUnit === 'kg') {
    return this.weight / 1000;
  } else if (this.weightUnit === 'g') {
    return this.weight / 1000000;
  } else {
    return this.weight; // already in tons
  }
});

productSchema.virtual('weightInGrams').get(function() {
  if (!this.weight || !this.weightUnit) return null;
  
  if (this.weightUnit === 'kg') {
    return this.weight * 1000;
  } else if (this.weightUnit === 'ton') {
    return this.weight * 1000000;
  } else {
    return this.weight; // already in grams
  }
});

// Virtual for formatted weight display
productSchema.virtual('weightDisplay').get(function() {
  if (!this.weight || !this.weightUnit) return 'N/A';
  return `${this.weight} ${this.weightUnit}`;
});

// Virtual for formatted rate display
productSchema.virtual('rateDisplay').get(function() {
  if (!this.rate || !this.rateUnit) return 'N/A';
  return `PKR${this.rate} ${this.rateUnit.replace('_', ' ')}`;
});

// Virtual for formatted product display - FIXED WITH NULL CHECK
productSchema.virtual('productDisplay').get(function() {
  if (!this.productType) return 'Unknown Product';
  return this.productType.replace('-', ' ').replace(/\b\w/g, l => l.toUpperCase());
});

// Pre-save middleware to calculate total and set payment status
productSchema.pre('save', function(next) {
  // Calculate total from weight and rate
  this.calculatedTotal = this.weight * this.rate;
  
  // Determine payment status and advance amount
  const total = this.totalBalance;
  const received = this.remainingAmount;
  
  if (received > total) {
    this.paymentStatus = this.transactionType === 'sale' ? 'advance' : 'overpaid';
    this.advanceAmount = received - total;
  } else if (received === total) {
    this.paymentStatus = 'full';
    this.advanceAmount = 0;
  } else {
    this.paymentStatus = 'pending';
    this.advanceAmount = 0;
  }
  
  next();
});

// Index for better query performance
productSchema.index({ productType: 1, transactionType: 1, createdAt: -1 });
productSchema.index({ productType: 1, clientName: 1 });
productSchema.index({ productType: 1, weightUnit: 1 });
productSchema.index({ productType: 1, paymentStatus: 1 });

// Debug hook to check isInternalTransaction before save
productSchema.pre('save', function(next) {
  if (this.isNew) {
    console.log('🔍 [Product Model] Pre-save check:', {
      client: this.clientName,
      type: this.transactionType,
      isInternal: this.isInternalTransaction,
      internalType: typeof this.isInternalTransaction
    });
  }
  next();
});

module.exports = mongoose.model('Product', productSchema);