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

// Import authentication middleware
const { protect, checkPermission } = require('../middleware/auth');

// IMPORTANT: Routes must be ordered from most specific to least specific
// So '/types' and '/:productType/stats' must come BEFORE '/:productType'

// @route   GET /api/products/types
// @desc    Get all product types for user interface
// @access  Private (read_product permission required)
router.get('/types', protect, checkPermission('read_product'), async (req, res) => {
  try {
    // Ensure JSON response
    res.setHeader('Content-Type', 'application/json');

    const products = await ProductCatalog.find({ isActive: true }).select('name _id allowedTransactions');

    const productTypes = products.map(product => ({
      id: product._id,
      name: product.name,
      value: product.name.toLowerCase().replace(/\s+/g, '-'),
      allowedTransactions: product.allowedTransactions || ['sale', 'purchase']
    }));

    return res.status(200).json({ success: true, data: productTypes });
  } catch (error) {
    console.error('Error fetching product types:', error);
    if (!res.headersSent) {
      return res.status(500).json({
        success: false,
        message: 'Server Error',
        error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
      });
    }
  }
});

// @route   GET /api/products/:productType/stats
// @desc    Get transaction statistics for specific product
// @access  Private (read_product permission required)
// NOTE: This must come BEFORE /:productType route to avoid route matching conflicts
router.get('/:productType/stats', protect, checkPermission('read_product'), async (req, res) => {
  try {
    // Ensure JSON response
    res.setHeader('Content-Type', 'application/json');

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

    return res.status(200).json({
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
    if (!res.headersSent) {
      return res.status(500).json({
        success: false,
        message: 'Server Error',
        error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
      });
    }
  }
});

// @route   POST /api/products/:productType
// @desc    Create new product transaction
// @access  Private (create_product permission required)
router.post('/:productType', protect, checkPermission('create_product'), createTransaction);

// @route   GET /api/products/:productType
// @desc    Get all product transactions with pagination and filtering
// @access  Private (read_product permission required)
router.get('/:productType', protect, checkPermission('read_product'), getAllTransactions);

// @route   GET /api/products/:productType/:id/invoice
// @desc    Generate invoice PDF for single transaction
// @access  Private (read_product permission required)
// NOTE: This must come BEFORE /:productType/:id route to avoid route matching conflicts
router.get('/:productType/:id/invoice', protect, checkPermission('read_product'), async (req, res) => {
  try {
    const { productType, id } = req.params;

    console.log(`📄 Invoice Request: productType=${productType}, id=${id}`);

    // Find the transaction using .lean() to get a plain JavaScript object
    const transaction = await Product.findOne({ _id: id, productType }).lean();

    if (!transaction) {
      console.log(`❌ Transaction not found: ${id} for productType: ${productType}`);
      return res.status(404).json({
        success: false,
        message: 'Transaction not found'
      });
    }

    console.log(`✅ Transaction found:`, {
      _id: transaction._id,
      productType: transaction.productType,
      clientName: transaction.clientName,
      totalBalance: transaction.totalBalance
    });

    // Generate PDF invoice
    const pdfService = require('../services/pdfService');
    console.log('📄 Starting PDF generation...');
    const pdfBuffer = await pdfService.generateTransactionInvoice(transaction, productType);

    if (!pdfBuffer || pdfBuffer.length === 0) {
      throw new Error('PDF buffer is empty');
    }

    console.log(`✅ PDF generated successfully, size: ${pdfBuffer.length} bytes`);

    // Set headers and send PDF
    res.setHeader('Content-Type', 'application/pdf');

    // Sanitize client name for filename (remove special characters, replace spaces with hyphens)
    const sanitizedClientName = transaction.clientName
      .replace(/[^a-zA-Z0-9\s]/g, '') // Remove special characters
      .replace(/\s+/g, '-') // Replace spaces with hyphens
      .toLowerCase() // Convert to lowercase
      .substring(0, 50); // Limit length to 50 characters

    const filename = `${sanitizedClientName}-invoice.pdf`;
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.send(pdfBuffer);
  } catch (error) {
    console.error('❌ Error generating invoice:', error);
    console.error('❌ Error name:', error.name);
    console.error('❌ Error message:', error.message);
    console.error('❌ Error stack:', error.stack);
    if (!res.headersSent) {
      // Always show error message for debugging (can be removed in production later)
      res.status(500).json({
        success: false,
        message: 'Error generating invoice',
        error: error.message || 'Internal server error',
        details: process.env.NODE_ENV === 'development' ? {
          name: error.name,
          stack: error.stack
        } : undefined
      });
    }
  }
});

// @route   GET /api/products/:productType/advances
// @desc    Get all transactions with advance payments (partial payments)
// @access  Private
// NOTE: This must come BEFORE /:productType/:id route to avoid route matching conflicts
router.get('/:productType/advances', protect, async (req, res) => {
  try {
    const { productType } = req.params;
    const { transactionType, clientName, page = 1, limit = 50 } = req.query;

    // Build query for advance payments
    // In this system, advance payment means customer paid MORE than total
    // remainingAmount = amount received/paid
    // totalBalance = total transaction amount
    // Advance payment = remainingAmount > totalBalance (overpayment)
    const query = {
      productType,
      $expr: {
        $gt: ['$remainingAmount', '$totalBalance']
      }
    };

    // Add transaction type filter
    if (transactionType && transactionType !== 'all') {
      query.transactionType = transactionType;
    }

    // Add client name filter
    if (clientName) {
      query.clientName = new RegExp(clientName, 'i');
    }

    // Calculate pagination
    const skip = (parseInt(page) - 1) * parseInt(limit);

    // Fetch transactions and count
    const [transactions, totalCount] = await Promise.all([
      Product.find(query)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(parseInt(limit))
        .lean(),
      Product.countDocuments(query)
    ]);

    // Calculate summary
    const summary = {
      totalSalesAdvances: 0,
      totalPurchasesAdvances: 0,
      totalOutstanding: 0,
      salesCount: 0,
      purchasesCount: 0
    };

    transactions.forEach(txn => {
      // For advance payments, remainingAmount > totalBalance
      // The advance amount is the excess payment
      const advanceAmount = txn.remainingAmount - txn.totalBalance;
      summary.totalOutstanding += advanceAmount; // This will be positive (advance given to customer/supplier)
      
      if (txn.transactionType === 'sale') {
        summary.totalSalesAdvances += advanceAmount;
        summary.salesCount++;
      } else {
        summary.totalPurchasesAdvances += advanceAmount;
        summary.purchasesCount++;
      }
    });

    res.status(200).json({
      success: true,
      data: {
        transactions,
        summary,
        pagination: {
          currentPage: parseInt(page),
          totalPages: Math.ceil(totalCount / parseInt(limit)),
          totalItems: totalCount,
          itemsPerPage: parseInt(limit)
        }
      }
    });

  } catch (error) {
    console.error('Error fetching advance payments:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching advance payments',
      error: error.message
    });
  }
});

// @route   GET /api/products/:productType/client-report
// @desc    Generate PDF report for all client transactions
// @access  Private
// NOTE: This must come BEFORE /:productType/:id route to avoid route matching conflicts
router.get('/:productType/client-report', protect, async (req, res) => {
  console.log('🔍 [Backend] ========== CLIENT REPORT REQUEST ==========');
  console.log('🔍 [Backend] Route matched: /:productType/client-report');
  console.log('🔍 [Backend] req.params:', req.params);
  console.log('🔍 [Backend] req.query:', req.query);
  console.log('🔍 [Backend] Full URL:', req.originalUrl);

  try {
    const { productType } = req.params;
    const { clientName } = req.query;

    console.log('🔍 [Backend] Extracted productType:', productType);
    console.log('🔍 [Backend] Extracted clientName:', clientName);

    if (!clientName) {
      console.error('❌ [Backend] Client name is missing!');
      return res.status(400).json({
        success: false,
        message: 'Client name is required'
      });
    }

    console.log(`📄 [Backend] Generating client report for: ${clientName} (${productType})`);

    // Fetch all transactions for this client
    const transactions = await Product.find({
      productType,
      clientName: new RegExp(clientName, 'i')
    }).sort({ createdAt: -1 }).lean();

    console.log(`🔍 [Backend] Found ${transactions ? transactions.length : 0} transactions`);

    if (!transactions || transactions.length === 0) {
      console.error('❌ [Backend] No transactions found for this client');
      return res.status(404).json({
        success: false,
        message: 'No transactions found for this client'
      });
    }

    console.log(`✅ [Backend] Found ${transactions.length} transactions for ${clientName}`);

    // Generate PDF report
    const pdfService = require('../services/pdfService');
    console.log('🔍 [Backend] Calling pdfService.generateClientReport...');
    const pdfBuffer = await pdfService.generateClientReport(transactions, productType, clientName);

    if (!pdfBuffer || pdfBuffer.length === 0) {
      throw new Error('PDF buffer is empty');
    }

    console.log(`✅ [Backend] Client report PDF generated successfully, size: ${pdfBuffer.length} bytes`);

    // Set headers and send PDF
    res.setHeader('Content-Type', 'application/pdf');

    // Sanitize client name for filename
    const sanitizedClientName = clientName
      .replace(/[^a-zA-Z0-9\s]/g, '')
      .replace(/\s+/g, '-')
      .toLowerCase()
      .substring(0, 50);

    const filename = `${sanitizedClientName}-report.pdf`;
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    console.log('✅ [Backend] Sending PDF with filename:', filename);
    res.send(pdfBuffer);
  } catch (error) {
    console.error('❌ [Backend] Error generating client report:', error);
    console.error('❌ [Backend] Error stack:', error.stack);
    if (!res.headersSent) {
      res.status(500).json({
        success: false,
        message: 'Error generating client report',
        error: error.message || 'Internal server error'
      });
    }
  }
});

// @route   GET /api/products/:productType/:id
// @desc    Get single product transaction by ID
// @access  Private (read_product permission required)
router.get('/:productType/:id', protect, checkPermission('read_product'), getTransactionById);

// @route   PUT /api/products/:productType/:id
// @desc    Update product transaction
// @access  Private (update_product permission required)
router.put('/:productType/:id', protect, checkPermission('update_product'), updateTransaction);

// @route   DELETE /api/products/:productType/:id
// @desc    Delete product transaction
// @access  Private (delete_product permission required)
router.delete('/:productType/:id', protect, checkPermission('delete_product'), deleteTransaction);

module.exports = router;