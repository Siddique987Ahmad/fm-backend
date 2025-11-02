// ===============================================
// controllers/expenseController.js - Expense Management Controller
// ===============================================
const Expense = require('../models/Expense');

// Helper function to validate category-specific fields
const validateCategoryFields = (category, categorySpecific) => {
  const errors = [];
  
  switch(category) {
    case 'home':
      if (!categorySpecific.homeType) {
        errors.push('Home expense type is required');
      }
      break;
      
    case 'labour':
      if (!categorySpecific.employeeName) {
        errors.push('Employee name is required for labour expenses');
      }
      if (!categorySpecific.employeeType) {
        errors.push('Employee type is required');
      }
      break;
      
    case 'factory':
      if (!categorySpecific.factoryType) {
        errors.push('Factory expense type is required');
      }
      break;
      
    case 'zakat':
      if (!categorySpecific.zakatType) {
        errors.push('Zakat type is required');
      }
      if (!categorySpecific.zakatYear) {
        errors.push('Zakat year is required');
      }
      break;
      
    case 'personal':
      if (!categorySpecific.personalType) {
        errors.push('Personal expense type is required');
      }
      break;
  }
  
  return errors;
};

// Create a new expense
const createExpense = async (req, res) => {
  try {
    const {
      expenseCategory,
      title,
      description,
      amount,
      amountPaid = 0,
      expenseDate,
      dueDate,
      categorySpecific = {},
      receiptNumber,
      vendor,
      notes,
      isRecurring = false,
      recurringFrequency,
      tags = []
    } = req.body;

    // Validate required fields
    if (!expenseCategory || !title || !amount) {
      return res.status(400).json({
        success: false,
        message: 'Expense category, title, and amount are required',
        errors: []
      });
    }

    // Validate category-specific fields
    const categoryErrors = validateCategoryFields(expenseCategory, categorySpecific);
    if (categoryErrors.length > 0) {
      return res.status(400).json({
        success: false,
        message: 'Category-specific validation failed',
        errors: categoryErrors
      });
    }

    // Create expense object
    const expenseData = {
      expenseCategory,
      title: title.trim(),
      description: description ? description.trim() : undefined,
      amount: parseFloat(amount),
      amountPaid: parseFloat(amountPaid) || 0,
      expenseDate: expenseDate ? new Date(expenseDate) : new Date(),
      dueDate: dueDate ? new Date(dueDate) : undefined,
      categorySpecific,
      receiptNumber: receiptNumber ? receiptNumber.trim() : undefined,
      vendor: vendor ? vendor.trim() : undefined,
      notes: notes ? notes.trim() : undefined,
      isRecurring,
      recurringFrequency: isRecurring ? recurringFrequency : undefined,
      tags: tags.filter(tag => tag && tag.trim()).map(tag => tag.trim())
    };

    const expense = new Expense(expenseData);
    const savedExpense = await expense.save();

    res.status(201).json({
      success: true,
      message: 'Expense created successfully',
      data: {
        expense: savedExpense
      }
    });

  } catch (error) {
    console.error('Error creating expense:', error);

    // Handle validation errors
    if (error.name === 'ValidationError') {
      const errors = Object.values(error.errors).map(err => err.message);
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors
      });
    }

    res.status(500).json({
      success: false,
      message: 'Internal server error',
      errors: ['Failed to create expense']
    });
  }
};

// Get expenses by category with filtering
const getExpensesByCategory = async (req, res) => {
  try {
    const { category } = req.params;
    const { 
      page = 1, 
      limit = 10, 
      sortBy = 'createdAt', 
      sortOrder = 'desc',
      status,
      paymentStatus,
      startDate,
      endDate,
      search
    } = req.query;

    // Build filter query
    const filter = { expenseCategory: category };
    
    if (status) {
      filter.status = status;
    }
    
    if (paymentStatus) {
      filter.paymentStatus = paymentStatus;
    }
    
    if (startDate || endDate) {
      filter.createdAt = {};
      if (startDate) filter.createdAt.$gte = new Date(startDate);
      if (endDate) filter.createdAt.$lte = new Date(endDate);
    }
    
    if (search) {
      filter.$or = [
        { title: { $regex: search, $options: 'i' } },
        { description: { $regex: search, $options: 'i' } },
        { vendor: { $regex: search, $options: 'i' } },
        { 'categorySpecific.employeeName': { $regex: search, $options: 'i' } }
      ];
    }

    // Calculate pagination
    const skip = (parseInt(page) - 1) * parseInt(limit);
    
    // Build sort object
    const sort = {};
    sort[sortBy] = sortOrder === 'desc' ? -1 : 1;

    // Execute queries
    const [expenses, totalCount] = await Promise.all([
      Expense.find(filter)
        .sort(sort)
        .skip(skip)
        .limit(parseInt(limit)),
      Expense.countDocuments(filter)
    ]);

    // Calculate summary for this category
    const summary = await Expense.aggregate([
      { $match: filter },
      {
        $group: {
          _id: null,
          totalAmount: { $sum: '$amount' },
          totalPaid: { $sum: '$amountPaid' },
          totalOutstanding: { $sum: { $subtract: ['$amount', '$amountPaid'] } },
          paidCount: { $sum: { $cond: [{ $eq: ['$paymentStatus', 'paid'] }, 1, 0] } },
          pendingCount: { $sum: { $cond: [{ $eq: ['$paymentStatus', 'pending'] }, 1, 0] } },
          advanceCount: { $sum: { $cond: [{ $eq: ['$paymentStatus', 'advance'] }, 1, 0] } }
        }
      }
    ]);

    const summaryData = summary[0] || {
      totalAmount: 0,
      totalPaid: 0,
      totalOutstanding: 0,
      paidCount: 0,
      pendingCount: 0,
      advanceCount: 0
    };

    res.status(200).json({
      success: true,
      data: {
        expenses,
        pagination: {
          currentPage: parseInt(page),
          totalPages: Math.ceil(totalCount / parseInt(limit)),
          totalItems: totalCount,
          itemsPerPage: parseInt(limit)
        },
        summary: summaryData
      }
    });

  } catch (error) {
    console.error('Error fetching expenses:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      errors: ['Failed to fetch expenses']
    });
  }
};

// Get all expenses (overview)
const getAllExpenses = async (req, res) => {
  try {
    const { 
      page = 1, 
      limit = 20, 
      category,
      paymentStatus,
      startDate,
      endDate 
    } = req.query;

    // Build filter
    const filter = {};
    
    if (category) {
      filter.expenseCategory = category;
    }
    
    if (paymentStatus) {
      filter.paymentStatus = paymentStatus;
    }
    
    if (startDate || endDate) {
      filter.createdAt = {};
      if (startDate) filter.createdAt.$gte = new Date(startDate);
      if (endDate) filter.createdAt.$lte = new Date(endDate);
    }

    const skip = (parseInt(page) - 1) * parseInt(limit);

    const [expenses, totalCount, categoryWiseSummary] = await Promise.all([
      Expense.find(filter)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(parseInt(limit)),
      Expense.countDocuments(filter),
      Expense.getExpenseSummary(null, startDate, endDate)
    ]);

    res.status(200).json({
      success: true,
      data: {
        expenses,
        pagination: {
          currentPage: parseInt(page),
          totalPages: Math.ceil(totalCount / parseInt(limit)),
          totalItems: totalCount,
          itemsPerPage: parseInt(limit)
        },
        categoryWiseSummary
      }
    });

  } catch (error) {
    console.error('Error fetching all expenses:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      errors: ['Failed to fetch expenses']
    });
  }
};

// Get expense by ID
const getExpenseById = async (req, res) => {
  try {
    const { id } = req.params;
    
    const expense = await Expense.findById(id);
    
    if (!expense) {
      return res.status(404).json({
        success: false,
        message: 'Expense not found',
        errors: []
      });
    }

    res.status(200).json({
      success: true,
      data: { expense }
    });

  } catch (error) {
    console.error('Error fetching expense:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      errors: ['Failed to fetch expense']
    });
  }
};

// Update expense
const updateExpense = async (req, res) => {
  try {
    const { id } = req.params;
    const updateData = { ...req.body };

    // Remove fields that shouldn't be updated directly
    delete updateData._id;
    delete updateData.createdAt;
    delete updateData.updatedAt;

    // Validate category-specific fields if category is being updated
    if (updateData.expenseCategory && updateData.categorySpecific) {
      const categoryErrors = validateCategoryFields(updateData.expenseCategory, updateData.categorySpecific);
      if (categoryErrors.length > 0) {
        return res.status(400).json({
          success: false,
          message: 'Category-specific validation failed',
          errors: categoryErrors
        });
      }
    }

    const expense = await Expense.findByIdAndUpdate(
      id, 
      updateData, 
      { 
        new: true, 
        runValidators: true 
      }
    );

    if (!expense) {
      return res.status(404).json({
        success: false,
        message: 'Expense not found',
        errors: []
      });
    }

    res.status(200).json({
      success: true,
      message: 'Expense updated successfully',
      data: { expense }
    });

  } catch (error) {
    console.error('Error updating expense:', error);

    if (error.name === 'ValidationError') {
      const errors = Object.values(error.errors).map(err => err.message);
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors
      });
    }

    res.status(500).json({
      success: false,
      message: 'Internal server error',
      errors: ['Failed to update expense']
    });
  }
};

// Delete expense
const deleteExpense = async (req, res) => {
  try {
    const { id } = req.params;
    
    const expense = await Expense.findByIdAndDelete(id);
    
    if (!expense) {
      return res.status(404).json({
        success: false,
        message: 'Expense not found',
        errors: []
      });
    }

    res.status(200).json({
      success: true,
      message: 'Expense deleted successfully',
      data: { deletedExpense: expense }
    });

  } catch (error) {
    console.error('Error deleting expense:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      errors: ['Failed to delete expense']
    });
  }
};

// Update payment for expense
const updatePayment = async (req, res) => {
  try {
    const { id } = req.params;
    const { amountPaid, notes } = req.body;

    if (!amountPaid || amountPaid < 0) {
      return res.status(400).json({
        success: false,
        message: 'Valid payment amount is required',
        errors: []
      });
    }

    const expense = await Expense.findById(id);
    
    if (!expense) {
      return res.status(404).json({
        success: false,
        message: 'Expense not found',
        errors: []
      });
    }

    expense.amountPaid = parseFloat(amountPaid);
    if (notes) {
      expense.notes = notes;
    }

    await expense.save();

    res.status(200).json({
      success: true,
      message: 'Payment updated successfully',
      data: { expense }
    });

  } catch (error) {
    console.error('Error updating payment:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      errors: ['Failed to update payment']
    });
  }
};

// Get expense statistics
const getExpenseStats = async (req, res) => {
  try {
    const { category, startDate, endDate } = req.query;
    
    const summary = await Expense.getExpenseSummary(category, startDate, endDate);
    
    // Get total counts
    const totalCount = await Expense.countDocuments(
      category ? { expenseCategory: category } : {}
    );

    // Get overdue expenses
    const overdueExpenses = await Expense.countDocuments({
      paymentStatus: { $ne: 'paid' },
      dueDate: { $lt: new Date() },
      ...(category ? { expenseCategory: category } : {})
    });

    res.status(200).json({
      success: true,
      data: {
        summary,
        totalExpenses: totalCount,
        overdueExpenses,
        generatedAt: new Date()
      }
    });

  } catch (error) {
    console.error('Error fetching expense stats:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      errors: ['Failed to fetch expense statistics']
    });
  }
};

module.exports = {
  createExpense,
  getExpensesByCategory,
  getAllExpenses,
  getExpenseById,
  updateExpense,
  deleteExpense,
  updatePayment,
  getExpenseStats
};