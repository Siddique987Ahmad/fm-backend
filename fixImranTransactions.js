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

const fixImranTransactions = async () => {
  try {
    await connectDB();
    
    const Product = require('./src/models/Product');
    
    console.log('\n🗑️  Deleting old Imran Wood transactions...\n');
    
    // Delete all Imran wood transactions
    const deleteResult = await Product.deleteMany({
      clientName: 'Imran',
      productType: 'woods'
    });
    
    console.log(`✅ Deleted ${deleteResult.deletedCount} old transactions\n`);
    
    console.log('📦 Adding corrected Imran Wood Transactions...\n');
    
    // Corrected transactions with exact dates and weights from PDF
    const transactions = [
      // Page 1
      { date: '2025-12-11', weight: 910, rate: 11.875, totalAmount: 10806.25, received: 2000, remaining: 8806.25 },
      { date: '2025-12-11', weight: 980, rate: 11.875, totalAmount: 11637.5, received: 2000, remaining: 9637.5 },
      { date: '2025-12-10', weight: 940, rate: 11.875, totalAmount: 11162.5, received: 2000, remaining: 9162.5 },
      { date: '2025-12-10', weight: 760, rate: 11.875, totalAmount: 9025, received: 2000, remaining: 7025 },
      { date: '2025-12-09', weight: 940, rate: 11.875, totalAmount: 11162.5, received: 2000, remaining: 9162.5 },
      { date: '2025-12-09', weight: 1010, rate: 11.875, totalAmount: 11993.75, received: 2000, remaining: 9993.75 },
      { date: '2025-12-07', weight: 810, rate: 11.875, totalAmount: 9618.75, received: 20000, remaining: -10381.25, status: 'Advance' },
      { date: '2025-12-07', weight: 860, rate: 11.875, totalAmount: 10212.5, received: 2000, remaining: 8212.5 },
      { date: '2025-12-06', weight: 890, rate: 11.875, totalAmount: 10568.75, received: 2000, remaining: 8568.75 },
      
      // Page 2
      { date: '2025-12-06', weight: 880, rate: 11.875, totalAmount: 10450, received: 2000, remaining: 8450 },
      { date: '2025-12-04', weight: 820, rate: 11.875, totalAmount: 9737.5, received: 17000, remaining: -7262.5, status: 'Advance' },
      { date: '2025-12-02', weight: 940, rate: 11.875, totalAmount: 11162.5, received: 2000, remaining: 9162.5 },
      { date: '2025-12-02', weight: 860, rate: 11.875, totalAmount: 10212.5, received: 2000, remaining: 8212.5 },
      { date: '2025-12-01', weight: 890, rate: 11.875, totalAmount: 10568.75, received: 102000, remaining: -91431.25, status: 'Advance' },
      { date: '2025-12-01', weight: 930, rate: 11.875, totalAmount: 11043.75, received: 2000, remaining: 9043.75 },
      { date: '2025-11-30', weight: 940, rate: 11.875, totalAmount: 11162.5, received: 2000, remaining: 9162.5 },
      { date: '2025-11-29', weight: 730, rate: 11.875, totalAmount: 8668.75, received: 2000, remaining: 6668.75 },
      { date: '2025-11-29', weight: 740, rate: 11.875, totalAmount: 8787.5, received: 2000, remaining: 6787.5 },
      { date: '2025-11-27', weight: 850, rate: 11.875, totalAmount: 10093.75, received: 7000, remaining: 3093.75 },
      { date: '2025-11-27', weight: 750, rate: 11.875, totalAmount: 9381.25, received: 2000, remaining: 7381.25 },
      { date: '2025-11-26', weight: 820, rate: 11.875, totalAmount: 9737.5, received: 2000, remaining: 7737.5 },
      
      // Page 3
      { date: '2025-11-25', weight: 890, rate: 11.875, totalAmount: 10568.75, received: 8000, remaining: 2568.75 },
      { date: '2025-11-25', weight: 670, rate: 11.875, totalAmount: 7956.25, received: 2000, remaining: 5956.25 },
      { date: '2025-11-25', weight: 910, rate: 11.875, totalAmount: 10806.25, received: 2000, remaining: 8806.25 },
      { date: '2025-11-25', weight: 870, rate: 11.875, totalAmount: 10331.25, received: 2000, remaining: 8331.25 },
      { date: '2025-11-25', weight: 710, rate: 11.875, totalAmount: 8431.25, received: 2000, remaining: 6431.25 },
      { date: '2025-11-25', weight: 900, rate: 11.875, totalAmount: 10687.5, received: 2000, remaining: 8687.5 },
      { date: '2025-11-25', weight: 840, rate: 11.875, totalAmount: 9975, received: 2000, remaining: 7975 },
      { date: '2025-11-25', weight: 910, rate: 11.875, totalAmount: 10806.25, received: 2000, remaining: 8806.25 },
      { date: '2025-11-25', weight: 870, rate: 11.875, totalAmount: 10331.25, received: 2000, remaining: 8331.25 },
      { date: '2025-11-25', weight: 860, rate: 11.875, totalAmount: 10212.5, received: 2000, remaining: 8212.5 },
      
      // Page 4
      { date: '2025-11-25', weight: 870, rate: 11.875, totalAmount: 10331.25, received: 2000, remaining: 8331.25 },
      { date: '2025-11-25', weight: 790, rate: 11.875, totalAmount: 9381.25, received: 2000, remaining: 7381.25 },
      { date: '2025-11-25', weight: 830, rate: 11.875, totalAmount: 9856.25, received: 2000, remaining: 7856.25 },
      { date: '2025-11-25', weight: 910, rate: 11.875, totalAmount: 10806.25, received: 2000, remaining: 8806.25 },
      { date: '2025-11-25', weight: 890, rate: 11.875, totalAmount: 10568.75, received: 2000, remaining: 8568.75 },
      { date: '2025-11-25', weight: 920, rate: 11.875, totalAmount: 10925, received: 2000, remaining: 8925 },
      { date: '2025-11-25', weight: 890, rate: 11.875, totalAmount: 10568.75, received: 2000, remaining: 8568.75 },
      { date: '2025-11-25', weight: 880, rate: 11.875, totalAmount: 10450, received: 2000, remaining: 8450 },
      { date: '2025-11-25', weight: 866, rate: 11.875, totalAmount: 10283.75, received: 2000, remaining: 8283.75 },
      { date: '2025-11-25', weight: 1080, rate: 11.875, totalAmount: 12825, received: 2000, remaining: 10825 },
    ];
    
    let successCount = 0;
    let failCount = 0;
    
    for (const transaction of transactions) {
      try {
        // For advance status, use absolute value since model doesn't allow negative
        const remaining = transaction.status === 'Advance' ? Math.abs(transaction.remaining) : transaction.remaining;
        
        const productData = {
          clientName: 'Imran',
          productType: 'woods',
          transactionType: 'purchase',
          weight: transaction.weight,
          rate: transaction.rate,
          remainingAmount: remaining,
          totalBalance: remaining,
          paymentStatus: transaction.status === 'Advance' ? 'advance' : (transaction.remaining > 0 ? 'pending' : 'full'),
          notes: 'Restored transaction - Originally from November-December 2025',
          createdAt: new Date(transaction.date),  // Set the transaction date as createdAt
          updatedAt: new Date(transaction.date)
        };
        
        const product = new Product(productData);
        await product.save();
        
        successCount++;
        console.log(`✅ ${successCount}. Added: ${transaction.date} - ${transaction.weight}kg - PKR${transaction.totalAmount.toLocaleString()}`);
      } catch (error) {
        failCount++;
        console.error(`❌ Failed to add transaction for ${transaction.date}:`, error.message);
      }
    }
    
    console.log('\n📊 Restoration Summary:');
    console.log(`   ✅ Successfully restored: ${successCount} transactions`);
    console.log(`   ❌ Failed: ${failCount} transactions`);
    console.log(`   📦 Total: ${transactions.length} transactions\n`);
    
    // Show updated totals for Imran
    const imranTransactions = await Product.find({
      clientName: 'Imran',
      productType: 'woods',
      transactionType: 'purchase'
    }).sort({ transactionDate: -1 });
    
    const totalWeight = imranTransactions.reduce((sum, t) => sum + t.weight, 0);
    const totalAmount = imranTransactions.reduce((sum, t) => sum + (t.weight * t.rate), 0);
    const totalRemaining = imranTransactions.reduce((sum, t) => sum + t.remainingAmount, 0);
    const totalReceived = totalAmount - totalRemaining;
    
    console.log('📈 Imran\'s Corrected Wood Transactions Summary:');
    console.log(`   Total Transactions: ${imranTransactions.length}`);
    console.log(`   Total Weight: ${totalWeight}kg`);
    console.log(`   Total Amount: PKR${totalAmount.toLocaleString()}`);
    console.log(`   Amount Received: PKR${totalReceived.toLocaleString()}`);
    console.log(`   Outstanding: PKR${totalRemaining.toLocaleString()}\n`);
    
    mongoose.connection.close();
    console.log('✅ Database connection closed.\n');
    
  } catch (error) {
    console.error('❌ Error:', error);
    mongoose.connection.close();
  }
};

fixImranTransactions();
