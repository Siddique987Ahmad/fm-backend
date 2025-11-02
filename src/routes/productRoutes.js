// ===============================================
// routes/productRoutes.js - Generic Routes for All Products
// ===============================================
const express = require('express');
const router = express.Router();
const Product = require('../models/Product');
const ProductCatalog = require('../models/ProductCatalog');
const {
  createTransaction,
  getAllTransactions,
  getTransactionById,
  updateTransaction,
  deleteTransaction,

} = require('../controllers/productController');

// @route   GET /api/products/types
// @desc    Get all product types for user interface
// @access  Public
router.get('/types', async (req, res) => {
  try {
    const products = await ProductCatalog.find({ isActive: true }).select('name _id allowedTransactions');
    
    const productTypes = products.map(product => ({
      id: product._id,
      name: product.name,
      value: product.name.toLowerCase().replace(/\s+/g, '-'),
      allowedTransactions: product.allowedTransactions || ['sale', 'purchase']
    }));

    res.status(200).json({ success: true, data: productTypes });
  } catch (error) {
    console.error('Error fetching product types:', error);
    res.status(500).json({
      success: false,
      message: 'Server Error',
      error: error.message
    });
  }
});

// @route   POST /api/products/:productType
// @desc    Create new product transaction
// @access  Public
router.post('/:productType', createTransaction);

// @route   GET /api/products/:productType/stats
// @desc    Get transaction statistics for specific product
// @access  Public
router.get('/:productType/stats', async (req, res) => {
  try {
    const { productType } = req.params;
    
    // Get all transactions for this product type
    const transactions = await Product.find({ productType });
    
    // Calculate statistics
    let totalSales = 0;
    let totalPurchases = 0;
    let totalSalesAmount = 0;
    let totalPurchasesAmount = 0;
    let totalTransactions = transactions.length;
    
    transactions.forEach(transaction => {
      if (transaction.transactionType === 'sale') {
        totalSales++;
        totalSalesAmount += transaction.totalBalance || 0;
      } else if (transaction.transactionType === 'purchase') {
        totalPurchases++;
        totalPurchasesAmount += transaction.totalBalance || 0;
      }
    });
    
    const totalAmount = totalSalesAmount + totalPurchasesAmount;
    
    res.status(200).json({
      success: true,
      data: {
        productType,
        totalTransactions,
        totalSales,
        totalPurchases,
        totalSalesAmount,
        totalPurchasesAmount,
        totalAmount,
        summary: {
          sales: {
            count: totalSales,
            amount: totalSalesAmount
          },
          purchases: {
            count: totalPurchases,
            amount: totalPurchasesAmount
          }
        }
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
});

// @route   GET /api/products/:productType
// @desc    Get all product transactions with pagination and filtering
// @access  Public
router.get('/:productType', getAllTransactions);

// @route   GET /api/products/:productType/:id
// @desc    Get single product transaction by ID
// @access  Public
router.get('/:productType/:id', getTransactionById);

// @route   PUT /api/products/:productType/:id
// @desc    Update product transaction
// @access  Public
router.put('/:productType/:id', updateTransaction);

// @route   DELETE /api/products/:productType/:id
// @desc    Delete product transaction
// @access  Public
router.delete('/:productType/:id', deleteTransaction);

module.exports = router;