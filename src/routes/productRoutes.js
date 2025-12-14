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

    const products = await ProductCatalog.find({ isActive: true }).select('name _id allowedTransactions enableNugCalculation');

    const productTypes = products.map(product => ({
      id: product._id,
      name: product.name,
      value: product.name.toLowerCase().replace(/\s+/g, '-'),
      allowedTransactions: product.allowedTransactions || ['sale', 'purchase'],
      enableNugCalculation: product.enableNugCalculation || false
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

// @route   GET /api/products/:productType/advances
// @desc    Get all transactions with advance payments (partial payments)
// @access  Private
// NOTE: This must come BEFORE /:productType/:id route to avoid route matching conflicts
router.get('/:productType/advances', protect, async (req, res) => {
  try {
    console.log('🔍 [Advance Payments] Route HIT!');
    const { productType } = req.params;
    const { transactionType, clientName, page = 1, limit = 50, global } = req.query;

    // Build base query
    // NOTE: Do NOT exclude internal transactions here - we need them for net advance calculation
    const baseQuery = {};
    
    // Only filter by productType if global is NOT true
    if (global !== 'true') {
      baseQuery.productType = productType;
    }

    if (transactionType && transactionType !== 'all') {
      baseQuery.transactionType = transactionType;
    }
    if (clientName) {
      baseQuery.clientName = new RegExp(clientName, 'i');
    }

    // Use aggregation to calculate NET advance per client
    // Net advance = sum of (remainingAmount - totalBalance) for all transactions
    // This accounts for both overpayments (positive) and underpayments (negative)
    const advanceAggregation = await Product.aggregate([
      { $match: baseQuery },
      {
        $group: {
          _id: {
            clientName: '$clientName',
            transactionType: '$transactionType'
          },
          netAdvance: {
            $sum: { $subtract: ['$remainingAmount', '$totalBalance'] }
          },
          transactions: { $push: '$$ROOT' }
        }
      },
      {
        $match: {
          netAdvance: { $gt: 0 } // Only show clients with positive net advance
        }
      },
      { $sort: { '_id.clientName': 1 } }
    ]);

    console.log('🔍 [Advance Payments] Aggregation results:', JSON.stringify(advanceAggregation.map(g => ({
      client: g._id.clientName,
      type: g._id.transactionType,
      netAdvance: g.netAdvance,
      transactionCount: g.transactions.length
    })), null, 2));

    // Flatten the results and apply pagination
    const allTransactions = [];
    advanceAggregation.forEach(group => {
      // For each client with net advance, find their latest transaction with overpayment
      const latestOverpayment = group.transactions
        .filter(txn => txn.remainingAmount > txn.totalBalance)
        .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))[0];
      
      if (latestOverpayment) {
        // Explicitly create a new object using Object.assign to avoid spread issues
        const transactionWithNetAdvance = Object.assign({}, latestOverpayment, {
          netAdvance: Number(group.netAdvance), // Force number
          TEST_FLAG: true // Debug flag
        });
        
        console.log(`🔍 [Advance Payments] Prepared transaction for ${group._id.clientName}:`, {
          netAdvance: transactionWithNetAdvance.netAdvance,
          originalRemaining: latestOverpayment.remainingAmount,
          hasTestFlag: transactionWithNetAdvance.TEST_FLAG
        });

        allTransactions.push(transactionWithNetAdvance);
      }
    });

    // Apply pagination
    const totalCount = allTransactions.length;
    const paginatedTransactions = allTransactions.slice(
      (parseInt(page) - 1) * parseInt(limit),
      parseInt(page) * parseInt(limit)
    );

    console.log('🔍 [Advance Payments] Sending response:', JSON.stringify(paginatedTransactions.map(t => ({
      client: t.clientName,
      netAdvance: t.netAdvance,
      remaining: t.remainingAmount
    })), null, 2));

    // Calculate summary
    const summary = {
      totalSalesAdvances: 0,
      totalPurchasesAdvances: 0,
      totalOutstanding: 0,
      salesCount: 0,
      purchasesCount: 0
    };

    advanceAggregation.forEach(group => {
      summary.totalOutstanding += group.netAdvance;
      
      if (group._id.transactionType === 'sale') {
        summary.totalSalesAdvances += group.netAdvance;
        summary.salesCount++;
      } else {
        summary.totalPurchasesAdvances += group.netAdvance;
        summary.purchasesCount++;
      }
    });

    res.status(200).json({
      success: true,
      data: {
        transactions: paginatedTransactions,
        pagination: {
          currentPage: parseInt(page),
          itemsPerPage: parseInt(limit),
          totalItems: totalCount,
          totalPages: Math.ceil(totalCount / parseInt(limit))
        },
        summary
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

// @route   GET /api/products/:productType/stats
// @desc    Get transaction statistics for specific product
// @access  Private (read_product permission required)
// NOTE: This must come BEFORE /:productType route to avoid route matching conflicts
router.get('/:productType/stats', protect, checkPermission('read_product'), async (req, res) => {
  try {
    // Ensure JSON response
    res.setHeader('Content-Type', 'application/json');

    const { productType } = req.params;

    // Get all transactions for this product type (exclude internal transactions)
    // IMPORTANT: Use the SAME filter as getAllTransactions to ensure consistency
    const transactions = await Product.find({ 
      productType,
      $or: [
        { isInternalTransaction: { $exists: false } },
        { isInternalTransaction: false }
      ]
    });

    // Debug: Also check how many internal transactions exist
    const internalCount = await Product.countDocuments({ 
      productType,
      isInternalTransaction: true 
    });

    console.log(`📊 [Stats] Product: ${productType}`);
    console.log(`   - Regular transactions: ${transactions.length}`);
    console.log(`   - Internal transactions: ${internalCount}`);
    
    // Log each transaction for debugging
    if (transactions.length > 0) {
      console.log(`   - Transaction details:`);
      transactions.forEach((t, idx) => {
        console.log(`     ${idx + 1}. ID: ${t._id}, Client: ${t.clientName}, Type: ${t.transactionType}, Amount: ${t.totalBalance}, Internal: ${t.isInternalTransaction}`);
      });
    }

    console.log(`📊 [Stats] Product: ${productType}, Found ${transactions.length} transactions (excluding internal)`);

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

    console.log(`📊 [Stats] ${productType}: Sales=${totalSales} (${totalSalesAmount}), Purchases=${totalPurchases} (${totalPurchasesAmount})`);

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

// @route   GET /api/products/:productType/debug-all
// @desc    Debug endpoint to show ALL transactions including internal ones
// @access  Private
router.get('/:productType/debug-all', protect, async (req, res) => {
  try {
    const { productType } = req.params;
    
    const allTransactions = await Product.find({ productType })
      .select('clientName transactionType totalBalance isInternalTransaction createdAt')
      .sort({ createdAt: -1 });
    
    const regularCount = await Product.countDocuments({ 
      productType,
      isInternalTransaction: { $ne: true }
    });
    
    const internalCount = await Product.countDocuments({ 
      productType,
      isInternalTransaction: true 
    });
    
    res.status(200).json({
      success: true,
      data: {
        productType,
        totalCount: allTransactions.length,
        regularCount,
        internalCount,
        transactions: allTransactions
      }
    });
  } catch (error) {
    console.error('Error in debug endpoint:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching debug data',
      error: error.message
    });
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

// @route   GET /api/products/:productType/clients
// @desc    Get unique client/supplier names with advance balances for autocomplete
// @access  Private
// NOTE: This must come BEFORE /:productType/:id route to avoid route matching conflicts
router.get('/:productType/clients', protect, async (req, res) => {
  try {
    const { productType } = req.params;
    const { transactionType, global } = req.query;

    if (!transactionType || !['sale', 'purchase'].includes(transactionType)) {
      return res.status(400).json({
        success: false,
        message: 'Valid transactionType (sale or purchase) is required'
      });
    }

    // Build match stage
    // We want to fetch advances across ALL transaction types (Sale & Purchase) to show net position
    // So we do NOT filter by transactionType here for the aggregation
    const matchStage = {};
    
    // Only filter by productType if global is NOT true
    if (global !== 'true') {
      matchStage.productType = productType;
    }

    // Get clients with NET advance payments using aggregation
    // This accounts for both overpayments and offsetting transactions
    const clientsWithAdvances = await Product.aggregate([
      { 
        $match: matchStage
      },
      {
        $group: {
          _id: '$clientName',
          netAdvance: {
            $sum: { $subtract: ['$remainingAmount', '$totalBalance'] }
          },
          transactionCount: { $sum: 1 },
          transactions: { $push: { 
            remainingAmount: '$remainingAmount', 
            totalBalance: '$totalBalance',
            diff: { $subtract: ['$remainingAmount', '$totalBalance'] },
            isInternal: '$isInternalTransaction',
            createdAt: '$createdAt'
          }}
        }
      },
      {
        $match: {
          netAdvance: { $gt: 0 } // Only include clients with positive net advance
        }
      },
      { $sort: { _id: 1 } }
    ]);

    console.log('🔍 [Clients Endpoint] Aggregation results:');
    clientsWithAdvances.forEach(client => {
      console.log(`\n  Client: ${client._id}`);
      console.log(`  Net Advance: ${client.netAdvance}`);
      console.log(`  Transactions (${client.transactionCount}):`);
      client.transactions.forEach((txn, idx) => {
        console.log(`    ${idx + 1}. Paid: ${txn.remainingAmount}, Total: ${txn.totalBalance}, Diff: ${txn.diff}, Internal: ${txn.isInternal || false}`);
      });
    });

    // Debug: Check if there are any internal transactions for these clients
    const allTransactionsIncludingInternal = await Product.find({
      productType,
      transactionType,
      clientName: { $in: clientsWithAdvances.map(c => c._id) }
    }).select('clientName remainingAmount totalBalance isInternalTransaction createdAt').sort({ createdAt: -1 });
    
    console.log('\n🔍 [Debug] ALL transactions (including internal):');
    allTransactionsIncludingInternal.forEach(txn => {
      console.log(`  ${txn.clientName}: Paid ${txn.remainingAmount}, Total ${txn.totalBalance}, Internal: ${txn.isInternalTransaction || false}, Date: ${txn.createdAt}`);
    });

    // Transform to match expected format (totalAdvance -> netAdvance)
    const formattedClients = clientsWithAdvances.map(client => ({
      _id: client._id,
      totalAdvance: client.netAdvance, // Keep the field name for backward compatibility
      transactionCount: client.transactionCount
    }));

    // Get all unique client names (including those without advances)
    // Use the same matchStage to ensure consistency (global & cross-transaction)
    const allClients = await Product.distinct('clientName', matchStage);

    // Sort all clients alphabetically
    allClients.sort();

    res.status(200).json({
      success: true,
      data: {
        clientsWithAdvances: formattedClients,
        allClients
      }
    });

  } catch (error) {
    console.error('Error fetching clients:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching clients',
      error: error.message
    });
  }
});

// MOVED TO TOP
// @route   GET /api/products/:productType/advances
// @desc    Get all transactions with advance payments (partial payments)
// @access  Private
// NOTE: This must come BEFORE /:productType/:id route to avoid route matching conflicts


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