// ===============================================
// controllers/employeeController.js - Employee Management Controller
// ===============================================
const Employee = require('../models/Employee');

// @desc    Get all employees with pagination and filtering
// @route   GET /api/admin/employees
// @access  Private (Admin/Manager)
const getEmployees = async (req, res) => {
  try {
    const {
      page = 1,
      limit = 10,
      search,
      department,
      employeeType,
      status,
      isActive,
      sortBy = 'createdAt',
      sortOrder = 'desc'
    } = req.query;

    // Build filter object
    const filter = {};
    
    if (search) {
      filter.$or = [
        { firstName: { $regex: search, $options: 'i' } },
        { lastName: { $regex: search, $options: 'i' } },
        { employeeId: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } }
      ];
    }
    
    if (department) filter.department = { $regex: department, $options: 'i' };
    if (employeeType) filter.employeeType = employeeType;
    if (status) filter.status = status;
    if (isActive !== undefined) filter.isActive = isActive === 'true';

    // Calculate pagination
    const skip = (parseInt(page) - 1) * parseInt(limit);
    const sort = { [sortBy]: sortOrder === 'desc' ? -1 : 1 };

    // Execute query with pagination
    const employees = await Employee.find(filter)
      .populate('createdBy', 'firstName lastName email')
      .populate('updatedBy', 'firstName lastName email')
      .sort(sort)
      .skip(skip)
      .limit(parseInt(limit));

    const total = await Employee.countDocuments(filter);

    res.status(200).json({
      success: true,
      count: employees.length,
      total,
      pagination: {
        currentPage: parseInt(page),
        totalPages: Math.ceil(total / parseInt(limit)),
        hasNext: skip + employees.length < total,
        hasPrev: parseInt(page) > 1
      },
      data: employees
    });

  } catch (error) {
    console.error('Error fetching employees:', error);
    res.status(500).json({
      success: false,
      message: 'Server Error',
      error: error.message
    });
  }
};

// @desc    Get single employee by ID
// @route   GET /api/admin/employees/:id
// @access  Private (Admin/Manager)
const getEmployeeById = async (req, res) => {
  try {
    const employee = await Employee.findById(req.params.id)
      .populate('createdBy', 'firstName lastName email')
      .populate('updatedBy', 'firstName lastName email');

    if (!employee) {
      return res.status(404).json({
        success: false,
        message: 'Employee not found'
      });
    }

    res.status(200).json({
      success: true,
      data: employee
    });

  } catch (error) {
    console.error('Error fetching employee:', error);
    
    if (error.name === 'CastError') {
      return res.status(400).json({
        success: false,
        message: 'Invalid employee ID'
      });
    }

    res.status(500).json({
      success: false,
      message: 'Server Error',
      error: error.message
    });
  }
};

// @desc    Create new employee
// @route   POST /api/admin/employees
// @access  Private (Admin/Manager)
const createEmployee = async (req, res) => {
  try {
    const {
      firstName,
      lastName,
      employeeId,
      phone,
      email,
      department,
      position,
      employeeType,
      hireDate,
      salary,
      salaryType,
      address,
      emergencyContact,
      notes
    } = req.body;

    // Validation
    if (!firstName || !lastName || !employeeId || !department || !position) {
      return res.status(400).json({
        success: false,
        message: 'Please provide all required fields'
      });
    }

    // Check if employee ID already exists
    const existingEmployee = await Employee.findOne({ employeeId });
    if (existingEmployee) {
      return res.status(400).json({
        success: false,
        message: 'Employee ID already exists'
      });
    }

    // Check if email already exists (if provided)
    if (email) {
      const existingEmail = await Employee.findOne({ email });
      if (existingEmail) {
        return res.status(400).json({
          success: false,
          message: 'Email already exists'
        });
      }
    }

    // Create employee
    const employee = await Employee.create({
      firstName,
      lastName,
      employeeId,
      phone,
      email,
      department,
      position,
      employeeType,
      hireDate,
      salary,
      salaryType,
      address,
      emergencyContact,
      notes,
      createdBy: req.user._id
    });

    res.status(201).json({
      success: true,
      message: 'Employee created successfully',
      data: employee
    });

  } catch (error) {
    console.error('Error creating employee:', error);
    
    if (error.code === 11000) {
      const field = Object.keys(error.keyPattern)[0];
      return res.status(400).json({
        success: false,
        message: `${field} already exists`
      });
    }

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

// @desc    Update employee
// @route   PUT /api/admin/employees/:id
// @access  Private (Admin/Manager)
const updateEmployee = async (req, res) => {
  try {
    const {
      firstName,
      lastName,
      employeeId,
      phone,
      email,
      department,
      position,
      employeeType,
      hireDate,
      salary,
      salaryType,
      address,
      emergencyContact,
      notes,
      isActive,
      status
    } = req.body;

    const employee = await Employee.findById(req.params.id);

    if (!employee) {
      return res.status(404).json({
        success: false,
        message: 'Employee not found'
      });
    }

    // Check if employee ID is being changed and if it's unique
    if (employeeId && employeeId !== employee.employeeId) {
      const existingEmployee = await Employee.findOne({ employeeId });
      if (existingEmployee) {
        return res.status(400).json({
          success: false,
          message: 'Employee ID already exists'
        });
      }
    }

    // Check if email is being changed and if it's unique
    if (email && email !== employee.email) {
      const existingEmail = await Employee.findOne({ email });
      if (existingEmail) {
        return res.status(400).json({
          success: false,
          message: 'Email already exists'
        });
      }
    }

    // Update employee
    const updatedEmployee = await Employee.findByIdAndUpdate(
      req.params.id,
      {
        ...req.body,
        updatedBy: req.user._id
      },
      { new: true, runValidators: true }
    );

    res.status(200).json({
      success: true,
      message: 'Employee updated successfully',
      data: updatedEmployee
    });

  } catch (error) {
    console.error('Error updating employee:', error);
    
    if (error.code === 11000) {
      const field = Object.keys(error.keyPattern)[0];
      return res.status(400).json({
        success: false,
        message: `${field} already exists`
      });
    }

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

// @desc    Delete employee
// @route   DELETE /api/admin/employees/:id
// @access  Private (Admin only)
const deleteEmployee = async (req, res) => {
  try {
    const employee = await Employee.findById(req.params.id);

    if (!employee) {
      return res.status(404).json({
        success: false,
        message: 'Employee not found'
      });
    }

    await Employee.findByIdAndDelete(req.params.id);

    res.status(200).json({
      success: true,
      message: 'Employee deleted successfully'
    });

  } catch (error) {
    console.error('Error deleting employee:', error);
    res.status(500).json({
      success: false,
      message: 'Server Error',
      error: error.message
    });
  }
};

// @desc    Toggle employee active status
// @route   PATCH /api/admin/employees/:id/toggle-status
// @access  Private (Admin/Manager)
const toggleEmployeeStatus = async (req, res) => {
  try {
    const employee = await Employee.findById(req.params.id);

    if (!employee) {
      return res.status(404).json({
        success: false,
        message: 'Employee not found'
      });
    }

    employee.isActive = !employee.isActive;
    employee.updatedBy = req.user._id;
    await employee.save();

    res.status(200).json({
      success: true,
      message: `Employee ${employee.isActive ? 'activated' : 'deactivated'} successfully`,
      data: {
        id: employee._id,
        isActive: employee.isActive
      }
    });

  } catch (error) {
    console.error('Error toggling employee status:', error);
    res.status(500).json({
      success: false,
      message: 'Server Error',
      error: error.message
    });
  }
};

// @desc    Get employee statistics
// @route   GET /api/admin/employees/stats
// @access  Private (Admin/Manager)
const getEmployeeStats = async (req, res) => {
  try {
    const stats = await Employee.getEmployeeStats();

    res.status(200).json({
      success: true,
      data: stats
    });

  } catch (error) {
    console.error('Error fetching employee stats:', error);
    res.status(500).json({
      success: false,
      message: 'Server Error',
      error: error.message
    });
  }
};

// @desc    Get employees for expense creation
// @route   GET /api/admin/employees/for-expense
// @access  Private (Admin/Manager)
const getEmployeesForExpense = async (req, res) => {
  try {
    const employees = await Employee.getEmployeesForExpense();

    res.status(200).json({
      success: true,
      data: employees
    });

  } catch (error) {
    console.error('Error fetching employees for expense:', error);
    res.status(500).json({
      success: false,
      message: 'Server Error',
      error: error.message
    });
  }
};

// @desc    Get employee advance history
// @route   GET /api/admin/employees/:id/advances
// @access  Private (Admin/Manager)
const getEmployeeAdvances = async (req, res) => {
  try {
    const { id } = req.params;
    const Expense = require('../models/Expense');

    // Get employee details
    const employee = await Employee.findById(id).select('firstName lastName employeeId salary');
    
    if (!employee) {
      return res.status(404).json({
        success: false,
        message: 'Employee not found'
      });
    }

    // Get all labour expenses for this employee in current month where they took advance
    const currentMonth = new Date();
    const startOfMonth = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), 1);
    const endOfMonth = new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 0);

    // Build employee name for fallback matching
    const employeeName = `${employee.firstName} ${employee.lastName}`;

    // Query by employeeId OR employeeName (for backward compatibility with old records)
    const advances = await Expense.find({
      expenseCategory: 'labour',
      $or: [
        { 'categorySpecific.employeeId': id },
        { 'categorySpecific.employeeName': employeeName }
      ],
      expenseDate: { $gte: startOfMonth, $lte: endOfMonth },
      'categorySpecific.advanceAmount': { $exists: true, $gt: 0 }
    }).sort({ expenseDate: -1 });

    // Calculate totals - only count advances where amount > 0
    const totalAdvances = advances.reduce((sum, exp) => {
      const advanceAmount = exp.categorySpecific?.advanceAmount || 0;
      const amount = typeof advanceAmount === 'number' ? advanceAmount : parseFloat(advanceAmount) || 0;
      return amount > 0 ? sum + amount : sum;
    }, 0);

    const totalSalaryPaid = advances.reduce((sum, exp) => sum + (exp.amount || 0), 0);
    const remainingSalary = (employee.salary || 0) - totalAdvances;

    res.status(200).json({
      success: true,
      data: {
        employee: {
          id: employee._id,
          name: `${employee.firstName} ${employee.lastName}`,
          employeeId: employee.employeeId,
          salary: employee.salary
        },
        advances: advances
          .filter(adv => {
            const advAmt = adv.categorySpecific?.advanceAmount || 0;
            const amt = typeof advAmt === 'number' ? advAmt : parseFloat(advAmt) || 0;
            return amt > 0;
          })
          .map(adv => ({
            date: adv.expenseDate,
            advanceAmount: adv.categorySpecific?.advanceAmount || 0,
            totalAmount: adv.amount,
            remainingAmount: adv.categorySpecific?.remainingAmount || 0,
            description: adv.description || adv.categorySpecific?.advanceReason
          })),
        summary: {
          totalAdvancesTaken: totalAdvances,
          totalSalaryPaid: totalSalaryPaid,
          remainingSalary: remainingSalary,
          monthSalary: employee.salary || 0
        }
      }
    });

  } catch (error) {
    console.error('Error fetching employee advances:', error);
    res.status(500).json({
      success: false,
      message: 'Server Error',
      error: error.message
    });
  }
};

module.exports = {
  getEmployees,
  getEmployeeById,
  createEmployee,
  updateEmployee,
  deleteEmployee,
  toggleEmployeeStatus,
  getEmployeeStats,
  getEmployeesForExpense,
  getEmployeeAdvances
};
