const mongoose = require('mongoose');

const ProductCatalogSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Please add a product name'],
    trim: true,
    unique: true
  },
  description: {
    type: String,
    trim: true
  },
  unit: {
    type: String,
    required: [true, 'Please add a unit of measurement'],
    enum: ['Liters', 'Gallons', 'Barrels', 'Tons', 'Kilograms', 'Pieces', 'Cubic Meters']
  },
  pricePerUnit: {
    type: Number,
    required: [true, 'Please add a price per unit'],
    min: [0, 'Price cannot be negative']
  },
  isActive: {
    type: Boolean,
    default: true
  },
  allowedTransactions: {
    type: [String],
    enum: ['sale', 'purchase'],
    default: ['sale', 'purchase'],
    validate: {
      validator: function(value) {
        return value && value.length > 0;
      },
      message: 'At least one transaction type must be allowed'
    }
  },
  enableNugCalculation: {
    type: Boolean,
    default: false
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

module.exports = mongoose.model('ProductCatalog', ProductCatalogSchema);
