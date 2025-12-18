const mongoose = require('mongoose');
require('dotenv').config();

const checkTotals = async () => {
  await mongoose.connect(process.env.MONGO_URI);
  const Product = require('./src/models/Product');
  
  const transactions = await Product.find({
    clientName: 'Imran',
    productType: 'woods',
    transactionType: 'purchase'
  }).sort({ createdAt: 1 });
  
  let totalAmount = 0;
  let totalReceived = 0;
  let totalRemaining = 0;
  let totalWeight = 0;
  
  transactions.forEach(t => {
    totalAmount += t.totalAmount || 0;
    totalReceived += t.amountReceived || 0;
    totalRemaining += t.remainingAmount || 0;
    totalWeight += t.weight || 0;
  });
  
  console.log('Total Transactions:', transactions.length);
  console.log('Total Weight:', totalWeight, 'kg');
  console.log('Total Amount: PKR', totalAmount.toFixed(2));
  console.log('Amount Received: PKR', totalReceived.toFixed(2));
  console.log('Outstanding: PKR', totalRemaining.toFixed(2));
  
  mongoose.connection.close();
};

checkTotals();
