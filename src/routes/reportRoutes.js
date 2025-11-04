// ===============================================
// routes/reportRoutes.js - PDF Reports and Bulk Actions Routes
// ===============================================
const express = require('express');
const router = express.Router();
const {
  generateExpenseReport,
  generateProductReport,
  bulkApproveExpenses,
  bulkUpdateExpenseStatus,
  bulkDeleteExpenses,
  getAvailableReports,
  deleteReport
} = require('../controllers/reportController');

// Import authentication middleware
const { protect, checkPermission } = require('../middleware/auth');

// ===============================================
// PDF REPORT ROUTES
// ===============================================

// @route   GET /api/reports/expenses/pdf
// @desc    Generate expense report PDF
// @access  Private (create_report permission required)
// @query   category, startDate, endDate, paymentStatus, download
router.get('/expenses/pdf', protect, checkPermission('create_report'), generateExpenseReport);

// @route   GET /api/reports/products/:productType/pdf
// @desc    Generate product report PDF
// @access  Private (create_report permission required)
// @query   transactionType, clientName, paymentStatus, startDate, endDate, download
router.get('/products/:productType/pdf', protect, checkPermission('create_report'), generateProductReport);

// @route   GET /api/reports/files
// @desc    Get list of available report files
// @access  Private (read_report permission required)
router.get('/files', protect, checkPermission('read_report'), getAvailableReports);

// @route   DELETE /api/reports/files/:filename
// @desc    Delete a report file
// @access  Private (delete_expense or delete_product permission required)
router.delete('/files/:filename', protect, checkPermission('delete_expense'), deleteReport);

// ===============================================
// BULK ACTION ROUTES FOR EXPENSES
// ===============================================

// @route   POST /api/reports/expenses/bulk/approve
// @desc    Bulk approve/reject expenses
// @access  Private (update_expense permission required)
// @body    { expenseIds: [], approvalStatus: 'approved'|'rejected'|'pending', notes?: '' }
router.post('/expenses/bulk/approve', protect, checkPermission('update_expense'), bulkApproveExpenses);

// @route   POST /api/reports/expenses/bulk/status
// @desc    Bulk update expense status and payment status
// @access  Private (update_expense permission required)
// @body    { expenseIds: [], status?: 'active'|'cancelled'|'completed', paymentStatus?: 'paid'|'pending'|'advance' }
router.post('/expenses/bulk/status', protect, checkPermission('update_expense'), bulkUpdateExpenseStatus);

// @route   DELETE /api/reports/expenses/bulk
// @desc    Bulk delete expenses
// @access  Private (delete_expense permission required)
// @body    { expenseIds: [] }
router.delete('/expenses/bulk', protect, checkPermission('delete_expense'), bulkDeleteExpenses);

// ===============================================
// CATEGORY-SPECIFIC REPORT ROUTES
// ===============================================

// Home expense reports
router.get('/expenses/home/pdf', protect, checkPermission('create_report'), (req, res) => {
  req.query.category = 'home';
  generateExpenseReport(req, res);
});

// Labour expense reports
router.get('/expenses/labour/pdf', protect, checkPermission('create_report'), (req, res) => {
  req.query.category = 'labour';
  generateExpenseReport(req, res);
});

// Factory expense reports
router.get('/expenses/factory/pdf', protect, checkPermission('create_report'), (req, res) => {
  req.query.category = 'factory';
  generateExpenseReport(req, res);
});

// Zakat expense reports
router.get('/expenses/zakat/pdf', protect, checkPermission('create_report'), (req, res) => {
  req.query.category = 'zakat';
  generateExpenseReport(req, res);
});

// Personal expense reports
router.get('/expenses/personal/pdf', protect, checkPermission('create_report'), (req, res) => {
  req.query.category = 'personal';
  generateExpenseReport(req, res);
});

// ===============================================
// PRODUCT-SPECIFIC REPORT ROUTES
// ===============================================

// White Oil reports
router.get('/products/white-oil/pdf', protect, checkPermission('create_report'), (req, res) => {
  req.params.productType = 'white-oil';
  generateProductReport(req, res);
});

// Yellow Oil reports
router.get('/products/yellow-oil/pdf', protect, checkPermission('create_report'), (req, res) => {
  req.params.productType = 'yellow-oil';
  generateProductReport(req, res);
});

// Crude Oil reports
router.get('/products/crude-oil/pdf', protect, checkPermission('create_report'), (req, res) => {
  req.params.productType = 'crude-oil';
  generateProductReport(req, res);
});

// Diesel reports
router.get('/products/diesel/pdf', protect, checkPermission('create_report'), (req, res) => {
  req.params.productType = 'diesel';
  generateProductReport(req, res);
});

// Petrol reports
router.get('/products/petrol/pdf', protect, checkPermission('create_report'), (req, res) => {
  req.params.productType = 'petrol';
  generateProductReport(req, res);
});

// Kerosene reports
router.get('/products/kerosene/pdf', protect, checkPermission('create_report'), (req, res) => {
  req.params.productType = 'kerosene';
  generateProductReport(req, res);
});

// LPG reports
router.get('/products/lpg/pdf', protect, checkPermission('create_report'), (req, res) => {
  req.params.productType = 'lpg';
  generateProductReport(req, res);
});

// Natural Gas reports
router.get('/products/natural-gas/pdf', protect, checkPermission('create_report'), (req, res) => {
  req.params.productType = 'natural-gas';
  generateProductReport(req, res);
});

// ===============================================
// ANALYTICS AND SUMMARY ROUTES
// ===============================================

// @route   GET /api/reports/expenses/summary
// @desc    Get expense summary for reports
// @access  Private (read_report permission required)
router.get('/expenses/summary', protect, checkPermission('read_report'), async (req, res) => {
  try {
    const Expense = require('../models/Expense');
    const { category, startDate, endDate } = req.query;
    
    const filter = {};
    if (category) filter.expenseCategory = category;
    if (startDate || endDate) {
      filter.expenseDate = {};
      if (startDate) filter.expenseDate.$gte = new Date(startDate);
      if (endDate) filter.expenseDate.$lte = new Date(endDate);
    }
    
    const summary = await Expense.aggregate([
      { $match: filter },
      {
        $group: {
          _id: '$expenseCategory',
          totalAmount: { $sum: '$amount' },
          totalPaid: { $sum: '$amountPaid' },
          count: { $sum: 1 },
          pendingAmount: { $sum: { $subtract: ['$amount', '$amountPaid'] } },
          avgAmount: { $avg: '$amount' }
        }
      },
      {
        $project: {
          category: '$_id',
          totalAmount: 1,
          totalPaid: 1,
          count: 1,
          pendingAmount: 1,
          avgAmount: { $round: ['$avgAmount', 2] },
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
    
    res.json({ success: true, data: summary });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// @route   GET /api/reports/products/:productType/summary
// @desc    Get product summary for reports
// @access  Private (read_report permission required)
router.get('/products/:productType/summary', protect, checkPermission('read_report'), async (req, res) => {
  try {
    const Product = require('../models/Product');
    const { productType } = req.params;
    const { startDate, endDate } = req.query;
    
    const filter = { productType };
    if (startDate || endDate) {
      filter.createdAt = {};
      if (startDate) filter.createdAt.$gte = new Date(startDate);
      if (endDate) filter.createdAt.$lte = new Date(endDate);
    }
    
    const summary = await Product.aggregate([
      { $match: filter },
      {
        $group: {
          _id: '$transactionType',
          totalValue: { $sum: '$totalBalance' },
          totalReceived: { $sum: '$remainingAmount' },
          totalWeight: { $sum: '$weight' },
          count: { $sum: 1 },
          avgRate: { $avg: '$rate' }
        }
      },
      {
        $project: {
          transactionType: '$_id',
          totalValue: 1,
          totalReceived: 1,
          totalWeight: { $round: ['$totalWeight', 2] },
          count: 1,
          avgRate: { $round: ['$avgRate', 2] },
          outstandingAmount: { $subtract: ['$totalValue', '$totalReceived'] }
        }
      }
    ]);
    
    res.json({ success: true, data: summary });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

module.exports = router;