const Role = require('../models/Role');
const Permission = require('../models/Permission');

// @desc    Get all roles with pagination and filtering
// @route   GET /api/admin/roles
// @access  Private (Admin/Manager)
const getRoles = async (req, res) => {
  try {
    const {
      page = 1,
      limit = 10,
      search,
      isActive,
      sortBy = 'priority',
      sortOrder = 'desc'
    } = req.query;

    // Build filter object
    const filter = {};
    
    if (search) {
      filter.$or = [
        { name: { $regex: search, $options: 'i' } },
        { displayName: { $regex: search, $options: 'i' } },
        { description: { $regex: search, $options: 'i' } }
      ];
    }
    
    if (isActive !== undefined) filter.isActive = isActive === 'true';

    // Calculate pagination
    const skip = (parseInt(page) - 1) * parseInt(limit);
    const sort = { [sortBy]: sortOrder === 'desc' ? -1 : 1 };

    // Execute query with pagination
    const roles = await Role.find(filter)
      .populate('permissions', 'name displayName category action resource')
      .populate('createdBy', 'firstName lastName email')
      .sort(sort)
      .skip(skip)
      .limit(parseInt(limit));

    const total = await Role.countDocuments(filter);

    res.status(200).json({
      success: true,
      count: roles.length,
      total,
      pagination: {
        currentPage: parseInt(page),
        totalPages: Math.ceil(total / parseInt(limit)),
        hasNext: skip + roles.length < total,
        hasPrev: parseInt(page) > 1
      },
      data: roles
    });

  } catch (error) {
    console.error('Error fetching roles:', error);
    res.status(500).json({
      success: false,
      message: 'Server Error',
      error: error.message
    });
  }
};

// @desc    Get single role by ID
// @route   GET /api/admin/roles/:id
// @access  Private (Admin/Manager)
const getRoleById = async (req, res) => {
  try {
    const role = await Role.findById(req.params.id)
      .populate('permissions', 'name displayName category action resource')
      .populate('createdBy', 'firstName lastName email')
      .populate('updatedBy', 'firstName lastName email');

    if (!role) {
      return res.status(404).json({
        success: false,
        message: 'Role not found'
      });
    }

    res.status(200).json({
      success: true,
      data: role
    });

  } catch (error) {
    console.error('Error fetching role:', error);
    
    if (error.name === 'CastError') {
      return res.status(400).json({
        success: false,
        message: 'Invalid role ID'
      });
    }

    res.status(500).json({
      success: false,
      message: 'Server Error',
      error: error.message
    });
  }
};

// @desc    Create new role
// @route   POST /api/admin/roles
// @access  Private (Admin)
const createRole = async (req, res) => {
  try {
    const {
      name,
      displayName,
      description,
      permissions,
      color,
      priority
    } = req.body;

    // Validation
    if (!name || !displayName) {
      return res.status(400).json({
        success: false,
        message: 'Role name and display name are required'
      });
    }

    // Check if role already exists
    const existingRole = await Role.findOne({ name: name.toLowerCase() });
    if (existingRole) {
      return res.status(400).json({
        success: false,
        message: 'Role with this name already exists'
      });
    }

    // Validate permissions if provided
    if (permissions && permissions.length > 0) {
      const validPermissions = await Permission.find({
        _id: { $in: permissions },
        isActive: true
      });
      
      if (validPermissions.length !== permissions.length) {
        return res.status(400).json({
          success: false,
          message: 'One or more permissions are invalid'
        });
      }
    }

    // Create role
    const role = await Role.create({
      name: name.toLowerCase(),
      displayName,
      description,
      permissions: permissions || [],
      color: color || '#3B82F6',
      priority: priority || 0,
      createdBy: req.user._id
    });

    // Populate permissions for response
    await role.populate('permissions', 'name displayName category');

    res.status(201).json({
      success: true,
      message: 'Role created successfully',
      data: role
    });

  } catch (error) {
    console.error('Error creating role:', error);
    
    if (error.code === 11000) {
      return res.status(400).json({
        success: false,
        message: 'Role name already exists'
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

// @desc    Update role
// @route   PUT /api/admin/roles/:id
// @access  Private (Admin)
const updateRole = async (req, res) => {
  try {
    const {
      displayName,
      description,
      permissions,
      color,
      priority,
      isActive
    } = req.body;

    const role = await Role.findById(req.params.id);

    if (!role) {
      return res.status(404).json({
        success: false,
        message: 'Role not found'
      });
    }

    // Prevent modification of system roles
    if (role.isSystemRole && (permissions || isActive === false)) {
      return res.status(400).json({
        success: false,
        message: 'System roles cannot be modified'
      });
    }

    // Validate permissions if provided
    if (permissions && permissions.length > 0) {
      const validPermissions = await Permission.find({
        _id: { $in: permissions },
        isActive: true
      });
      
      if (validPermissions.length !== permissions.length) {
        return res.status(400).json({
          success: false,
          message: 'One or more permissions are invalid'
        });
      }
    }

    // Update role
    const updatedRole = await Role.findByIdAndUpdate(
      req.params.id,
      {
        ...req.body,
        updatedBy: req.user._id
      },
      { new: true, runValidators: true }
    )
      .populate('permissions', 'name displayName category')
      .populate('createdBy', 'firstName lastName email')
      .populate('updatedBy', 'firstName lastName email');

    res.status(200).json({
      success: true,
      message: 'Role updated successfully',
      data: updatedRole
    });

  } catch (error) {
    console.error('Error updating role:', error);
    
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

// @desc    Delete role
// @route   DELETE /api/admin/roles/:id
// @access  Private (Admin)
const deleteRole = async (req, res) => {
  try {
    const role = await Role.findById(req.params.id);

    if (!role) {
      return res.status(404).json({
        success: false,
        message: 'Role not found'
      });
    }

    // Prevent deletion of system roles
    if (role.isSystemRole) {
      return res.status(400).json({
        success: false,
        message: 'System roles cannot be deleted'
      });
    }

    await Role.findByIdAndDelete(req.params.id);

    res.status(200).json({
      success: true,
      message: 'Role deleted successfully'
    });

  } catch (error) {
    console.error('Error deleting role:', error);
    res.status(500).json({
      success: false,
      message: 'Server Error',
      error: error.message
    });
  }
};

// @desc    Get all permissions
// @route   GET /api/admin/permissions
// @access  Private (Admin/Manager)
const getPermissions = async (req, res) => {
  try {
    const { category } = req.query;

    let filter = { isActive: true };
    if (category) {
      filter.category = category;
    }

    const permissions = await Permission.find(filter)
      .sort({ category: 1, displayName: 1 });

    // Group permissions by category
    const permissionsByCategory = permissions.reduce((acc, permission) => {
      if (!acc[permission.category]) {
        acc[permission.category] = [];
      }
      acc[permission.category].push(permission);
      return acc;
    }, {});

    res.status(200).json({
      success: true,
      count: permissions.length,
      data: permissions,
      grouped: permissionsByCategory
    });

  } catch (error) {
    console.error('Error fetching permissions:', error);
    res.status(500).json({
      success: false,
      message: 'Server Error',
      error: error.message
    });
  }
};

module.exports = {
  getRoles,
  getRoleById,
  createRole,
  updateRole,
  deleteRole,
  getPermissions
};
