const mongoose = require('mongoose');
const ProductCatalog = require('../models/ProductCatalog');

// Product types from the current enum in Product.js
const productTypes = [
  {
    name: 'White Oil',
    description: 'High-quality white oil for industrial and commercial use',
    unit: 'Liters',
    pricePerUnit: 85.50
  },
  {
    name: 'Yellow Oil',
    description: 'Premium yellow oil for various industrial applications',
    unit: 'Liters',
    pricePerUnit: 92.75
  },
  {
    name: 'Crude Oil',
    description: 'Raw crude oil for processing and refining',
    unit: 'Barrels',
    pricePerUnit: 4500.00
  },
  {
    name: 'Diesel',
    description: 'High-grade diesel fuel for vehicles and machinery',
    unit: 'Liters',
    pricePerUnit: 78.25
  },
  {
    name: 'Petrol',
    description: 'Premium petrol for automotive and industrial use',
    unit: 'Liters',
    pricePerUnit: 95.40
  },
  {
    name: 'Kerosene',
    description: 'Clean kerosene for heating and lighting applications',
    unit: 'Liters',
    pricePerUnit: 65.80
  },
  {
    name: 'LPG',
    description: 'Liquefied Petroleum Gas for cooking and heating',
    unit: 'Kilograms',
    pricePerUnit: 45.60
  },
  {
    name: 'Natural Gas',
    description: 'Natural gas for industrial and commercial use',
    unit: 'Cubic Meters',
    pricePerUnit: 32.15
  }
];

const seedProducts = async () => {
  try {
    // Clear existing products
    await ProductCatalog.deleteMany({});
    console.log('Cleared existing products');

    // Insert new products
    const createdProducts = await ProductCatalog.insertMany(productTypes);
    console.log(`Successfully seeded ${createdProducts.length} products`);

    // Display created products
    createdProducts.forEach(product => {
      console.log(`- ${product.name}: PKR${product.pricePerUnit} per ${product.unit}`);
    });

    return createdProducts;
  } catch (error) {
    console.error('Error seeding products:', error);
    throw error;
  }
};

// Run if called directly
if (require.main === module) {
  // Connect to database
  mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/factory-management', {
    useNewUrlParser: true,
    useUnifiedTopology: true,
  })
  .then(() => {
    console.log('Connected to MongoDB');
    return seedProducts();
  })
  .then(() => {
    console.log('Product seeding completed successfully');
    process.exit(0);
  })
  .catch((error) => {
    console.error('Product seeding failed:', error);
    process.exit(1);
  });
}

module.exports = seedProducts;

