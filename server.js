// ===============================================
// server.js - Main Server File
// ===============================================
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const dotenv = require('dotenv');

// Import routes
const productRoutes = require('./src/routes/productRoutes');
const expenseRoutes = require('./src/routes/expenseRoutes'); // New expense routes
const reportRoutes = require('./src/routes/reportRoutes'); // New report routes
const adminRoutes = require('./src/routes/adminRoutes'); // Admin routes

// Load environment variables
dotenv.config();

const app = express();

// Middleware
app.use(cors({
  origin: [
    'http://localhost:5173',
    'http://localhost:3000',
    'https://fm-ashen-eta.vercel.app'
  ],
  credentials: true
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// MongoDB Connection
const dbConnection = require('./src/dbConnection/dbConnection');

// Middleware to ensure DB connection before handling requests
app.use(async (req, res, next) => {
  try {
    await dbConnection();
    next();
  } catch (error) {
    console.error('Database connection error:', error);
    res.status(500).json({
      success: false,
      message: 'Database connection failed',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  }
});

// Routes
app.use('/api/products', productRoutes);
app.use('/api/expenses', expenseRoutes);
app.use('/api/reports', reportRoutes);
app.use('/api/admin', adminRoutes);

// Health check route
app.get('/api/health', async (req, res) => {
  try {
    await dbConnection();
    res.status(200).json({
      success: true,
      message: 'Server is running!',
      timestamp: new Date().toISOString(),
      database: 'connected'
    });
  } catch (error) {
    res.status(503).json({
      success: false,
      message: 'Database connection failed',
      timestamp: new Date().toISOString()
    });
  }
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('Error:', err.stack);
  res.status(err.status || 500).json({
    success: false,
    message: err.message || 'Something went wrong!',
    error: process.env.NODE_ENV === 'development' ? err.message : 'Internal server error'
  });
});

// Handle 404 routes
app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: 'Route not found'
  });
});

// Export for Vercel serverless functions
module.exports = app;

// Only listen if running locally (not in Vercel serverless environment)
// Vercel will automatically use the exported app
if (!process.env.VERCEL) {
  const PORT = process.env.PORT || 5000;
  app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
    console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
  });
} else {
  console.log('Running in Vercel serverless environment');
}

