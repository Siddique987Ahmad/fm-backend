// ===============================================
// controllers/productController.js - Generic Controller for All Products
// ===============================================
const Product = require('../models/Product'); // We'll rename WhiteOil to Product

// @desc    Create new product transaction
// @route   POST /api/products/:productType
// @access  Public
const createTransaction = async (req, res) => {
  try {
    const { productType } = req.params; // Get product type from URL
    const {
      transactionType,
      clientName,
      weight,
      rate,
      remainingAmount,
      totalBalance,
      notes
    } = req.body;

    // Validation
    if (!transactionType || !clientName || !weight || !rate || remainingAmount === undefined || totalBalance === undefined) {
      return res.status(400).json({
        success: false,
        message: 'Please provide all required fields'
      });
    }

    // Create new transaction with productType
    const transaction = new Product({
      productType, // Add this field
      transactionType,
      clientName,
      weight: parseFloat(weight),
      weightUnit: 'kg',
      rate: parseFloat(rate),
      rateUnit: 'per_kg',
      remainingAmount: parseFloat(remainingAmount),
      totalBalance: parseFloat(totalBalance),
      notes
    });

    const savedTransaction = await transaction.save();

    res.status(201).json({
      success: true,
      message: `${productType.replace('-', ' ')} ${transactionType} transaction created successfully`,
      data: savedTransaction
    });

  } catch (error) {
    console.error('Error creating transaction:', error);
    
    if (error.name === 'ValidationError') {
      const errors = Object.values(error.errors).map(err => err.message);
      return res.status(400).json({
        success: false,
        message: 'Validation Error',
        errors
      });
    }

    res.status(500).json({
      success: false,
      message: 'Server Error',
      error: error.message
    });
  }
};

// @desc    Get all product transactions
// @route   GET /api/products/:productType
// @access  Public
const getAllTransactions = async (req, res) => {
  try {
    const { productType } = req.params; // Get product type from URL
    const {
      page = 1,
      limit = 10,
      transactionType,
      clientName,
      paymentStatus,
      sortBy = 'createdAt',
      sortOrder = 'desc'
    } = req.query;

    // Build filter object - include productType
    const filter = { productType };
    if (transactionType) filter.transactionType = transactionType;
    if (clientName) filter.clientName = new RegExp(clientName, 'i');

    // Calculate pagination
    const skip = (parseInt(page) - 1) * parseInt(limit);
    const sort = { [sortBy]: sortOrder === 'desc' ? -1 : 1 };

    // Get all transactions first
    let transactions = await Product.find(filter).sort(sort);

    // Now filter by calculated payment status if needed
    if (paymentStatus) {
      transactions = transactions.filter(transaction => {
        const total = transaction.totalBalance;
        const received = transaction.remainingAmount;
        
        let calculatedStatus;
        if (transaction.transactionType === 'sale') {
          if (received > total) {
            calculatedStatus = 'advance';
          } else if (received === total) {
            calculatedStatus = 'full';
          } else {
            calculatedStatus = 'pending';
          }
        } else {
          if (received > total) {
            calculatedStatus = 'overpaid';
          } else if (received === total) {
            calculatedStatus = 'full';
          } else {
            calculatedStatus = 'pending';
          }
        }
        
        return calculatedStatus === paymentStatus;
      });
    }

    // Apply pagination after filtering
    const total = transactions.length;
    const paginatedTransactions = transactions.slice(skip, skip + parseInt(limit));

    res.status(200).json({
      success: true,
      count: paginatedTransactions.length,
      total,
      pagination: {
        currentPage: parseInt(page),
        totalPages: Math.ceil(total / parseInt(limit)),
        hasNext: skip + paginatedTransactions.length < total,
        hasPrev: parseInt(page) > 1
      },
      data: paginatedTransactions
    });

  } catch (error) {
    console.error('Error fetching transactions:', error);
    res.status(500).json({
      success: false,
      message: 'Server Error',
      error: error.message
    });
  }
};

// @desc    Get single product transaction by ID
// @route   GET /api/products/:productType/:id
// @access  Public
const getTransactionById = async (req, res) => {
  try {
    const { productType } = req.params;
    const transaction = await Product.findOne({ 
      _id: req.params.id, 
      productType 
    });

    if (!transaction) {
      return res.status(404).json({
        success: false,
        message: 'Transaction not found'
      });
    }

    res.status(200).json({
      success: true,
      data: transaction
    });

  } catch (error) {
    console.error('Error fetching transaction:', error);
    
    if (error.name === 'CastError') {
      return res.status(400).json({
        success: false,
        message: 'Invalid transaction ID'
      });
    }

    res.status(500).json({
      success: false,
      message: 'Server Error',
      error: error.message
    });
  }
};

// @desc    Update product transaction
// @route   PUT /api/products/:productType/:id
// @access  Public
const updateTransaction = async (req, res) => {
  try {
    const { productType } = req.params;
    const transaction = await Product.findOne({ 
      _id: req.params.id, 
      productType 
    });

    if (!transaction) {
      return res.status(404).json({
        success: false,
        message: 'Transaction not found'
      });
    }

    // Update fields
    Object.keys(req.body).forEach(key => {
      if (req.body[key] !== undefined) {
        transaction[key] = req.body[key];
      }
    });

    const updatedTransaction = await transaction.save();

    res.status(200).json({
      success: true,
      message: 'Transaction updated successfully',
      data: updatedTransaction
    });

  } catch (error) {
    console.error('Error updating transaction:', error);
    
    if (error.name === 'ValidationError') {
      const errors = Object.values(error.errors).map(err => err.message);
      return res.status(400).json({
        success: false,
        message: 'Validation Error',
        errors
      });
    }

    if (error.name === 'CastError') {
      return res.status(400).json({
        success: false,
        message: 'Invalid transaction ID'
      });
    }

    res.status(500).json({
      success: false,
      message: 'Server Error',
      error: error.message
    });
  }
};

// @desc    Delete product transaction
// @route   DELETE /api/products/:productType/:id
// @access  Public
const deleteTransaction = async (req, res) => {
  try {
    const { productType } = req.params;
    const transaction = await Product.findOne({ 
      _id: req.params.id, 
      productType 
    });

    if (!transaction) {
      return res.status(404).json({
        success: false,
        message: 'Transaction not found'
      });
    }

    await Product.findByIdAndDelete(req.params.id);

    res.status(200).json({
      success: true,
      message: 'Transaction deleted successfully'
    });

  } catch (error) {
    console.error('Error deleting transaction:', error);
    
    if (error.name === 'CastError') {
      return res.status(400).json({
        success: false,
        message: 'Invalid transaction ID'
      });
    }

    res.status(500).json({
      success: false,
      message: 'Server Error',
      error: error.message
    });
  }
};

// @desc    Get product transaction statistics
// @route   GET /api/products/:productType/stats
// @access  Public
const getTransactionStats = async (req, res) => {
  try {
    const { productType } = req.params;
    
    const stats = await Product.aggregate([
      { $match: { productType } }, // Filter by product type
      {
        $group: {
          _id: '$transactionType',
          count: { $sum: 1 },
          totalWeight: { $sum: '$weight' },
          totalValue: { $sum: '$totalBalance' },
          avgRate: { $avg: '$rate' }
        }
      }
    ]);

    const totalTransactions = await Product.countDocuments({ productType });
    const recentTransactions = await Product.find({ productType })
      .sort({ createdAt: -1 })
      .limit(5)
      .select('transactionType clientName weight totalBalance createdAt');

    res.status(200).json({
      success: true,
      data: {
        stats,
        totalTransactions,
        recentTransactions
      }
    });

  } catch (error) {
    console.error('Error fetching stats:', error);
    res.status(500).json({
      success: false,
      message: 'Server Error',
      error: error.message
    });
  }
};

module.exports = {
  createTransaction,
  getAllTransactions,
  getTransactionById,
  updateTransaction,
  deleteTransaction,
  getTransactionStats
};