// Script to fix remaining amount for existing labour expenses
require('dotenv').config();
const mongoose = require('mongoose');
const Expense = require('./src/models/Expense');

async function fixLabourRemainingAmounts() {
  try {
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGO_URI);
    console.log('Connected to MongoDB');

    // Find all labour expenses
    const labourExpenses = await Expense.find({
      expenseCategory: 'labour',
      'categorySpecific.advanceAmount': { $exists: true }
    });

    console.log(`Found ${labourExpenses.length} labour expenses to update`);

    let updatedCount = 0;

    // Update each expense
    for (const expense of labourExpenses) {
      const totalAmount = expense.amount || 0;
      const advanceAmount = expense.categorySpecific.advanceAmount || 0;
      const correctRemainingAmount = Math.max(0, totalAmount - advanceAmount);
      
      console.log(`\nExpense ID: ${expense._id}`);
      console.log(`  Employee: ${expense.categorySpecific.employeeName || expense.title}`);
      console.log(`  Total Amount: ${totalAmount}`);
      console.log(`  Advance Amount: ${advanceAmount}`);
      console.log(`  Current Remaining: ${expense.categorySpecific.remainingAmount}`);
      console.log(`  Correct Remaining: ${correctRemainingAmount}`);

      if (expense.categorySpecific.remainingAmount !== correctRemainingAmount) {
        expense.categorySpecific.remainingAmount = correctRemainingAmount;
        await expense.save();
        updatedCount++;
        console.log(`  ✓ Updated`);
      } else {
        console.log(`  ✓ Already correct`);
      }
    }

    console.log(`\n✅ Fixed ${updatedCount} out of ${labourExpenses.length} labour expenses`);
    
    await mongoose.connection.close();
    console.log('Database connection closed');
  } catch (error) {
    console.error('Error fixing labour expenses:', error);
    process.exit(1);
  }
}

// Run the script
fixLabourRemainingAmounts();
