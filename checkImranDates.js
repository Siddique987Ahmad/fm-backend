const mongoose = require('mongoose');
require('dotenv').config();

const connectDB = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log('✅ MongoDB Connected...');
  } catch (err) {
    console.error('❌ Error connecting to MongoDB:', err.message);
    process.exit(1);
  }
};

const checkDates = async () => {
  try {
    await connectDB();
    
    const Product = require('./src/models/Product');
    
    console.log('\n📅 Checking Imran\'s Transaction Dates...\n');
    
    const transactions = await Product.find({
      clientName: 'Imran',
      productType: 'woods'
    }).sort({ transactionDate: -1 }).select('transactionDate weight totalAmount createdAt');
    
    console.log(`Found ${transactions.length} transactions:\n`);
    
    transactions.forEach((t, idx) => {
      console.log(`${idx + 1}. Transaction Date: ${new Date(t.transactionDate).toLocaleDateString('en-GB')}`);
      console.log(`   Weight: ${t.weight}kg`);
      console.log(`   Amount: PKR${t.totalAmount}`);
      console.log(`   Created At: ${new Date(t.createdAt).toLocaleString('en-GB')}`);
      console.log('---');
    });
    
    mongoose.connection.close();
    console.log('\n✅ Database connection closed.\n');
    
  } catch (error) {
    console.error('❌ Error:', error);
    mongoose.connection.close();
  }
};

checkDates();
