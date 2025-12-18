const mongoose = require('mongoose');
require('dotenv').config();

const connectDB = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log('MongoDB Connected...');
  } catch (err) {
    console.error('Error connecting to MongoDB:', err.message);
    process.exit(1);
  }
};

const checkAdvances = async () => {
  try {
    await connectDB();
    
    const Expense = require('./src/models/Expense');
    
    console.log('\n=== Checking Labour Expenses with Advances ===\n');
  
  // Get all labour expenses
  const labourExpenses = await Expense.find({
    expenseCategory: 'labour'
  }).sort({ expenseDate: -1 });
  
  console.log(`Total labour expenses found: ${labourExpenses.length}\n`);
  
  // Show each expense details
  labourExpenses.forEach((exp, idx) => {
    console.log(`${idx + 1}. Date: ${new Date(exp.expenseDate).toLocaleDateString()}`);
    console.log(`   Expense ID: ${exp._id}`);
    console.log(`   Employee ID: ${exp.categorySpecific?.employeeId || 'N/A'}`);
    console.log(`   Total Amount: PKR${exp.amount}`);
    console.log(`   Advance Amount: PKR${exp.categorySpecific?.advanceAmount || 0}`);
    console.log(`   Remaining Amount: PKR${exp.categorySpecific?.remainingAmount || 0}`);
    console.log(`   Description: ${exp.description || 'N/A'}`);
    console.log(`   Full categorySpecific:`, JSON.stringify(exp.categorySpecific, null, 2));
    console.log('---');
  });
  
  // Check current month only
  const currentMonth = new Date();
  const startOfMonth = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), 1);
  const endOfMonth = new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 0);
  
  console.log(`\n=== Current Month (${startOfMonth.toLocaleDateString()} to ${endOfMonth.toLocaleDateString()}) ===\n`);
  
  const currentMonthExpenses = await Expense.find({
    expenseCategory: 'labour',
    expenseDate: { $gte: startOfMonth, $lte: endOfMonth }
  });
  
  console.log(`Current month labour expenses: ${currentMonthExpenses.length}\n`);
  
  currentMonthExpenses.forEach((exp, idx) => {
    console.log(`${idx + 1}. Date: ${new Date(exp.expenseDate).toLocaleDateString()}`);
    console.log(`   Employee ID: ${exp.categorySpecific?.employeeId || 'N/A'}`);
    console.log(`   Advance Amount: PKR${exp.categorySpecific?.advanceAmount || 0}`);
    console.log('---');
  });
  
  mongoose.connection.close();
  console.log('\nDatabase connection closed.');
  } catch (error) {
    console.error('Error:', error);
    mongoose.connection.close();
  }
};

checkAdvances();
