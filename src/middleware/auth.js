const jwt = require('jsonwebtoken');
const User = require('../models/User');
const Role = require('../models/Role');

// Generate JWT token
const generateToken = (userId) => {
  return jwt.sign({ userId }, process.env.JWT_SECRET || 'your-secret-key', {
    expiresIn: process.env.JWT_EXPIRE || '24h'
  });
};

// Send token response
const sendTokenResponse = (user, statusCode, res) => {
  const token = generateToken(user._id);

  const options = {
    expires: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict'
  };

  res
    .status(statusCode)
    .cookie('token', token, options)
    .json({
      success: true,
      token,
      user: {
        id: user._id,
        firstName: user.firstName,
        lastName: user.lastName,
        email: user.email,
        role: user.role,
        employeeId: user.employeeId,
        department: user.department,
        position: user.position,
        profilePicture: user.profilePicture,
        isActive: user.isActive
      }
    });
};

// Protect routes - verify token
const protect = async (req, res, next) => {
  let token;

  // Get token from header or cookie
  if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
    token = req.headers.authorization.split(' ')[1];
  } else if (req.cookies.token) {
    token = req.cookies.token;
  }

  // Make sure token exists
  if (!token) {
    return res.status(401).json({
      success: false,
      message: 'Not authorized to access this route'
    });
  }

  try {
    // Verify token
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'your-secret-key');

    // Get user from token
    const user = await User.findById(decoded.userId)
      .populate({
        path: 'role',
        populate: {
          path: 'permissions'
        }
      })
      .select('+lastLogin');

    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'No user found with this token'
      });
    }

    // Check if user is active
    if (!user.isActive) {
      return res.status(401).json({
        success: false,
        message: 'User account is deactivated'
      });
    }

    // Update last login
    user.lastLogin = new Date();
    await user.save({ validateBeforeSave: false });

    req.user = user;
    next();
  } catch (error) {
    return res.status(401).json({
      success: false,
      message: 'Not authorized to access this route'
    });
  }
};

// Grant access to specific roles
const authorize = (...roles) => {
  return (req, res, next) => {
    if (!req.user || !req.user.role) {
      return res.status(401).json({
        success: false,
        message: 'User role not found'
      });
    }

    const userRole = req.user.role.name || req.user.role;
    
    if (!roles.includes(userRole)) {
      return res.status(403).json({
        success: false,
        message: `User role '${userRole}' is not authorized to access this route`
      });
    }

    next();
  };
};

// Grant access based on permissions
const checkPermission = (permissionName) => {
  return async (req, res, next) => {
    try {
      if (!req.user || !req.user.role) {
        return res.status(401).json({
          success: false,
          message: 'User role not found'
        });
      }

      // If role is populated, check permissions
      if (req.user.role.permissions) {
        const hasPermission = req.user.role.permissions.some(permission => 
          permission.name === permissionName || permission._id.toString() === permissionName
        );

        if (!hasPermission) {
          return res.status(403).json({
            success: false,
            message: `Permission '${permissionName}' is required to access this route`
          });
        }
      } else {
        // If role is not populated, fetch it
        const role = await Role.findById(req.user.role)
          .populate('permissions', 'name displayName');
        
        const hasPermission = role.permissions.some(permission => 
          permission.name === permissionName
        );

        if (!hasPermission) {
          return res.status(403).json({
            success: false,
            message: `Permission '${permissionName}' is required to access this route`
          });
        }
      }

      next();
    } catch (error) {
      return res.status(500).json({
        success: false,
        message: 'Error checking permissions'
      });
    }
  };
};

// Optional auth - doesn't fail if no token
const optionalAuth = async (req, res, next) => {
  let token;

  if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
    token = req.headers.authorization.split(' ')[1];
  } else if (req.cookies.token) {
    token = req.cookies.token;
  }

  if (!token) {
    req.user = null;
    return next();
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'your-secret-key');
    const user = await User.findById(decoded.userId)
      .populate('role', 'name displayName permissions')
      .select('+lastLogin');

    req.user = user;
    next();
  } catch (error) {
    req.user = null;
    next();
  }
};

module.exports = {
  generateToken,
  sendTokenResponse,
  protect,
  authorize,
  checkPermission,
  optionalAuth
};
