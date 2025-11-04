const asyncHandler = require('../middleware/async');
const Product = require('../models/Product');
const Expense = require('../models/Expense');
const User = require('../models/User');
const Employee = require('../models/Employee');
const ProductCatalog = require('../models/ProductCatalog');
const fs = require('fs');
const path = require('path');
const pdfReportService = require('../services/pdfReportService');
const pdfService = require('../services/pdfService');

// ===============================================
// EXISTING FUNCTIONS (for reportRoutes.js)
// ===============================================

// @desc    Generate expense report PDF
// @route   GET /api/reports/expenses/pdf
// @access  Public
exports.generateExpenseReport = async (req, res) => {
  try {
    const { category, startDate, endDate, paymentStatus } = req.query;
    
    // Build filter
    const filter = {};
    if (category) filter.expenseCategory = category;
    if (paymentStatus) filter.paymentStatus = paymentStatus;
    if (startDate || endDate) {
      filter.expenseDate = {};
      if (startDate) {
        // Set to start of day
        const start = new Date(startDate);
        start.setHours(0, 0, 0, 0);
        filter.expenseDate.$gte = start;
      }
      if (endDate) {
        // Set to end of day
        const end = new Date(endDate);
        end.setHours(23, 59, 59, 999);
        filter.expenseDate.$lte = end;
      }
    }
    
    console.log('📊 Expense Report Filter:', JSON.stringify(filter, null, 2));
    console.log('📊 Query params:', { category, startDate, endDate, paymentStatus });
    
    // Debug: Check total expenses in database
    const totalExpenses = await Expense.countDocuments({});
    console.log(`📊 Total expenses in database: ${totalExpenses}`);
    
    // Debug: Check expenses without date filter
    const filterWithoutDate = { ...filter };
    delete filterWithoutDate.expenseDate;
    const expensesWithoutDateFilter = await Expense.countDocuments(filterWithoutDate);
    console.log(`📊 Expenses matching filters (without date): ${expensesWithoutDateFilter}`);
    
    // Fetch expenses - use .lean() to get plain JavaScript objects
    const expenses = await Expense.find(filter).lean().sort({ expenseDate: -1 });
    
    console.log(`📊 Found ${expenses.length} expenses for report`);
    
    // Log sample expense to verify structure
    if (expenses.length > 0) {
      console.log('📊 Sample expense:', JSON.stringify(expenses[0], null, 2));
    } else {
      console.log('⚠️ No expenses found for the given filters');
      // Try fetching without date filter to see if data exists
      const testExpenses = await Expense.find(filterWithoutDate).lean().limit(5);
      if (testExpenses.length > 0) {
        console.log(`📊 Found ${testExpenses.length} expenses without date filter - date filter might be too strict`);
        console.log('📊 Sample expense date:', testExpenses[0].expenseDate);
        console.log('📊 Requested date range:', { startDate, endDate });
      }
    }
    
    // Calculate summary
    const summary = expenses.reduce((acc, expense) => {
      acc.totalAmount += expense.amount || 0;
      acc.totalPaid += expense.amountPaid || 0;
      acc.pendingAmount += (expense.amount || 0) - (expense.amountPaid || 0);
      return acc;
    }, { totalAmount: 0, totalPaid: 0, pendingAmount: 0 });
    
    console.log('📊 Expense Summary:', summary);
    
    // Generate PDF using pdfService - ensure expenses is an array
    const filters = { category, startDate, endDate, paymentStatus };
    const expensesArray = Array.isArray(expenses) ? expenses : [];
    console.log(`📊 Passing ${expensesArray.length} expenses to PDF service`);
    const pdfBuffer = await pdfService.generateExpenseReport(expensesArray, summary, filters);
    
    console.log(`✅ PDF generated successfully, size: ${pdfBuffer.length} bytes`);
    
    // Set headers and send PDF
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="expense-report-${Date.now()}.pdf"`);
    res.send(pdfBuffer);
  } catch (error) {
    console.error('Error generating expense report:', error);
    console.error('Error stack:', error.stack);
    if (!res.headersSent) {
      res.status(500).json({ 
        success: false, 
        message: 'Error generating expense report',
        error: error.message 
      });
    }
  }
};

// @desc    Generate product report PDF
// @route   GET /api/reports/products/:productType/pdf
// @access  Public
exports.generateProductReport = async (req, res) => {
  try {
    const { productType } = req.params;
    const { transactionType, clientName, paymentStatus, startDate, endDate } = req.query;
    
    // Build filter
    const filter = { productType };
    if (transactionType) filter.transactionType = transactionType;
    if (clientName) filter.clientName = { $regex: clientName, $options: 'i' };
    if (startDate || endDate) {
      filter.createdAt = {};
      if (startDate) {
        // Set to start of day
        const start = new Date(startDate);
        start.setHours(0, 0, 0, 0);
        filter.createdAt.$gte = start;
      }
      if (endDate) {
        // Set to end of day
        const end = new Date(endDate);
        end.setHours(23, 59, 59, 999);
        filter.createdAt.$lte = end;
      }
    }
    
    console.log('📊 Product Report Filter:', JSON.stringify(filter, null, 2));
    console.log('📊 Query params:', { productType, transactionType, clientName, paymentStatus, startDate, endDate });
    
    // Debug: Check total products in database
    const totalProducts = await Product.countDocuments({ productType });
    console.log(`📊 Total ${productType} products in database: ${totalProducts}`);
    
    // Debug: Check products without date filter
    const filterWithoutDate = { ...filter };
    delete filterWithoutDate.createdAt;
    const productsWithoutDateFilter = await Product.countDocuments(filterWithoutDate);
    console.log(`📊 Products matching filters (without date): ${productsWithoutDateFilter}`);
    
    // Fetch transactions - use .lean() to get plain JavaScript objects
    const transactions = await Product.find(filter).lean().sort({ createdAt: -1 });
    
    console.log(`📊 Found ${transactions.length} transactions for product type: ${productType}`);
    
    // Log sample transaction to verify structure
    if (transactions.length > 0) {
      console.log('📊 Sample transaction:', JSON.stringify(transactions[0], null, 2));
    } else {
      console.log('⚠️ No transactions found for the given filters');
      // Try fetching without date filter to see if data exists
      const testTransactions = await Product.find(filterWithoutDate).lean().limit(5);
      if (testTransactions.length > 0) {
        console.log(`📊 Found ${testTransactions.length} transactions without date filter - date filter might be too strict`);
        console.log('📊 Sample transaction date:', testTransactions[0].createdAt);
        console.log('📊 Requested date range:', { startDate, endDate });
      }
    }
    
    // Calculate summary
    const summary = transactions.reduce((acc, transaction) => {
      acc.totalValue += transaction.totalBalance || 0;
      acc.totalReceived += transaction.remainingAmount || 0;
      acc.totalOutstanding += (transaction.totalBalance || 0) - (transaction.remainingAmount || 0);
      return acc;
    }, { totalValue: 0, totalReceived: 0, totalOutstanding: 0 });
    
    console.log('📊 Product Summary:', summary);
    
    // Filter by payment status if provided (client-side filtering for status)
    let filteredTransactions = transactions;
    if (paymentStatus) {
      filteredTransactions = transactions.filter(transaction => {
        const total = transaction.totalBalance || 0;
        const received = transaction.remainingAmount || 0;
        let status = 'pending';
        if (received >= total) {
          status = received > total ? 'advance' : 'paid';
        }
        return status === paymentStatus.toLowerCase();
      });
      console.log(`📊 Filtered to ${filteredTransactions.length} transactions with payment status: ${paymentStatus}`);
    }
    
    // Generate PDF using pdfService - ensure transactions is an array
    const filters = { transactionType, clientName, paymentStatus, startDate, endDate };
    const transactionsArray = Array.isArray(filteredTransactions) ? filteredTransactions : [];
    console.log(`📊 Passing ${transactionsArray.length} transactions to PDF service`);
    const pdfBuffer = await pdfService.generateProductReport(transactionsArray, summary, productType, filters);
    
    console.log(`✅ PDF generated successfully, size: ${pdfBuffer.length} bytes`);
    
    // Set headers and send PDF
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${productType}-report-${Date.now()}.pdf"`);
    res.send(pdfBuffer);
  } catch (error) {
    console.error('Error generating product report:', error);
    console.error('Error stack:', error.stack);
    if (!res.headersSent) {
      res.status(500).json({ 
        success: false, 
        message: 'Error generating product report',
        error: error.message 
      });
    }
  }
};

// @desc    Bulk approve/reject expenses
// @route   POST /api/reports/expenses/bulk/approve
// @access  Public
exports.bulkApproveExpenses = async (req, res) => {
  try {
    // Placeholder implementation
    res.json({ success: true, message: 'Bulk approve expenses not implemented yet' });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

// @desc    Bulk update expense status
// @route   POST /api/reports/expenses/bulk/status
// @access  Public
exports.bulkUpdateExpenseStatus = async (req, res) => {
  try {
    // Placeholder implementation
    res.json({ success: true, message: 'Bulk update expense status not implemented yet' });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

// @desc    Bulk delete expenses
// @route   DELETE /api/reports/expenses/bulk
// @access  Public
exports.bulkDeleteExpenses = async (req, res) => {
  try {
    // Placeholder implementation
    res.json({ success: true, message: 'Bulk delete expenses not implemented yet' });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

// @desc    Get available reports
// @route   GET /api/reports/files
// @access  Public
exports.getAvailableReports = async (req, res) => {
  try {
    // Placeholder implementation
    res.json({ success: true, data: [] });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

// @desc    Delete a report file
// @route   DELETE /api/reports/files/:filename
// @access  Public
exports.deleteReport = async (req, res) => {
  try {
    // Placeholder implementation
    res.json({ success: true, message: 'Delete report not implemented yet' });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

// ===============================================
// NEW FUNCTIONS (for admin reports)
// ===============================================

// @desc    Get sales report data
// @route   GET /api/admin/reports/sales
// @access  Private (Admin)
exports.getSalesReport = asyncHandler(async (req, res, next) => {
  const { startDate, endDate } = req.query;
  
  // Build date filter
  const dateFilter = {};
  if (startDate && endDate) {
    dateFilter.createdAt = {
      $gte: new Date(startDate),
      $lte: new Date(endDate)
    };
  }

  // Get all sales transactions
  const salesTransactions = await Product.find({
    transactionType: 'sale',
    ...dateFilter
  });

  // Get product catalog for name mapping
  const productCatalog = await ProductCatalog.find({ isActive: true }).select('name');
  const productNameMap = {};
  productCatalog.forEach(product => {
    const key = product.name.toLowerCase().replace(/\s+/g, '-');
    productNameMap[key] = product.name;
  });

  // Calculate totals
  const totalAmount = salesTransactions.reduce((sum, transaction) => {
    return sum + (transaction.totalBalance || 0);
  }, 0);

  const totalCount = salesTransactions.length;

  // Group by month for monthly data
  const monthlyData = {};
  salesTransactions.forEach(transaction => {
    const month = transaction.createdAt.toISOString().substring(0, 7); // YYYY-MM
    if (!monthlyData[month]) {
      monthlyData[month] = { amount: 0, count: 0 };
    }
    monthlyData[month].amount += transaction.totalBalance || 0;
    monthlyData[month].count += 1;
  });

  const monthlyDataArray = Object.entries(monthlyData).map(([month, data]) => ({
    month,
    amount: data.amount,
    count: data.count
  })).sort((a, b) => a.month.localeCompare(b.month));

  // Group by product for product breakdown
  const productBreakdown = {};
  salesTransactions.forEach(transaction => {
    const productName = productNameMap[transaction.productType] || transaction.productType || 'Unknown Product';
    if (!productBreakdown[productName]) {
      productBreakdown[productName] = { amount: 0, count: 0 };
    }
    productBreakdown[productName].amount += transaction.totalBalance || 0;
    productBreakdown[productName].count += 1;
  });

  const productBreakdownArray = Object.entries(productBreakdown).map(([product, data]) => ({
    product,
    amount: data.amount,
    count: data.count
  })).sort((a, b) => b.amount - a.amount);

  res.status(200).json({
    success: true,
    data: {
      totalAmount,
      totalCount,
      monthlyData: monthlyDataArray,
      productBreakdown: productBreakdownArray
    }
  });
});

// @desc    Get purchases report data
// @route   GET /api/admin/reports/purchases
// @access  Private (Admin)
exports.getPurchasesReport = asyncHandler(async (req, res, next) => {
  const { startDate, endDate } = req.query;
  
  // Build date filter
  const dateFilter = {};
  if (startDate && endDate) {
    dateFilter.createdAt = {
      $gte: new Date(startDate),
      $lte: new Date(endDate)
    };
  }

  // Get all purchase transactions
  const purchaseTransactions = await Product.find({
    transactionType: 'purchase',
    ...dateFilter
  });

  // Get product catalog for name mapping
  const productCatalog = await ProductCatalog.find({ isActive: true }).select('name');
  const productNameMap = {};
  productCatalog.forEach(product => {
    const key = product.name.toLowerCase().replace(/\s+/g, '-');
    productNameMap[key] = product.name;
  });

  // Calculate totals
  const totalAmount = purchaseTransactions.reduce((sum, transaction) => {
    return sum + (transaction.totalBalance || 0);
  }, 0);

  const totalCount = purchaseTransactions.length;

  // Group by month for monthly data
  const monthlyData = {};
  purchaseTransactions.forEach(transaction => {
    const month = transaction.createdAt.toISOString().substring(0, 7); // YYYY-MM
    if (!monthlyData[month]) {
      monthlyData[month] = { amount: 0, count: 0 };
    }
    monthlyData[month].amount += transaction.totalBalance || 0;
    monthlyData[month].count += 1;
  });

  const monthlyDataArray = Object.entries(monthlyData).map(([month, data]) => ({
    month,
    amount: data.amount,
    count: data.count
  })).sort((a, b) => a.month.localeCompare(b.month));

  // Group by product for product breakdown
  const productBreakdown = {};
  purchaseTransactions.forEach(transaction => {
    const productName = productNameMap[transaction.productType] || transaction.productType || 'Unknown Product';
    if (!productBreakdown[productName]) {
      productBreakdown[productName] = { amount: 0, count: 0 };
    }
    productBreakdown[productName].amount += transaction.totalBalance || 0;
    productBreakdown[productName].count += 1;
  });

  const productBreakdownArray = Object.entries(productBreakdown).map(([product, data]) => ({
    product,
    amount: data.amount,
    count: data.count
  })).sort((a, b) => b.amount - a.amount);

  res.status(200).json({
    success: true,
    data: {
      totalAmount,
      totalCount,
      monthlyData: monthlyDataArray,
      productBreakdown: productBreakdownArray
    }
  });
});

// @desc    Get expenses report data
// @route   GET /api/admin/reports/expenses
// @access  Private (Admin)
exports.getExpensesReport = asyncHandler(async (req, res, next) => {
  const { startDate, endDate } = req.query;
  
  // Build date filter
  const dateFilter = {};
  if (startDate && endDate) {
    dateFilter.createdAt = {
      $gte: new Date(startDate),
      $lte: new Date(endDate)
    };
  }

  // Get all expenses
  const expenses = await Expense.find(dateFilter);

  // Calculate totals
  const totalAmount = expenses.reduce((sum, expense) => {
    return sum + (expense.amount || 0);
  }, 0);

  const totalCount = expenses.length;

  // Group by category for category breakdown
  const categoryBreakdown = {};
  expenses.forEach(expense => {
    const category = expense.category || 'Uncategorized';
    if (!categoryBreakdown[category]) {
      categoryBreakdown[category] = { amount: 0, count: 0 };
    }
    categoryBreakdown[category].amount += expense.amount || 0;
    categoryBreakdown[category].count += 1;
  });

  const categoryBreakdownArray = Object.entries(categoryBreakdown).map(([category, data]) => ({
    category,
    amount: data.amount,
    count: data.count
  })).sort((a, b) => b.amount - a.amount);

  // Group by month for monthly data
  const monthlyData = {};
  expenses.forEach(expense => {
    const month = expense.createdAt.toISOString().substring(0, 7); // YYYY-MM
    if (!monthlyData[month]) {
      monthlyData[month] = { amount: 0, count: 0 };
    }
    monthlyData[month].amount += expense.amount || 0;
    monthlyData[month].count += 1;
  });

  const monthlyDataArray = Object.entries(monthlyData).map(([month, data]) => ({
    month,
    amount: data.amount,
    count: data.count
  })).sort((a, b) => a.month.localeCompare(b.month));

  res.status(200).json({
    success: true,
    data: {
      totalAmount,
      totalCount,
      categoryBreakdown: categoryBreakdownArray,
      monthlyData: monthlyDataArray
    }
  });
});

// @desc    Get users report data
// @route   GET /api/admin/reports/users
// @access  Private (Admin)
exports.getUsersReport = asyncHandler(async (req, res, next) => {
  const { startDate, endDate } = req.query;
  
  // Build date filter
  const dateFilter = {};
  if (startDate && endDate) {
    dateFilter.createdAt = {
      $gte: new Date(startDate),
      $lte: new Date(endDate)
    };
  }

  // Get all users
  const users = await User.find(dateFilter).populate('role', 'name');

  // Calculate totals
  const totalUsers = users.length;
  const activeUsers = users.filter(user => user.isActive !== false).length;

  // Group by role for role breakdown
  const roleBreakdown = {};
  users.forEach(user => {
    const roleName = user.role?.name || 'No Role';
    if (!roleBreakdown[roleName]) {
      roleBreakdown[roleName] = 0;
    }
    roleBreakdown[roleName] += 1;
  });

  const usersByRole = Object.entries(roleBreakdown).map(([role, count]) => ({
    role,
    count
  })).sort((a, b) => b.count - a.count);

  // Group by month for monthly registrations
  const monthlyRegistrations = {};
  users.forEach(user => {
    const month = user.createdAt.toISOString().substring(0, 7); // YYYY-MM
    if (!monthlyRegistrations[month]) {
      monthlyRegistrations[month] = 0;
    }
    monthlyRegistrations[month] += 1;
  });

  const monthlyRegistrationsArray = Object.entries(monthlyRegistrations).map(([month, count]) => ({
    month,
    count
  })).sort((a, b) => a.month.localeCompare(b.month));

  res.status(200).json({
    success: true,
    data: {
      totalUsers,
      activeUsers,
      usersByRole,
      monthlyRegistrations: monthlyRegistrationsArray
    }
  });
});

// @desc    Get employees report data
// @route   GET /api/admin/reports/employees
// @access  Private (Admin)
exports.getEmployeesReport = asyncHandler(async (req, res, next) => {
  const { startDate, endDate } = req.query;
  
  // Build date filter
  const dateFilter = {};
  if (startDate && endDate) {
    dateFilter.createdAt = {
      $gte: new Date(startDate),
      $lte: new Date(endDate)
    };
  }

  // Get all employees
  const employees = await Employee.find(dateFilter);

  // Calculate totals
  const totalEmployees = employees.length;
  const activeEmployees = employees.filter(employee => employee.isActive !== false).length;

  // Group by type for type breakdown
  const typeBreakdown = {};
  employees.forEach(employee => {
    const type = employee.employeeType || 'Unknown';
    if (!typeBreakdown[type]) {
      typeBreakdown[type] = 0;
    }
    typeBreakdown[type] += 1;
  });

  const employeesByType = Object.entries(typeBreakdown).map(([type, count]) => ({
    type,
    count
  })).sort((a, b) => b.count - a.count);

  // Group by department for department breakdown
  const departmentBreakdown = {};
  employees.forEach(employee => {
    const department = employee.department || 'No Department';
    if (!departmentBreakdown[department]) {
      departmentBreakdown[department] = 0;
    }
    departmentBreakdown[department] += 1;
  });

  const employeesByDepartment = Object.entries(departmentBreakdown).map(([department, count]) => ({
    department,
    count
  })).sort((a, b) => b.count - a.count);

  res.status(200).json({
    success: true,
    data: {
      totalEmployees,
      activeEmployees,
      employeesByType,
      employeesByDepartment
    }
  });
});

// @desc    Generate PDF report
// @route   GET /api/admin/reports/pdf/:reportType
// @access  Private (Admin)
exports.generatePDFReport = asyncHandler(async (req, res, next) => {
  const { reportType } = req.params;
  const { startDate, endDate, productName } = req.query;

  try {
    let reportData;
    let pdfPath;

    // Fetch data based on report type
    switch (reportType) {
      case 'sales':
        reportData = await getSalesReportData(startDate, endDate, productName);
        pdfPath = await pdfReportService.generateSalesReport(reportData, { startDate, endDate, productName });
        break;
      case 'purchases':
        reportData = await getPurchasesReportData(startDate, endDate, productName);
        pdfPath = await pdfReportService.generatePurchasesReport(reportData, { startDate, endDate, productName });
        break;
      case 'expenses':
        reportData = await getExpensesReportData(startDate, endDate);
        pdfPath = await pdfReportService.generateExpensesReport(reportData, { startDate, endDate });
        break;
      case 'users':
        reportData = await getUsersReportData(startDate, endDate);
        pdfPath = await pdfReportService.generateUsersReport(reportData, { startDate, endDate });
        break;
      case 'employees':
        reportData = await getEmployeesReportData(startDate, endDate);
        pdfPath = await pdfReportService.generateEmployeesReport(reportData, { startDate, endDate });
        break;
      case 'comprehensive':
        reportData = await getAllReportData(startDate, endDate);
        pdfPath = await pdfReportService.generateComprehensiveReport(reportData, { startDate, endDate });
        break;
      default:
        return res.status(400).json({
          success: false,
          message: 'Invalid report type'
        });
    }

    // Verify PDF file exists before sending
    if (!fs.existsSync(pdfPath)) {
      return res.status(500).json({
        success: false,
        message: 'PDF file was not generated',
        error: 'File not found'
      });
    }

    // Send the PDF file with explicit Content-Type
    // Set Content-Type to application/pdf before downloading
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${path.basename(pdfPath)}"`);
    
    // Read and send the file
    const fileStream = fs.createReadStream(pdfPath);
    fileStream.pipe(res);
    
    fileStream.on('end', () => {
      // Clean up the file after sending
      setTimeout(() => {
        fs.unlink(pdfPath, (unlinkErr) => {
          if (unlinkErr) console.error('Error deleting PDF file:', unlinkErr);
        });
      }, 5000);
    });
    
    fileStream.on('error', (err) => {
      console.error('Error sending PDF:', err);
      // Only send error if headers haven't been sent
      if (!res.headersSent) {
        res.status(500).json({
          success: false,
          message: 'Error sending PDF file',
          error: err.message || 'Unknown error'
        });
      }
    });

  } catch (error) {
    console.error('Error generating PDF:', error);
    // Ensure error message is safe for JSON (remove any control characters)
    const errorMessage = error.message 
      ? String(error.message).replace(/[\x00-\x1F\x7F]/g, '').substring(0, 500)
      : 'Unknown error occurred';
    
    // Ensure we haven't already sent a response
    if (!res.headersSent) {
      res.status(500).json({
        success: false,
        message: 'Error generating PDF report',
        error: errorMessage
      });
    } else {
      // Headers already sent, log the error
      console.error('Headers already sent, could not send error response:', errorMessage);
    }
  }
});

// Helper function to get sales report data
async function getSalesReportData(startDate, endDate, productName) {
  const dateFilter = {};
  if (startDate && endDate) {
    dateFilter.createdAt = {
      $gte: new Date(startDate),
      $lte: new Date(endDate)
    };
  }

  let query = { transactionType: 'sale', ...dateFilter };
  if (productName) {
    query.productType = productName.toLowerCase().replace(/\s+/g, '-');
  }

  const salesTransactions = await Product.find(query);
  const productCatalog = await ProductCatalog.find({ isActive: true }).select('name');
  const productNameMap = {};
  productCatalog.forEach(product => {
    const key = product.name.toLowerCase().replace(/\s+/g, '-');
    productNameMap[key] = product.name;
  });

  const totalAmount = salesTransactions.reduce((sum, transaction) => {
    return sum + (transaction.totalBalance || 0);
  }, 0);

  const totalCount = salesTransactions.length;

  const monthlyData = {};
  salesTransactions.forEach(transaction => {
    const month = transaction.createdAt.toISOString().substring(0, 7);
    if (!monthlyData[month]) {
      monthlyData[month] = { amount: 0, count: 0 };
    }
    monthlyData[month].amount += transaction.totalBalance || 0;
    monthlyData[month].count += 1;
  });

  const monthlyDataArray = Object.entries(monthlyData).map(([month, data]) => ({
    month,
    amount: data.amount,
    count: data.count
  })).sort((a, b) => a.month.localeCompare(b.month));

  const productBreakdown = {};
  salesTransactions.forEach(transaction => {
    const productName = productNameMap[transaction.productType] || transaction.productType || 'Unknown Product';
    if (!productBreakdown[productName]) {
      productBreakdown[productName] = { amount: 0, count: 0 };
    }
    productBreakdown[productName].amount += transaction.totalBalance || 0;
    productBreakdown[productName].count += 1;
  });

  const productBreakdownArray = Object.entries(productBreakdown).map(([product, data]) => ({
    product,
    amount: data.amount,
    count: data.count
  })).sort((a, b) => b.amount - a.amount);

  return {
    totalAmount,
    totalCount,
    monthlyData: monthlyDataArray,
    productBreakdown: productBreakdownArray
  };
}

// Helper function to get purchases report data
async function getPurchasesReportData(startDate, endDate, productName) {
  const dateFilter = {};
  if (startDate && endDate) {
    dateFilter.createdAt = {
      $gte: new Date(startDate),
      $lte: new Date(endDate)
    };
  }

  let query = { transactionType: 'purchase', ...dateFilter };
  if (productName) {
    query.productType = productName.toLowerCase().replace(/\s+/g, '-');
  }

  const purchaseTransactions = await Product.find(query);
  const productCatalog = await ProductCatalog.find({ isActive: true }).select('name');
  const productNameMap = {};
  productCatalog.forEach(product => {
    const key = product.name.toLowerCase().replace(/\s+/g, '-');
    productNameMap[key] = product.name;
  });

  const totalAmount = purchaseTransactions.reduce((sum, transaction) => {
    return sum + (transaction.totalBalance || 0);
  }, 0);

  const totalCount = purchaseTransactions.length;

  const monthlyData = {};
  purchaseTransactions.forEach(transaction => {
    const month = transaction.createdAt.toISOString().substring(0, 7);
    if (!monthlyData[month]) {
      monthlyData[month] = { amount: 0, count: 0 };
    }
    monthlyData[month].amount += transaction.totalBalance || 0;
    monthlyData[month].count += 1;
  });

  const monthlyDataArray = Object.entries(monthlyData).map(([month, data]) => ({
    month,
    amount: data.amount,
    count: data.count
  })).sort((a, b) => a.month.localeCompare(b.month));

  const productBreakdown = {};
  purchaseTransactions.forEach(transaction => {
    const productName = productNameMap[transaction.productType] || transaction.productType || 'Unknown Product';
    if (!productBreakdown[productName]) {
      productBreakdown[productName] = { amount: 0, count: 0 };
    }
    productBreakdown[productName].amount += transaction.totalBalance || 0;
    productBreakdown[productName].count += 1;
  });

  const productBreakdownArray = Object.entries(productBreakdown).map(([product, data]) => ({
    product,
    amount: data.amount,
    count: data.count
  })).sort((a, b) => b.amount - a.amount);

  return {
    totalAmount,
    totalCount,
    monthlyData: monthlyDataArray,
    productBreakdown: productBreakdownArray
  };
}

// Helper function to get expenses report data
async function getExpensesReportData(startDate, endDate) {
  const dateFilter = {};
  if (startDate && endDate) {
    dateFilter.createdAt = {
      $gte: new Date(startDate),
      $lte: new Date(endDate)
    };
  }

  const expenses = await Expense.find(dateFilter);
  const totalAmount = expenses.reduce((sum, expense) => {
    return sum + (expense.amount || 0);
  }, 0);

  const totalCount = expenses.length;

  const categoryBreakdown = {};
  expenses.forEach(expense => {
    const category = expense.category || 'Uncategorized';
    if (!categoryBreakdown[category]) {
      categoryBreakdown[category] = { amount: 0, count: 0 };
    }
    categoryBreakdown[category].amount += expense.amount || 0;
    categoryBreakdown[category].count += 1;
  });

  const categoryBreakdownArray = Object.entries(categoryBreakdown).map(([category, data]) => ({
    category,
    amount: data.amount,
    count: data.count
  })).sort((a, b) => b.amount - a.amount);

  const monthlyData = {};
  expenses.forEach(expense => {
    const month = expense.createdAt.toISOString().substring(0, 7);
    if (!monthlyData[month]) {
      monthlyData[month] = { amount: 0, count: 0 };
    }
    monthlyData[month].amount += expense.amount || 0;
    monthlyData[month].count += 1;
  });

  const monthlyDataArray = Object.entries(monthlyData).map(([month, data]) => ({
    month,
    amount: data.amount,
    count: data.count
  })).sort((a, b) => a.month.localeCompare(b.month));

  return {
    totalAmount,
    totalCount,
    categoryBreakdown: categoryBreakdownArray,
    monthlyData: monthlyDataArray
  };
}

// Helper function to get users report data
async function getUsersReportData(startDate, endDate) {
  const dateFilter = {};
  if (startDate && endDate) {
    dateFilter.createdAt = {
      $gte: new Date(startDate),
      $lte: new Date(endDate)
    };
  }

  const users = await User.find(dateFilter).populate('role', 'name');
  const totalUsers = users.length;
  const activeUsers = users.filter(user => user.isActive !== false).length;

  const roleBreakdown = {};
  users.forEach(user => {
    const roleName = user.role?.name || 'No Role';
    if (!roleBreakdown[roleName]) {
      roleBreakdown[roleName] = 0;
    }
    roleBreakdown[roleName] += 1;
  });

  const usersByRole = Object.entries(roleBreakdown).map(([role, count]) => ({
    role,
    count
  })).sort((a, b) => b.count - a.count);

  const monthlyRegistrations = {};
  users.forEach(user => {
    const month = user.createdAt.toISOString().substring(0, 7);
    if (!monthlyRegistrations[month]) {
      monthlyRegistrations[month] = 0;
    }
    monthlyRegistrations[month] += 1;
  });

  const monthlyRegistrationsArray = Object.entries(monthlyRegistrations).map(([month, count]) => ({
    month,
    count
  })).sort((a, b) => a.month.localeCompare(b.month));

  return {
    totalUsers,
    activeUsers,
    usersByRole,
    monthlyRegistrations: monthlyRegistrationsArray
  };
}

// Helper function to get employees report data
async function getEmployeesReportData(startDate, endDate) {
  const dateFilter = {};
  if (startDate && endDate) {
    dateFilter.createdAt = {
      $gte: new Date(startDate),
      $lte: new Date(endDate)
    };
  }

  const employees = await Employee.find(dateFilter);
  const totalEmployees = employees.length;
  const activeEmployees = employees.filter(employee => employee.isActive !== false).length;

  const typeBreakdown = {};
  employees.forEach(employee => {
    const type = employee.employeeType || 'Unknown';
    if (!typeBreakdown[type]) {
      typeBreakdown[type] = 0;
    }
    typeBreakdown[type] += 1;
  });

  const employeesByType = Object.entries(typeBreakdown).map(([type, count]) => ({
    type,
    count
  })).sort((a, b) => b.count - a.count);

  const departmentBreakdown = {};
  employees.forEach(employee => {
    const department = employee.department || 'No Department';
    if (!departmentBreakdown[department]) {
      departmentBreakdown[department] = 0;
    }
    departmentBreakdown[department] += 1;
  });

  const employeesByDepartment = Object.entries(departmentBreakdown).map(([department, count]) => ({
    department,
    count
  })).sort((a, b) => b.count - a.count);

  return {
    totalEmployees,
    activeEmployees,
    employeesByType,
    employeesByDepartment
  };
}

// Helper function to get all report data for comprehensive report
async function getAllReportData(startDate, endDate) {
  const [sales, purchases, expenses, users, employees] = await Promise.all([
    getSalesReportData(startDate, endDate),
    getPurchasesReportData(startDate, endDate),
    getExpensesReportData(startDate, endDate),
    getUsersReportData(startDate, endDate),
    getEmployeesReportData(startDate, endDate)
  ]);

  return { sales, purchases, expenses, users, employees };
}