// ===============================================
// routes/expenseRoutes.js - Expense Management Routes
// ===============================================
const express = require('express');
const router = express.Router();
const {
  createExpense,
  getExpensesByCategory,
  getAllExpenses,
  getExpenseById,
  updateExpense,
  deleteExpense,
  updatePayment,
  getExpenseStats
} = require('../controllers/expenseController');

// Import authentication middleware
const { protect, checkPermission } = require('../middleware/auth');

// ===============================================
// EXPENSE ROUTES
// ===============================================

// Get all expenses (overview with filters)
// GET /api/expenses
router.get('/', protect, checkPermission('read_expense'), getAllExpenses);

// Get expense statistics
// GET /api/expenses/stats
router.get('/stats', protect, checkPermission('read_expense'), getExpenseStats);

// Create new expense
// POST /api/expenses
router.post('/', protect, checkPermission('create_expense'), createExpense);

// Get expenses by category
// GET /api/expenses/category/:category
router.get('/category/:category', protect, checkPermission('read_expense'), getExpensesByCategory);

// Get expense by ID
// GET /api/expenses/:id
router.get('/:id', protect, checkPermission('read_expense'), getExpenseById);

// Update expense
// PUT /api/expenses/:id
router.put('/:id', protect, checkPermission('update_expense'), updateExpense);

// Update payment for expense
// PATCH /api/expenses/:id/payment
router.patch('/:id/payment', protect, checkPermission('update_expense'), updatePayment);

// Delete expense
// DELETE /api/expenses/:id
router.delete('/:id', protect, checkPermission('delete_expense'), deleteExpense);

// ===============================================
// CATEGORY-SPECIFIC ROUTES
// ===============================================

// Home expenses
router.get('/home', protect, checkPermission('read_expense'), (req, res) => {
  req.params.category = 'home';
  getExpensesByCategory(req, res);
});

router.post('/home', protect, checkPermission('create_expense'), (req, res) => {
  req.body.expenseCategory = 'home';
  createExpense(req, res);
});

// Labour expenses
router.get('/labour', protect, checkPermission('read_expense'), (req, res) => {
  req.params.category = 'labour';
  getExpensesByCategory(req, res);
});

router.post('/labour', protect, checkPermission('create_expense'), (req, res) => {
  req.body.expenseCategory = 'labour';
  createExpense(req, res);
});

// Factory expenses
router.get('/factory', protect, checkPermission('read_expense'), (req, res) => {
  req.params.category = 'factory';
  getExpensesByCategory(req, res);
});

router.post('/factory', protect, checkPermission('create_expense'), (req, res) => {
  req.body.expenseCategory = 'factory';
  createExpense(req, res);
});

// Zakat expenses
router.get('/zakat', protect, checkPermission('read_expense'), (req, res) => {
  req.params.category = 'zakat';
  getExpensesByCategory(req, res);
});

router.post('/zakat', protect, checkPermission('create_expense'), (req, res) => {
  req.body.expenseCategory = 'zakat';
  createExpense(req, res);
});

// Personal expenses
router.get('/personal', protect, checkPermission('read_expense'), (req, res) => {
  req.params.category = 'personal';
  getExpensesByCategory(req, res);
});

router.post('/personal', protect, checkPermission('create_expense'), (req, res) => {
  req.body.expenseCategory = 'personal';
  createExpense(req, res);
});

module.exports = router;