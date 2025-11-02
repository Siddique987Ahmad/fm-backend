// ===============================================
// utils/seedEmployees.js - Seed Employee Data
// ===============================================
const mongoose = require('mongoose');
const Employee = require('../models/Employee');
const User = require('../models/User');

// Sample employee data
const sampleEmployees = [
  {
    firstName: 'Ahmed',
    lastName: 'Khan',
    employeeId: 'EMP001',
    phone: '+91-9876543210',
    email: 'ahmed.khan@factory.com',
    department: 'Production',
    position: 'Production Manager',
    employeeType: 'permanent',
    salary: 45000,
    salaryType: 'monthly',
    address: {
      street: '123 Main Street',
      city: 'Mumbai',
      state: 'Maharashtra',
      zipCode: '400001',
      country: 'India'
    },
    emergencyContact: {
      name: 'Fatima Khan',
      relationship: 'Wife',
      phone: '+91-9876543211',
      email: 'fatima.khan@email.com'
    },
    notes: 'Experienced production manager with 5 years of experience'
  },
  {
    firstName: 'Priya',
    lastName: 'Sharma',
    employeeId: 'EMP002',
    phone: '+91-9876543212',
    email: 'priya.sharma@factory.com',
    department: 'Quality Control',
    position: 'QC Inspector',
    employeeType: 'permanent',
    salary: 35000,
    salaryType: 'monthly',
    address: {
      street: '456 Park Avenue',
      city: 'Delhi',
      state: 'Delhi',
      zipCode: '110001',
      country: 'India'
    },
    emergencyContact: {
      name: 'Raj Sharma',
      relationship: 'Brother',
      phone: '+91-9876543213',
      email: 'raj.sharma@email.com'
    },
    notes: 'Quality control specialist with attention to detail'
  },
  {
    firstName: 'Mohammed',
    lastName: 'Ali',
    employeeId: 'EMP003',
    phone: '+91-9876543214',
    email: 'mohammed.ali@factory.com',
    department: 'Maintenance',
    position: 'Maintenance Technician',
    employeeType: 'permanent',
    salary: 30000,
    salaryType: 'monthly',
    address: {
      street: '789 Industrial Area',
      city: 'Chennai',
      state: 'Tamil Nadu',
      zipCode: '600001',
      country: 'India'
    },
    emergencyContact: {
      name: 'Aisha Ali',
      relationship: 'Sister',
      phone: '+91-9876543215',
      email: 'aisha.ali@email.com'
    },
    notes: 'Skilled technician with expertise in machinery maintenance'
  },
  {
    firstName: 'Sunita',
    lastName: 'Patel',
    employeeId: 'EMP004',
    phone: '+91-9876543216',
    email: 'sunita.patel@factory.com',
    department: 'Packaging',
    position: 'Packaging Supervisor',
    employeeType: 'permanent',
    salary: 32000,
    salaryType: 'monthly',
    address: {
      street: '321 Factory Road',
      city: 'Ahmedabad',
      state: 'Gujarat',
      zipCode: '380001',
      country: 'India'
    },
    emergencyContact: {
      name: 'Vikram Patel',
      relationship: 'Husband',
      phone: '+91-9876543217',
      email: 'vikram.patel@email.com'
    },
    notes: 'Supervisor with excellent team management skills'
  },
  {
    firstName: 'Rajesh',
    lastName: 'Kumar',
    employeeId: 'EMP005',
    phone: '+91-9876543218',
    email: 'rajesh.kumar@factory.com',
    department: 'Transportation',
    position: 'Driver',
    employeeType: 'daily-wage',
    salary: 800,
    salaryType: 'daily',
    address: {
      street: '654 Transport Nagar',
      city: 'Bangalore',
      state: 'Karnataka',
      zipCode: '560001',
      country: 'India'
    },
    emergencyContact: {
      name: 'Lakshmi Kumar',
      relationship: 'Wife',
      phone: '+91-9876543219',
      email: 'lakshmi.kumar@email.com'
    },
    notes: 'Experienced driver with clean driving record'
  },
  {
    firstName: 'Anita',
    lastName: 'Singh',
    employeeId: 'EMP006',
    phone: '+91-9876543220',
    email: 'anita.singh@factory.com',
    department: 'Administration',
    position: 'Office Assistant',
    employeeType: 'temporary',
    salary: 25000,
    salaryType: 'monthly',
    address: {
      street: '987 Office Complex',
      city: 'Pune',
      state: 'Maharashtra',
      zipCode: '411001',
      country: 'India'
    },
    emergencyContact: {
      name: 'Arjun Singh',
      relationship: 'Father',
      phone: '+91-9876543221',
      email: 'arjun.singh@email.com'
    },
    notes: 'Temporary office assistant for administrative tasks'
  }
];

// Seed function
const seedEmployees = async () => {
  try {
    console.log('🌱 Starting employee seeding...');

    // Get admin user for createdBy field
    const adminUser = await User.findOne({ email: 'admin@factory.com' });
    if (!adminUser) {
      console.error('❌ Admin user not found. Please seed users first.');
      return;
    }

    // Clear existing employees
    await Employee.deleteMany({});
    console.log('🗑️  Cleared existing employees');

    // Create sample employees
    const employeesWithCreatedBy = sampleEmployees.map(employee => ({
      ...employee,
      createdBy: adminUser._id
    }));

    const createdEmployees = await Employee.insertMany(employeesWithCreatedBy);
    console.log(`✅ Created ${createdEmployees.length} employees`);

    // Display created employees
    console.log('\n📋 Created Employees:');
    createdEmployees.forEach(employee => {
      console.log(`   • ${employee.firstName} ${employee.lastName} (${employee.employeeId}) - ${employee.department}`);
    });

    console.log('\n🎉 Employee seeding completed successfully!');

  } catch (error) {
    console.error('❌ Error seeding employees:', error);
  }
};

// Run seeding if called directly
if (require.main === module) {
  // Connect to MongoDB
  mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/factory-management', {
    useNewUrlParser: true,
    useUnifiedTopology: true,
  })
  .then(() => {
    console.log('📦 Connected to MongoDB');
    return seedEmployees();
  })
  .then(() => {
    console.log('✅ Seeding completed');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Seeding failed:', error);
    process.exit(1);
  });
}

module.exports = seedEmployees;
