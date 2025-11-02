const mongoose = require('mongoose');
const Role = require('../models/Role');
const Permission = require('../models/Permission');
const User = require('../models/User');

// Default permissions
const defaultPermissions = [
  // User Management
  { name: 'create_user', displayName: 'Create User', description: 'Add new users', category: 'user_management', action: 'create', resource: 'user', isSystemPermission: true },
  { name: 'read_user', displayName: 'View Users', description: 'View user information', category: 'user_management', action: 'read', resource: 'user', isSystemPermission: true },
  { name: 'update_user', displayName: 'Update User', description: 'Edit user information', category: 'user_management', action: 'update', resource: 'user', isSystemPermission: true },
  { name: 'delete_user', displayName: 'Delete User', description: 'Remove users', category: 'user_management', action: 'delete', resource: 'user', isSystemPermission: true },
  
  // Role Management
  { name: 'create_role', displayName: 'Create Role', description: 'Add new roles', category: 'role_management', action: 'create', resource: 'role', isSystemPermission: true },
  { name: 'read_role', displayName: 'View Roles', description: 'View role information', category: 'role_management', action: 'read', resource: 'role', isSystemPermission: true },
  { name: 'update_role', displayName: 'Update Role', description: 'Edit role information', category: 'role_management', action: 'update', resource: 'role', isSystemPermission: true },
  { name: 'delete_role', displayName: 'Delete Role', description: 'Remove roles', category: 'role_management', action: 'delete', resource: 'role', isSystemPermission: true },
  
  // Permission Management
  { name: 'create_permission', displayName: 'Create Permission', description: 'Add new permissions', category: 'permission_management', action: 'create', resource: 'permission', isSystemPermission: true },
  { name: 'read_permission', displayName: 'View Permissions', description: 'View permission information', category: 'permission_management', action: 'read', resource: 'permission', isSystemPermission: true },
  { name: 'update_permission', displayName: 'Update Permission', description: 'Edit permission information', category: 'permission_management', action: 'update', resource: 'permission', isSystemPermission: true },
  { name: 'delete_permission', displayName: 'Delete Permission', description: 'Remove permissions', category: 'permission_management', action: 'delete', resource: 'permission', isSystemPermission: true },
  
  // Product Management
  { name: 'create_product', displayName: 'Create Product', description: 'Add new products', category: 'product_management', action: 'create', resource: 'product', isSystemPermission: true },
  { name: 'read_product', displayName: 'View Products', description: 'View product information', category: 'product_management', action: 'read', resource: 'product', isSystemPermission: true },
  { name: 'update_product', displayName: 'Update Product', description: 'Edit product information', category: 'product_management', action: 'update', resource: 'product', isSystemPermission: true },
  { name: 'delete_product', displayName: 'Delete Product', description: 'Remove products', category: 'product_management', action: 'delete', resource: 'product', isSystemPermission: true },
  
  // Transaction Management
  { name: 'create_transaction', displayName: 'Create Transaction', description: 'Add new transactions', category: 'transaction_management', action: 'create', resource: 'transaction', isSystemPermission: true },
  { name: 'read_transaction', displayName: 'View Transactions', description: 'View transaction information', category: 'transaction_management', action: 'read', resource: 'transaction', isSystemPermission: true },
  { name: 'update_transaction', displayName: 'Update Transaction', description: 'Edit transaction information', category: 'transaction_management', action: 'update', resource: 'transaction', isSystemPermission: true },
  { name: 'delete_transaction', displayName: 'Delete Transaction', description: 'Remove transactions', category: 'transaction_management', action: 'delete', resource: 'transaction', isSystemPermission: true },
  
  // Expense Management
  { name: 'create_expense', displayName: 'Create Expense', description: 'Add new expenses', category: 'expense_management', action: 'create', resource: 'expense', isSystemPermission: true },
  { name: 'read_expense', displayName: 'View Expenses', description: 'View expense information', category: 'expense_management', action: 'read', resource: 'expense', isSystemPermission: true },
  { name: 'update_expense', displayName: 'Update Expense', description: 'Edit expense information', category: 'expense_management', action: 'update', resource: 'expense', isSystemPermission: true },
  { name: 'delete_expense', displayName: 'Delete Expense', description: 'Remove expenses', category: 'expense_management', action: 'delete', resource: 'expense', isSystemPermission: true },
  
  // Report Management
  { name: 'read_report', displayName: 'View Reports', description: 'View system reports', category: 'report_management', action: 'read', resource: 'report', isSystemPermission: true },
  { name: 'create_report', displayName: 'Create Report', description: 'Generate custom reports', category: 'report_management', action: 'create', resource: 'report', isSystemPermission: true },
  
  // System Settings
  { name: 'manage_system', displayName: 'Manage System', description: 'Access system settings', category: 'system_settings', action: 'manage', resource: 'system', isSystemPermission: true },
  
  // Audit Logs
  { name: 'view_audit_logs', displayName: 'View Audit Logs', description: 'View system audit logs', category: 'audit_logs', action: 'view', resource: 'audit', isSystemPermission: true }
];

// Default roles with their permissions
const defaultRoles = [
  {
    name: 'super-admin',
    displayName: 'Super Administrator',
    description: 'Full system access with all permissions',
    color: '#DC2626',
    priority: 100,
    isSystemRole: true,
    permissions: [] // Will be populated with all permissions
  },
  {
    name: 'admin',
    displayName: 'Administrator',
    description: 'Administrative access with most permissions',
    color: '#7C3AED',
    priority: 90,
    isSystemRole: true,
    permissions: [] // Will be populated with most permissions
  },
  {
    name: 'manager',
    displayName: 'Manager',
    description: 'Management access with limited administrative permissions',
    color: '#059669',
    priority: 80,
    isSystemRole: true,
    permissions: [] // Will be populated with manager permissions
  },
  {
    name: 'employee',
    displayName: 'Employee',
    description: 'Basic employee access with limited permissions',
    color: '#2563EB',
    priority: 70,
    isSystemRole: true,
    permissions: [] // Will be populated with employee permissions
  },
];

// Permission sets for each role
const rolePermissions = {
  'super-admin': [
    'create_user', 'read_user', 'update_user', 'delete_user',
    'create_role', 'read_role', 'update_role', 'delete_role',
    'create_permission', 'read_permission', 'update_permission', 'delete_permission',
    'create_product', 'read_product', 'update_product', 'delete_product',
    'create_transaction', 'read_transaction', 'update_transaction', 'delete_transaction',
    'create_expense', 'read_expense', 'update_expense', 'delete_expense',
    'read_report', 'create_report',
    'manage_system',
    'view_audit_logs'
  ],
  'admin': [
    'create_user', 'read_user', 'update_user', 'delete_user',
    'read_role', 'update_role',
    'read_permission',
    'create_product', 'read_product', 'update_product', 'delete_product',
    'create_transaction', 'read_transaction', 'update_transaction', 'delete_transaction',
    'create_expense', 'read_expense', 'update_expense', 'delete_expense',
    'read_report', 'create_report',
    'view_audit_logs'
  ],
  'manager': [
    'read_user', 'update_user',
    'read_role',
    'create_product', 'read_product', 'update_product',
    'create_transaction', 'read_transaction', 'update_transaction',
    'create_expense', 'read_expense', 'update_expense',
    'read_report'
  ],
  'employee': [
    'read_user',
    'read_product',
    'create_transaction', 'read_transaction', 'update_transaction',
    'create_expense', 'read_expense', 'update_expense',
    'read_report'
  ]
};

// Seed function
const seedData = async () => {
  try {
    console.log('🌱 Starting database seeding...');

    // Clear existing data (optional - comment out if you want to keep existing data)
    // await Permission.deleteMany({});
    // await Role.deleteMany({});

    // Create permissions
    console.log('📝 Creating permissions...');
    const createdPermissions = [];
    
    for (const permData of defaultPermissions) {
      const existingPermission = await Permission.findOne({ name: permData.name });
      
      if (!existingPermission) {
        const permission = new Permission({
          ...permData,
          createdBy: new mongoose.Types.ObjectId() // Temporary ID for seeding
        });
        await permission.save();
        createdPermissions.push(permission);
        console.log(`✅ Created permission: ${permission.displayName}`);
      } else {
        createdPermissions.push(existingPermission);
        console.log(`⏭️  Permission already exists: ${existingPermission.displayName}`);
      }
    }

    // Create roles
    console.log('👥 Creating roles...');
    const createdRoles = [];
    
    for (const roleData of defaultRoles) {
      const existingRole = await Role.findOne({ name: roleData.name });
      
      if (!existingRole) {
        // Get permission IDs for this role
        const permissionNames = rolePermissions[roleData.name] || [];
        const permissionIds = createdPermissions
          .filter(perm => permissionNames.includes(perm.name))
          .map(perm => perm._id);

        const role = new Role({
          ...roleData,
          permissions: permissionIds,
          createdBy: new mongoose.Types.ObjectId() // Temporary ID for seeding
        });
        
        await role.save();
        await role.populate('permissions', 'name displayName');
        createdRoles.push(role);
        console.log(`✅ Created role: ${role.displayName} with ${permissionIds.length} permissions`);
      } else {
        createdRoles.push(existingRole);
        console.log(`⏭️  Role already exists: ${existingRole.displayName}`);
      }
    }

    // Create default admin user
    console.log('👤 Creating default admin user...');
    const adminRole = createdRoles.find(role => role.name === 'super-admin');
    
    if (adminRole) {
      const existingAdmin = await User.findOne({ email: 'admin@factory.com' });
      
      if (!existingAdmin) {
        const adminUser = new User({
          firstName: 'System',
          lastName: 'Administrator',
          email: 'admin@factory.com',
          password: 'admin123', // This will be hashed by the pre-save middleware
          employeeId: 'ADMIN001',
          department: 'IT',
          position: 'System Administrator',
          role: adminRole._id,
          isActive: true,
          isEmailVerified: true,
          createdBy: new mongoose.Types.ObjectId() // Temporary ID for seeding
        });
        
        await adminUser.save();
        console.log(`✅ Created admin user: ${adminUser.email} (password: admin123)`);
      } else {
        console.log(`⏭️  Admin user already exists: ${existingAdmin.email}`);
      }
    }

    console.log('🎉 Database seeding completed successfully!');
    console.log('\n📋 Summary:');
    console.log(`- ${createdPermissions.length} permissions created`);
    console.log(`- ${createdRoles.length} roles created`);
    console.log('- Default admin user created');
    console.log('\n🔑 Admin Login Credentials:');
    console.log('Email: admin@factory.com');
    console.log('Password: admin123');
    console.log('\n⚠️  Please change the default admin password after first login!');

  } catch (error) {
    console.error('❌ Error seeding database:', error);
    throw error;
  }
};

// Function to check if database is seeded
const isSeeded = async () => {
  try {
    const permissionCount = await Permission.countDocuments();
    const roleCount = await Role.countDocuments();
    const userCount = await User.countDocuments();
    
    return permissionCount > 0 && roleCount > 0 && userCount > 0;
  } catch (error) {
    return false;
  }
};

module.exports = {
  seedData,
  isSeeded,
  defaultPermissions,
  defaultRoles,
  rolePermissions
};
