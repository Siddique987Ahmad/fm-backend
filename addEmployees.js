const mongoose = require('mongoose');
require('dotenv').config();

const addEmployees = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log('✅ MongoDB Connected...\n');
    
    const Employee = require('./src/models/Employee');
    const User = require('./src/models/User');
    
    // Get any user as createdBy
    const adminUser = await User.findOne();
    if (!adminUser) {
      console.error('❌ No user found in database. Please create a user first.');
      mongoose.connection.close();
      return;
    }
    
    console.log(`📝 Using user: ${adminUser.username || adminUser.email}\n`);
    
    const employees = [
      {
        firstName: 'Fayyaz',
        lastName: 'Ali',
        employeeId: 'EMP-GM-001',
        department: 'Management',
        position: 'G.M',
        employeeType: 'permanent',
        salary: 37000,
        salaryType: 'monthly',
        hireDate: new Date('2025-01-01'),
        phone: '0300-0000001',
        isActive: true
      },
      {
        firstName: 'Sohail',
        lastName: 'Ahmed',
        employeeId: 'EMP-LAB-001',
        department: 'Production',
        position: 'Labor',
        employeeType: 'permanent',
        salary: 37000,
        salaryType: 'monthly',
        hireDate: new Date('2025-01-01'),
        phone: '0300-0000002',
        isActive: true
      },
      {
        firstName: 'Tariq',
        lastName: 'Khan',
        employeeId: 'EMP-WEL-001',
        department: 'Production',
        position: 'Welder',
        employeeType: 'permanent',
        salary: 30000,
        salaryType: 'monthly',
        hireDate: new Date('2025-01-01'),
        phone: '0300-0000003',
        isActive: true
      },
      {
        firstName: 'Mujtaba',
        lastName: 'Ali',
        employeeId: 'EMP-PRD-001',
        department: 'Production',
        position: 'Worker',
        employeeType: 'permanent',
        salary: 37000,
        salaryType: 'monthly',
        hireDate: new Date('2025-01-01'),
        phone: '0300-0000004',
        isActive: true
      },
      {
        firstName: 'Umar',
        lastName: 'Hassan',
        employeeId: 'EMP-PRD-002',
        department: 'Production',
        position: 'Worker',
        employeeType: 'permanent',
        salary: 40000,
        salaryType: 'monthly',
        hireDate: new Date('2025-01-01'),
        phone: '0300-0000005',
        isActive: true
      },
      {
        firstName: 'Sohail',
        lastName: 'Mahmood',
        employeeId: 'EMP-DRV-001',
        department: 'Transport',
        position: 'Assistant Driver',
        employeeType: 'permanent',
        salary: 20000,
        salaryType: 'monthly',
        hireDate: new Date('2025-01-01'),
        phone: '0300-0000006',
        isActive: true
      },
      {
        firstName: 'Hassan',
        lastName: 'Ali',
        employeeId: 'EMP-PRD-003',
        department: 'Production',
        position: 'Worker',
        employeeType: 'permanent',
        salary: 30000,
        salaryType: 'monthly',
        hireDate: new Date('2025-01-01'),
        phone: '0300-0000007',
        isActive: true
      },
      {
        firstName: 'Ali',
        lastName: 'Iftikhar',
        employeeId: 'EMP-MGR-001',
        department: 'Management',
        position: 'Manager',
        employeeType: 'permanent',
        salary: 30000,
        salaryType: 'monthly',
        hireDate: new Date('2025-01-01'),
        phone: '0300-0000008',
        isActive: true
      },
      {
        firstName: 'Khalil',
        lastName: 'Ahmad',
        employeeId: 'EMP-PRD-004',
        department: 'Production',
        position: 'Worker',
        employeeType: 'permanent',
        salary: 37000,
        salaryType: 'monthly',
        hireDate: new Date('2025-01-01'),
        phone: '0300-0000009',
        isActive: true
      },
      {
        firstName: 'Salman',
        lastName: 'Khan',
        employeeId: 'EMP-DRV-002',
        department: 'Transport',
        position: 'Driver',
        employeeType: 'permanent',
        salary: 37000,
        salaryType: 'monthly',
        hireDate: new Date('2025-01-01'),
        phone: '0300-0000010',
        isActive: true
      }
    ];
    
    let successCount = 0;
    let failCount = 0;
    
    console.log('📝 Adding 10 Permanent Employees...\n');
    
    for (const empData of employees) {
      try {
        empData.createdBy = adminUser._id;
        const employee = new Employee(empData);
        await employee.save();
        successCount++;
        console.log(`✅ ${successCount}. Added: ${empData.firstName} ${empData.lastName} - ${empData.position} - PKR ${empData.salary.toLocaleString()}/month`);
      } catch (error) {
        failCount++;
        console.error(`❌ Failed to add ${empData.firstName} ${empData.lastName}:`, error.message);
      }
    }
    
    console.log(`\n📊 Summary:`);
    console.log(`   ✅ Successfully added: ${successCount} employees`);
    console.log(`   ❌ Failed: ${failCount} employees`);
    console.log(`   📦 Total: ${employees.length} employees\n`);
    
    // Show all employees
    const allEmployees = await Employee.find({ isActive: true }).sort({ employeeId: 1 });
    console.log(`\n📋 Total Active Employees in Database: ${allEmployees.length}\n`);
    
    mongoose.connection.close();
    console.log('✅ Database connection closed.\n');
    
  } catch (error) {
    console.error('❌ Error:', error.message);
    mongoose.connection.close();
  }
};

addEmployees();
