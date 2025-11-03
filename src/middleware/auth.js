const jwt = require('jsonwebtoken');
const mongoose = require('mongoose');
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

    // If role population failed or role is null/undefined, try to populate it manually
    if (!user.role) {
      console.error(`⚠️  ERROR: User ${user.email} (ID: ${user._id}) has no role assigned!`);
      return res.status(401).json({
        success: false,
        message: 'User role not found. Please contact administrator to assign a role.'
      });
    }

    // Check if role is an ObjectId (not populated) - ObjectId instances don't have 'name' property
    // If role is populated, it will be an object with 'name' property
    const isObjectId = user.role.constructor.name === 'ObjectId' || 
                       (typeof user.role === 'object' && !user.role.name && mongoose.Types.ObjectId.isValid(user.role));
    
    if (isObjectId || !user.role.name) {
      // Role is not populated - fetch it manually
      const roleId = user.role._id || user.role;
      if (roleId) {
        try {
          const role = await Role.findById(roleId).populate('permissions');
          if (role) {
            user.role = role;
            console.log(`✅ Successfully populated role '${role.name}' for user ${user.email} (database: ${mongoose.connection.name})`);
          } else {
            console.error(`❌ ERROR: User ${user.email} has role ID ${roleId} but role not found in database '${mongoose.connection.name}'`);
            return res.status(401).json({
              success: false,
              message: 'User role not found in database. Please contact administrator.',
              debug: process.env.NODE_ENV === 'development' ? `Role ID: ${roleId}, Database: ${mongoose.connection.name}` : undefined
            });
          }
        } catch (popError) {
          console.error('❌ Error manually populating role:', popError);
          console.error('Role ID:', roleId);
          console.error('Database:', mongoose.connection.name);
          return res.status(401).json({
            success: false,
            message: 'Error loading user role. Please try again or contact administrator.'
          });
        }
      } else {
        console.error(`❌ ERROR: User ${user.email} has invalid role reference`);
        return res.status(401).json({
          success: false,
          message: 'User role configuration is invalid. Please contact administrator.'
        });
      }
    } else if (user.role && typeof user.role === 'object' && user.role.name) {
      // Role is properly populated - log for debugging
      console.log(`✅ User ${user.email} authenticated with role '${user.role.name}' (database: ${mongoose.connection.name})`);
    }

    // Update last login
    user.lastLogin = new Date();
    await user.save({ validateBeforeSave: false });

    req.user = user;
    next();
  } catch (error) {
    console.error('Error in protect middleware:', error);
    return res.status(401).json({
      success: false,
      message: 'Not authorized to access this route'
    });
  }
};

// Grant access to specific roles
const authorize = (...roles) => {
  return async (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: 'User not authenticated'
      });
    }

    // If role is not populated or is just an ObjectId, populate it
    let userRole = null;
    if (req.user.role) {
      if (typeof req.user.role === 'object' && req.user.role.name) {
        // Role is already populated
        userRole = req.user.role.name;
      } else {
        // Role is an ObjectId or null - try to fetch it
        try {
          const roleId = req.user.role._id || req.user.role;
          if (roleId) {
            const role = await Role.findById(roleId);
            if (role) {
              userRole = role.name;
              req.user.role = role; // Update for future use
            }
          }
        } catch (error) {
          console.error('Error fetching role in authorize middleware:', error);
        }
      }
    }

    if (!userRole) {
      return res.status(401).json({
        success: false,
        message: 'User role not found. Please contact administrator.'
      });
    }
    
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
      if (!req.user) {
        return res.status(401).json({
          success: false,
          message: 'User not authenticated'
        });
      }

      // Ensure role is populated
      let role = req.user.role;
      if (!role) {
        console.error(`❌ ERROR in checkPermission: User ${req.user.email} has no role`);
        return res.status(401).json({
          success: false,
          message: 'User role not found. Please contact administrator.'
        });
      }

      // If role is an ObjectId or not fully populated, fetch it
      if (!role.name) {
        const roleId = role._id || role;
        if (roleId) {
          try {
            role = await Role.findById(roleId).populate('permissions', 'name displayName');
            if (!role) {
              console.error(`❌ ERROR: Role ID ${roleId} not found in database '${mongoose.connection.name}' for user ${req.user.email}`);
              return res.status(401).json({
                success: false,
                message: 'User role not found in database. Please contact administrator.'
              });
            }
            req.user.role = role; // Update for future use
          } catch (error) {
            console.error(`❌ Error fetching role ${roleId} in checkPermission:`, error);
            return res.status(401).json({
              success: false,
              message: 'Error loading user role. Please try again.'
            });
          }
        } else {
          console.error(`❌ ERROR: Invalid role reference for user ${req.user.email}`);
          return res.status(401).json({
            success: false,
            message: 'User role configuration is invalid. Please contact administrator.'
          });
        }
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
