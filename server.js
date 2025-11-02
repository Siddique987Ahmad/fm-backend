// ===============================================
// server.js - Main Server File
// ===============================================
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const dotenv = require('dotenv');

// Load environment variables first
dotenv.config();

const app = express();

// Import routes
const productRoutes = require('./src/routes/productRoutes');
const expenseRoutes = require('./src/routes/expenseRoutes');
const reportRoutes = require('./src/routes/reportRoutes');
const adminRoutes = require('./src/routes/adminRoutes');

// Middleware
app.use(cors({
  origin: function (origin, callback) {
    // Allow requests with no origin (mobile apps, Postman, etc.)
    if (!origin) return callback(null, true);
    
    const allowedOrigins = [
      'http://localhost:5173',
      'http://localhost:3000',
      'https://fm-ashen-eta.vercel.app',
      'https://fm-frontend-seven.vercel.app'
    ];
    
    // Allow all Vercel preview deployments
    if (origin.endsWith('.vercel.app')) {
      return callback(null, true);
    }
    
    if (allowedOrigins.indexOf(origin) !== -1 || !origin) {
      callback(null, true);
    } else {
      callback(null, true); // Allow all origins for now - restrict in production if needed
    }
  },
  credentials: true
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Middleware to ensure JSON responses
app.use((req, res, next) => {
  // Store original json method
  const originalJson = res.json;
  
  // Override json to ensure it's always called
  res.json = function(data) {
    res.setHeader('Content-Type', 'application/json');
    return originalJson.call(this, data);
  };
  
  next();
});

// MongoDB Connection (lazy load - only connect when needed)
const dbConnection = require('./src/dbConnection/dbConnection');

// Optional: Connect DB on startup (non-blocking)
if (process.env.NODE_ENV === 'production' || process.env.VERCEL) {
  // In production, try to establish connection early (non-blocking)
  dbConnection().catch(err => {
    console.error('Initial DB connection attempt failed (will retry on request):', err.message);
  });
}

// Routes
app.use('/api/products', productRoutes);
app.use('/api/expenses', expenseRoutes);
app.use('/api/reports', reportRoutes);
app.use('/api/admin', adminRoutes);

// Health check without DB dependency (before 404 handler)
app.get('/', (req, res) => {
  res.status(200).json({
    success: true,
    message: 'API is running',
    timestamp: new Date().toISOString()
  });
});

// Health check route with DB check
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
      timestamp: new Date().toISOString(),
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// Error handling middleware (must be before 404 handler)
app.use((err, req, res, next) => {
  console.error('Error:', err.stack || err.message);
  
  // Ensure JSON response even if headers were partially sent
  if (!res.headersSent) {
    res.setHeader('Content-Type', 'application/json');
    res.status(err.status || 500).json({
      success: false,
      message: err.message || 'Something went wrong!',
      error: process.env.NODE_ENV === 'development' ? err.message : 'Internal server error'
    });
  } else {
    // If headers were sent, end the response
    res.end();
  }
});

// Handle 404 routes (must be last)
app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: 'Route not found'
  });
});

// Export for Vercel serverless functions
// @vercel/node automatically handles Express apps
module.exports = app;

// Only listen if running locally (not in Vercel serverless environment)
if (!process.env.VERCEL) {
  const PORT = process.env.PORT || 5000;
  app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
    console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
  });
} else {
  console.log('Running in Vercel serverless environment');
}

