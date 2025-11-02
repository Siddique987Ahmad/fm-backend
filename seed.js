const mongoose = require('mongoose');
const dotenv = require('dotenv');
const { seedData, isSeeded } = require('./src/utils/seedData');

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

const runSeed = async () => {
  try {
    await connectDB();
    
    const seeded = await isSeeded();
    
    if (seeded) {
      console.log('⏭️  Database is already seeded. Skipping...');
      console.log('💡 If you want to re-seed, delete the existing data first.');
    } else {
      await seedData();
    }
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Seeding failed:', error);
    process.exit(1);
  }
};

// Run the seed function
runSeed();
