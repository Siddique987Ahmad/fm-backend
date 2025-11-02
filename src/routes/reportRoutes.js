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

// ===============================================
// PDF REPORT ROUTES
// ===============================================

// @route   GET /api/reports/expenses/pdf
// @desc    Generate expense report PDF
// @access  Public
// @query   category, startDate, endDate, paymentStatus, download
router.get('/expenses/pdf', generateExpenseReport);

// @route   GET /api/reports/products/:productType/pdf
// @desc    Generate product report PDF
// @access  Public
// @query   transactionType, clientName, paymentStatus, startDate, endDate, download
router.get('/products/:productType/pdf', generateProductReport);

// @route   GET /api/reports/files
// @desc    Get list of available report files
// @access  Public
router.get('/files', getAvailableReports);

// @route   DELETE /api/reports/files/:filename
// @desc    Delete a report file
// @access  Public
router.delete('/files/:filename', deleteReport);

// ===============================================
// BULK ACTION ROUTES FOR EXPENSES
// ===============================================

// @route   POST /api/reports/expenses/bulk/approve
// @desc    Bulk approve/reject expenses
// @access  Public
// @body    { expenseIds: [], approvalStatus: 'approved'|'rejected'|'pending', notes?: '' }
router.post('/expenses/bulk/approve', bulkApproveExpenses);

// @route   POST /api/reports/expenses/bulk/status
// @desc    Bulk update expense status and payment status
// @access  Public
// @body    { expenseIds: [], status?: 'active'|'cancelled'|'completed', paymentStatus?: 'paid'|'pending'|'advance' }
router.post('/expenses/bulk/status', bulkUpdateExpenseStatus);

// @route   DELETE /api/reports/expenses/bulk
// @desc    Bulk delete expenses
// @access  Public
// @body    { expenseIds: [] }
router.delete('/expenses/bulk', bulkDeleteExpenses);

// ===============================================
// CATEGORY-SPECIFIC REPORT ROUTES
// ===============================================

// Home expense reports
router.get('/expenses/home/pdf', (req, res) => {
  req.query.category = 'home';
  generateExpenseReport(req, res);
});

// Labour expense reports
router.get('/expenses/labour/pdf', (req, res) => {
  req.query.category = 'labour';
  generateExpenseReport(req, res);
});

// Factory expense reports
router.get('/expenses/factory/pdf', (req, res) => {
  req.query.category = 'factory';
  generateExpenseReport(req, res);
});

// Zakat expense reports
router.get('/expenses/zakat/pdf', (req, res) => {
  req.query.category = 'zakat';
  generateExpenseReport(req, res);
});

// Personal expense reports
router.get('/expenses/personal/pdf', (req, res) => {
  req.query.category = 'personal';
  generateExpenseReport(req, res);
});

// ===============================================
// PRODUCT-SPECIFIC REPORT ROUTES
// ===============================================

// White Oil reports
router.get('/products/white-oil/pdf', (req, res) => {
  req.params.productType = 'white-oil';
  generateProductReport(req, res);
});

// Yellow Oil reports
router.get('/products/yellow-oil/pdf', (req, res) => {
  req.params.productType = 'yellow-oil';
  generateProductReport(req, res);
});

// Crude Oil reports
router.get('/products/crude-oil/pdf', (req, res) => {
  req.params.productType = 'crude-oil';
  generateProductReport(req, res);
});

// Diesel reports
router.get('/products/diesel/pdf', (req, res) => {
  req.params.productType = 'diesel';
  generateProductReport(req, res);
});

// Petrol reports
router.get('/products/petrol/pdf', (req, res) => {
  req.params.productType = 'petrol';
  generateProductReport(req, res);
});

// Kerosene reports
router.get('/products/kerosene/pdf', (req, res) => {
  req.params.productType = 'kerosene';
  generateProductReport(req, res);
});

// LPG reports
router.get('/products/lpg/pdf', (req, res) => {
  req.params.productType = 'lpg';
  generateProductReport(req, res);
});

// Natural Gas reports
router.get('/products/natural-gas/pdf', (req, res) => {
  req.params.productType = 'natural-gas';
  generateProductReport(req, res);
});

// ===============================================
// ANALYTICS AND SUMMARY ROUTES
// ===============================================

// @route   GET /api/reports/expenses/summary
// @desc    Get expense summary for reports
// @access  Public
router.get('/expenses/summary', async (req, res) => {
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
// @access  Public
router.get('/products/:productType/summary', async (req, res) => {
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