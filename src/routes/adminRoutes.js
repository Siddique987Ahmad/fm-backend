const express = require('express');
const router = express.Router();
const { protect, authorize, checkPermission } = require('../middleware/auth');
const {
  registerUser,
  loginUser,
  logoutUser,
  getMe,
  updatePassword,
  forgotPassword
} = require('../controllers/authController');
const {
  getUsers,
  getUserById,
  updateUser,
  deleteUser,
  toggleUserStatus,
  getUserStats
} = require('../controllers/userController');
const {
  getRoles,
  getRoleById,
  createRole,
  updateRole,
  deleteRole,
  getPermissions
} = require('../controllers/roleController');
const {
  getProducts,
  getProductById,
  createProduct,
  updateProduct,
  deleteProduct,
  getProductStats,
  getProductTypes
} = require('../controllers/productCatalogController');
const {
  getEmployees,
  getEmployeeById,
  createEmployee,
  updateEmployee,
  deleteEmployee,
  toggleEmployeeStatus,
  getEmployeeStats,
  getEmployeesForExpense
} = require('../controllers/employeeController');
const {
  getSalesReport,
  getPurchasesReport,
  getExpensesReport,
  getUsersReport,
  getEmployeesReport,
  generatePDFReport
} = require('../controllers/reportController');

// @route   POST /api/admin/auth/login
// @desc    Login user
// @access  Public
router.post('/auth/login', loginUser);

// @route   POST /api/admin/auth/logout
// @desc    Logout user
// @access  Private
router.post('/auth/logout', protect, logoutUser);

// @route   GET /api/admin/auth/me
// @desc    Get current logged in user
// @access  Private
router.get('/auth/me', protect, getMe);

// @route   PUT /api/admin/auth/updatepassword
// @desc    Update user password
// @access  Private
router.put('/auth/updatepassword', protect, updatePassword);

// @route   POST /api/admin/auth/forgotpassword
// @desc    Forgot password
// @access  Public
router.post('/auth/forgotpassword', forgotPassword);

// @route   POST /api/admin/auth/register
// @desc    Register new user (Admin only)
// @access  Private (Admin)
router.post('/auth/register', 
  protect, 
  checkPermission('create_user'),
  registerUser
);

// User Management Routes
// @route   GET /api/admin/users
// @desc    Get all users with pagination and filtering
// @access  Private (Admin/Manager)
router.get('/users', 
  protect, 
  checkPermission('read_user'),
  getUsers
);

// Diagnostic endpoint to check database and roles (for debugging)
// @route   GET /api/admin/diagnostic
// @desc    Check database connection and role data
// @access  Private (Admin)
router.get('/diagnostic', protect, async (req, res) => {
  try {
    const mongoose = require('mongoose');
    const User = require('../models/User');
    const Role = require('../models/Role');
    
    const dbInfo = {
      connected: mongoose.connection.readyState === 1,
      databaseName: mongoose.connection.name,
      host: mongoose.connection.host,
      user: req.user ? {
        id: req.user._id,
        email: req.user.email,
        hasRole: !!req.user.role,
        roleType: req.user.role ? (typeof req.user.role === 'object' && req.user.role.name ? 'populated' : 'ObjectId') : 'null',
        roleName: req.user.role && req.user.role.name ? req.user.role.name : (req.user.role ? req.user.role.toString() : 'none')
      } : null
    };

    // Count collections
    const totalUsers = await User.countDocuments();
    const totalRoles = await Role.countDocuments();
    
    // Check if current user's role exists
    let userRoleCheck = null;
    if (req.user && req.user.role) {
      const roleId = req.user.role._id || req.user.role;
      if (roleId) {
        const role = await Role.findById(roleId);
        userRoleCheck = {
          roleId: roleId.toString(),
          exists: !!role,
          roleName: role ? role.name : null
        };
      }
    }

    res.status(200).json({
      success: true,
      data: {
        database: dbInfo,
        counts: {
          totalUsers,
          totalRoles
        },
        userRoleCheck,
        environment: {
          nodeEnv: process.env.NODE_ENV,
          vercel: !!process.env.VERCEL
        }
      }
    });
  } catch (error) {
    console.error('Error in diagnostic endpoint:', error);
    res.status(500).json({
      success: false,
      message: 'Diagnostic error',
      error: error.message
    });
  }
});

// @route   GET /api/admin/users/stats
// @desc    Get user statistics
// @access  Private (Admin/Manager)
router.get('/users/stats', 
  protect, 
  checkPermission('read_user'),
  getUserStats
);

// @route   GET /api/admin/users/:id
// @desc    Get single user by ID
// @access  Private (Admin/Manager)
router.get('/users/:id', 
  protect, 
  checkPermission('read_user'),
  getUserById
);

// @route   PUT /api/admin/users/:id
// @desc    Update user
// @access  Private (Admin/Manager)
router.put('/users/:id', 
  protect, 
  checkPermission('update_user'),
  updateUser
);

// @route   DELETE /api/admin/users/:id
// @desc    Delete user
// @access  Private (Admin only)
router.delete('/users/:id', 
  protect, 
  checkPermission('delete_user'),
  deleteUser
);

// @route   PATCH /api/admin/users/:id/toggle-status
// @desc    Toggle user active status
// @access  Private (Admin/Manager)
router.patch('/users/:id/toggle-status', 
  protect, 
  checkPermission('update_user'),
  toggleUserStatus
);

// Role Management Routes
// @route   GET /api/admin/roles
// @desc    Get all roles with pagination and filtering
// @access  Private (Admin/Manager)
router.get('/roles', 
  protect, 
  checkPermission('read_role'),
  getRoles
);

// @route   GET /api/admin/roles/:id
// @desc    Get single role by ID
// @access  Private (Admin/Manager)
router.get('/roles/:id', 
  protect, 
  checkPermission('read_role'),
  getRoleById
);

// @route   POST /api/admin/roles
// @desc    Create new role
// @access  Private (Admin)
router.post('/roles', 
  protect, 
  checkPermission('create_role'),
  createRole
);

// @route   PUT /api/admin/roles/:id
// @desc    Update role
// @access  Private (Admin)
router.put('/roles/:id', 
  protect, 
  checkPermission('update_role'),
  updateRole
);

// @route   DELETE /api/admin/roles/:id
// @desc    Delete role
// @access  Private (Admin)
router.delete('/roles/:id', 
  protect, 
  checkPermission('delete_role'),
  deleteRole
);

// @route   GET /api/admin/permissions
// @desc    Get all permissions
// @access  Private (Admin/Manager)
router.get('/permissions', 
  protect, 
  checkPermission('read_permission'),
  getPermissions
);

// Product Management Routes
// @route   GET /api/admin/products
// @desc    Get all products with pagination and filtering
// @access  Private (Admin/Manager)
router.get('/products', 
  protect, 
  checkPermission('read_product'),
  getProducts
);

// @route   GET /api/admin/products/stats
// @desc    Get product statistics
// @access  Private (Admin/Manager)
router.get('/products/stats', 
  protect, 
  checkPermission('read_product'),
  getProductStats
);

// @route   GET /api/admin/products/types
// @desc    Get all product types for dropdowns
// @access  Private (Admin/Manager)
router.get('/products/types', 
  protect, 
  checkPermission('read_product'),
  getProductTypes
);

// @route   GET /api/admin/products/:id
// @desc    Get single product by ID
// @access  Private (Admin/Manager)
router.get('/products/:id', 
  protect, 
  checkPermission('read_product'),
  getProductById
);

// @route   POST /api/admin/products
// @desc    Create new product
// @access  Private (Admin)
router.post('/products', 
  protect, 
  checkPermission('create_product'),
  createProduct
);

// @route   PUT /api/admin/products/:id
// @desc    Update product
// @access  Private (Admin)
router.put('/products/:id', 
  protect, 
  checkPermission('update_product'),
  updateProduct
);

// @route   DELETE /api/admin/products/:id
// @desc    Delete product
// @access  Private (Admin)
router.delete('/products/:id', 
  protect, 
  checkPermission('delete_product'),
  deleteProduct
);

// Employee Management Routes
// @route   GET /api/admin/employees
// @desc    Get all employees with pagination and filtering
// @access  Private (Admin/Manager)
router.get('/employees', 
  protect, 
  checkPermission('read_user'),
  getEmployees
);

// @route   GET /api/admin/employees/stats
// @desc    Get employee statistics
// @access  Private (Admin/Manager)
router.get('/employees/stats', 
  protect, 
  checkPermission('read_user'),
  getEmployeeStats
);

// @route   GET /api/admin/employees/for-expense
// @desc    Get employees for expense creation
// @access  Private (Admin/Manager)
router.get('/employees/for-expense', 
  protect, 
  checkPermission('read_user'),
  getEmployeesForExpense
);

// @route   GET /api/admin/employees/:id
// @desc    Get single employee by ID
// @access  Private (Admin/Manager)
router.get('/employees/:id', 
  protect, 
  checkPermission('read_user'),
  getEmployeeById
);

// @route   POST /api/admin/employees
// @desc    Create new employee
// @access  Private (Admin/Manager)
router.post('/employees', 
  protect, 
  checkPermission('create_user'),
  createEmployee
);

// @route   PUT /api/admin/employees/:id
// @desc    Update employee
// @access  Private (Admin/Manager)
router.put('/employees/:id', 
  protect, 
  checkPermission('update_user'),
  updateEmployee
);

// @route   DELETE /api/admin/employees/:id
// @desc    Delete employee
// @access  Private (Admin only)
router.delete('/employees/:id', 
  protect, 
  checkPermission('delete_user'),
  deleteEmployee
);

// @route   PATCH /api/admin/employees/:id/toggle-status
// @desc    Toggle employee active status
// @access  Private (Admin/Manager)
router.patch('/employees/:id/toggle-status', 
  protect, 
  checkPermission('update_user'),
  toggleEmployeeStatus
);

// Reports Routes
// @route   GET /api/admin/reports/sales
// @desc    Get sales report data
// @access  Private (Admin/Manager)
router.get('/reports/sales', 
  protect, 
  checkPermission('read_product'),
  getSalesReport
);

// @route   GET /api/admin/reports/purchases
// @desc    Get purchases report data
// @access  Private (Admin/Manager)
router.get('/reports/purchases', 
  protect, 
  checkPermission('read_product'),
  getPurchasesReport
);

// @route   GET /api/admin/reports/expenses
// @desc    Get expenses report data
// @access  Private (Admin/Manager)
router.get('/reports/expenses', 
  protect, 
  checkPermission('read_expense'),
  getExpensesReport
);

// @route   GET /api/admin/reports/users
// @desc    Get users report data
// @access  Private (Admin/Manager)
router.get('/reports/users', 
  protect, 
  checkPermission('read_user'),
  getUsersReport
);

// @route   GET /api/admin/reports/employees
// @desc    Get employees report data
// @access  Private (Admin/Manager)
router.get('/reports/employees', 
  protect, 
  checkPermission('read_user'),
  getEmployeesReport
);

// @route   GET /api/admin/reports/pdf/:reportType
// @desc    Generate PDF report
// @access  Private (Admin/Manager)
router.get('/reports/pdf/:reportType', 
  protect, 
  checkPermission('read_product'),
  generatePDFReport
);

// @route   GET /api/admin/reports/pdf/sales/:productName
// @desc    Generate specific product sales PDF
// @access  Private (Admin/Manager)
router.get('/reports/pdf/sales/:productName', 
  protect, 
  checkPermission('read_product'),
  (req, res, next) => {
    req.params.reportType = 'sales';
    req.query.productName = req.params.productName;
    generatePDFReport(req, res, next);
  }
);

// @route   GET /api/admin/reports/pdf/purchases/:productName
// @desc    Generate specific product purchases PDF
// @access  Private (Admin/Manager)
router.get('/reports/pdf/purchases/:productName', 
  protect, 
  checkPermission('read_product'),
  (req, res, next) => {
    req.params.reportType = 'purchases';
    req.query.productName = req.params.productName;
    generatePDFReport(req, res, next);
  }
);

module.exports = router;
