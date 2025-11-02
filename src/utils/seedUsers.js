const mongoose = require('mongoose');
const dotenv = require('dotenv');
const User = require('../models/User');
const Role = require('../models/Role');
const dbConnection = require('../dbConnection/dbConnection');

dotenv.config({ path: './.env' });

const seedAdditionalUsers = async () => {
  await dbConnection(); // Ensure DB connection

  console.log('🌱 Seeding additional users...');

  try {
    // Get existing roles
    const roles = await Role.find();
    const managerRole = roles.find(role => role.name === 'manager');
    const employeeRole = roles.find(role => role.name === 'employee');

    if (!managerRole || !employeeRole) {
      throw new Error('Required roles not found! Please run the main seed script first.');
    }

    // Get admin user for createdBy field
    const adminUser = await User.findOne({ email: 'admin@factory.com' });
    if (!adminUser) {
      throw new Error('Admin user not found! Please run the main seed script first.');
    }

    // Additional users data
    const usersData = [
      {
        firstName: 'John',
        lastName: 'Manager',
        email: 'manager@factory.com',
        password: 'manager123',
        role: managerRole._id,
        employeeId: 'MGR001',
        department: 'Operations',
        position: 'Operations Manager',
        isActive: true,
        createdBy: adminUser._id
      },
      {
        firstName: 'Sarah',
        lastName: 'Employee',
        email: 'employee@factory.com',
        password: 'employee123',
        role: employeeRole._id,
        employeeId: 'EMP001',
        department: 'Production',
        position: 'Production Worker',
        isActive: true,
        createdBy: adminUser._id
      },
      {
        firstName: 'Lisa',
        lastName: 'Assistant',
        email: 'lisa@factory.com',
        password: 'lisa123',
        role: employeeRole._id,
        employeeId: 'EMP002',
        department: 'Sales',
        position: 'Sales Assistant',
        isActive: true,
        createdBy: adminUser._id
      },
      {
        firstName: 'David',
        lastName: 'Supervisor',
        email: 'david@factory.com',
        password: 'david123',
        role: managerRole._id,
        employeeId: 'MGR002',
        department: 'Quality Control',
        position: 'QC Supervisor',
        isActive: true,
        createdBy: adminUser._id
      }
    ];

    // Check if users already exist
    for (const userData of usersData) {
      const existingUser = await User.findOne({ email: userData.email });
      if (existingUser) {
        console.log(`⚠️  User ${userData.email} already exists, skipping...`);
        continue;
      }

      const user = await User.create(userData);
      console.log(`✅ Created user: ${user.email} (password: ${userData.password})`);
    }

    console.log('🎉 Additional users seeding completed successfully!');
    console.log('\n🔑 Additional User Credentials:');
    console.log('Manager: manager@factory.com / manager123');
    console.log('Employee: employee@factory.com / employee123');
    console.log('Viewer: viewer@factory.com / viewer123');
    console.log('Lisa: lisa@factory.com / lisa123');
    console.log('David: david@factory.com / david123');

  } catch (error) {
    console.error('❌ Additional users seeding failed:', error);
    process.exit(1);
  } finally {
    mongoose.connection.close();
  }
};

module.exports = seedAdditionalUsers;
