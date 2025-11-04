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

// Middleware - CORS must be first to handle OPTIONS preflight requests
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
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
  preflightContinue: false,
  optionsSuccessStatus: 204
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

// Global middleware to ensure DB connection for all API routes (except health checks and OPTIONS)
app.use('/api', async (req, res, next) => {
  // Skip DB check for:
  // 1. Health endpoint and root API endpoint
  // 2. OPTIONS requests (CORS preflight) - these don't need DB connection
  if (req.path === '/health' || req.path === '' || req.path === '/' || req.method === 'OPTIONS') {
    return next();
  }

  try {
    // Ensure JSON response header is set early
    res.setHeader('Content-Type', 'application/json');
    
    await dbConnection();
    next();
  } catch (error) {
    console.error('Database connection error in middleware:', error);
    console.error('DB Error stack:', error.stack);
    
    if (!res.headersSent) {
      // Set JSON header explicitly
      res.setHeader('Content-Type', 'application/json');
      return res.status(503).json({
        success: false,
        message: 'Database connection failed. Please try again later.',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  }
});

// API root route
app.get('/api', (req, res) => {
  res.status(200).json({
    success: true,
    message: 'Factory Management System API',
    version: '1.0.0',
    endpoints: {
      auth: '/api/admin/auth/login',
      products: '/api/products',
      expenses: '/api/expenses',
      reports: '/api/reports',
      admin: '/api/admin',
      health: '/api/health'
    }
  });
});

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
  console.error('Error in error handler:', err);
  console.error('Error stack:', err.stack);
  
  // Always try to send JSON, even if headers were partially sent
  try {
    if (!res.headersSent) {
      res.setHeader('Content-Type', 'application/json');
      return res.status(err.status || 500).json({
        success: false,
        message: err.message || 'Something went wrong!',
        error: process.env.NODE_ENV === 'development' ? err.message : 'Internal server error'
      });
    } else {
      // If headers were sent, try to end gracefully
      if (!res.finished) {
        return res.end();
      }
    }
  } catch (handlerError) {
    console.error('Error in error handler itself:', handlerError);
    // Last resort - try to end response
    if (!res.finished) {
      res.end();
    }
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

