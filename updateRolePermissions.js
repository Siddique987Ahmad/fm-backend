const mongoose = require('mongoose');
const dotenv = require('dotenv');
const Role = require('./src/models/Role');
const Permission = require('./src/models/Permission');
const { rolePermissions } = require('./src/utils/seedData');

// Load environment variables
dotenv.config();

const connectDB = async () => {
  try {
    const mongoUri = process.env.MONGO_URI || 'mongodb://localhost:27017/factory-management';
    await mongoose.connect(mongoUri);
    console.log('✅ MongoDB connected successfully');
  } catch (error) {
    console.error('❌ MongoDB connection failed:', error.message);
    process.exit(1);
  }
};

const updateRolePermissions = async () => {
  try {
    await connectDB();
    
    console.log('🔧 Updating role permissions...\n');
    
    // Get all permissions from database
    const allPermissions = await Permission.find({});
    console.log(`📋 Found ${allPermissions.length} permissions in database\n`);
    
    // Update each role with correct permission references
    for (const roleName of Object.keys(rolePermissions)) {
      const role = await Role.findOne({ name: roleName });
      
      if (!role) {
        console.log(`⚠️  Role '${roleName}' not found. Skipping...`);
        continue;
      }
      
      // Get permission names for this role
      const permissionNames = rolePermissions[roleName];
      
      // Find permission IDs
      const permissionIds = allPermissions
        .filter(perm => permissionNames.includes(perm.name))
        .map(perm => perm._id);
      
      if (permissionIds.length === 0) {
        console.log(`⚠️  No permissions found for role '${roleName}'. Expected: ${permissionNames.join(', ')}`);
        continue;
      }
      
      // Update role with permissions
      role.permissions = permissionIds;
      await role.save();
      
      await role.populate('permissions', 'name displayName');
      console.log(`✅ Updated role '${role.displayName}' with ${permissionIds.length} permissions:`);
      console.log(`   ${role.permissions.map(p => p.name).join(', ')}\n`);
    }
    
    console.log('🎉 Role permissions updated successfully!');
    process.exit(0);
  } catch (error) {
    console.error('❌ Failed to update role permissions:', error);
    process.exit(1);
  }
};

// Run the update function
updateRolePermissions();

