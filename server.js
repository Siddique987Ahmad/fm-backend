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
app.use(cors());
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:3000',
  credentials: true
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// MongoDB Connection
const dbConnection=require('./src/dbConnection/dbConnection')

// Connect to database
dbConnection();

// Routes
app.use('/api/products', productRoutes);
app.use('/api/expenses', expenseRoutes); // New expense routes
app.use('/api/reports', reportRoutes); // New report routes
app.use('/api/admin', adminRoutes); // Admin routes


// Health check route
app.get('/api/health', (req, res) => {
  res.status(200).json({
    success: true,
    message: 'Server is running!',
    timestamp: new Date().toISOString()
  });
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({
    success: false,
    message: 'Something went wrong!',
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


const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
  console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
});

