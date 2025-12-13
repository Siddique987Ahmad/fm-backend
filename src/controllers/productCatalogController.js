const ErrorResponse = require('../utils/errorResponse');
const asyncHandler = require('../middleware/async');
const ProductCatalog = require('../models/ProductCatalog');

// @desc    Get all products (catalog)
// @route   GET /api/admin/products
// @access  Private (Admin/Manager)
exports.getProducts = asyncHandler(async (req, res, next) => {
  const products = await ProductCatalog.find();
  res.status(200).json({ success: true, count: products.length, data: products });
});

// @desc    Get single product (catalog)
// @route   GET /api/admin/products/:id
// @access  Private (Admin/Manager)
exports.getProductById = asyncHandler(async (req, res, next) => {
  const product = await ProductCatalog.findById(req.params.id);

  if (!product) {
    return next(
      new ErrorResponse(`Product not found with id of ${req.params.id}`, 404)
    );
  }
  res.status(200).json({ success: true, data: product });
});

// @desc    Create new product (catalog)
// @route   POST /api/admin/products
// @access  Private (Admin)
exports.createProduct = asyncHandler(async (req, res, next) => {
  const { name, description, unit, pricePerUnit, allowedTransactions, enableNugCalculation } = req.body;
  
  console.log('Creating product with data:', { name, description, unit, pricePerUnit, allowedTransactions, enableNugCalculation });

  const product = await ProductCatalog.create({
    name,
    description,
    unit,
    pricePerUnit,
    allowedTransactions: allowedTransactions || ['sale', 'purchase'],
    enableNugCalculation: enableNugCalculation || false
  });

  console.log('Created product:', product);
  res.status(201).json({ success: true, data: product });
});

// @desc    Update product (catalog)
// @route   PUT /api/admin/products/:id
// @access  Private (Admin)
exports.updateProduct = asyncHandler(async (req, res, next) => {
  const { name, description, unit, pricePerUnit, allowedTransactions, enableNugCalculation } = req.body;
  
  console.log('Updating product with data:', { name, description, unit, pricePerUnit, allowedTransactions, enableNugCalculation });

  const product = await ProductCatalog.findByIdAndUpdate(
    req.params.id,
    { name, description, unit, pricePerUnit, allowedTransactions, enableNugCalculation },
    {
      new: true,
      runValidators: true
    }
  );

  if (!product) {
    return next(
      new ErrorResponse(`Product not found with id of ${req.params.id}`, 404)
    );
  }

  console.log('Updated product:', product);
  res.status(200).json({ success: true, data: product });
});

// @desc    Delete product (catalog)
// @route   DELETE /api/admin/products/:id
// @access  Private (Admin)
exports.deleteProduct = asyncHandler(async (req, res, next) => {
  const product = await ProductCatalog.findById(req.params.id);

  if (!product) {
    return next(
      new ErrorResponse(`Product not found with id of ${req.params.id}`, 404)
    );
  }

  await product.deleteOne();
  res.status(200).json({ success: true, data: {} });
});

// @desc    Get product catalog statistics
// @route   GET /api/admin/products/stats
// @access  Private (Admin/Manager)
exports.getProductStats = asyncHandler(async (req, res, next) => {
  const totalProducts = await ProductCatalog.countDocuments();
  const activeProducts = await ProductCatalog.countDocuments({ isActive: true });
  const inactiveProducts = totalProducts - activeProducts;

  res.status(200).json({
    success: true,
    data: {
      totalProducts,
      activeProducts,
      inactiveProducts
    }
  });
});

// @desc    Get all product types for dropdowns and forms
// @route   GET /api/admin/products/types
// @access  Private (Admin/Manager)
exports.getProductTypes = asyncHandler(async (req, res, next) => {
  const products = await ProductCatalog.find({ isActive: true }).select('name _id allowedTransactions');
  
  const productTypes = products.map(product => ({
    id: product._id,
    name: product.name,
    value: product.name.toLowerCase().replace(/\s+/g, '-'),
    allowedTransactions: product.allowedTransactions || ['sale', 'purchase']
  }));

  res.status(200).json({ success: true, data: productTypes });
});