const mongoose=require('mongoose')

// Cache the connection to reuse in serverless environments
let cached = global.mongoose;

if (!cached) {
  cached = global.mongoose = { conn: null, promise: null };
}

const dbConnection=async()=>{
    try {
        // Check if MONGO_URI is set
        if (!process.env.MONGO_URI) {
            throw new Error('MONGO_URI environment variable is not set');
        }

        // If already connected, reuse the connection
        if (cached.conn) {
            // Check if connection is still alive
            if (mongoose.connection.readyState === 1) {
                return cached.conn;
            } else {
                // Connection is dead, reset cache
                cached.conn = null;
            }
        }

        // If connection is in progress, wait for it
        if (cached.promise) {
            try {
                await cached.promise;
                return cached.conn;
            } catch (err) {
                // Connection failed, reset promise
                cached.promise = null;
                throw err;
            }
        }

        console.log("Attempting to connect to MongoDB Atlas...")
        
        // Ensure database name is in the connection string
        let mongoUri = process.env.MONGO_URI;
        if (!mongoUri) {
            throw new Error('MONGO_URI environment variable is not set');
        }
        
        // Parse URI and ensure database name is set
        const uriParts = mongoUri.match(/^(mongodb(?:\+srv)?:\/\/[^\/]+)(?:\/([^?]+))?(\?.*)?$/);
        if (uriParts) {
            const [, baseUri, dbName, queryString] = uriParts;
            if (!dbName || dbName !== 'factory-management') {
                // Replace or add database name
                const query = queryString || '';
                mongoUri = `${baseUri}/factory-management${query}`;
                console.log("🔧 Adjusted MONGO_URI to include database name 'factory-management'");
            }
        }
        
        console.log("🔗 Connection URI (sanitized):", mongoUri.replace(/\/\/.*@/, '//***:***@'));
        
        // Create new connection promise
        cached.promise = mongoose.connect(mongoUri, {
            serverSelectionTimeoutMS: 10000, // 10 second timeout
            maxPoolSize: 10, // Maintain up to 10 socket connections
        }).then((connect) => {
            console.log("✅ MongoDB Atlas connected successfully!");
            console.log("📊 Database:", connect.connection.name);
            console.log("🌐 Host:", connect.connection.host);
            console.log("🔌 Ready State:", connect.connection.readyState, "(1=connected)");
            
            // Verify we're connected to the correct database
            if (connect.connection.name !== 'factory-management') {
                console.warn("⚠️  WARNING: Connected to database '" + connect.connection.name + "' but expected 'factory-management'");
                console.warn("💡 Make sure your MONGO_URI includes the database name: .../factory-management?...");
            }
            
            cached.conn = connect;
            cached.promise = null;
            return connect;
        }).catch((err) => {
            // Reset promise on error
            cached.promise = null;
            throw err;
        });

        const connect = await cached.promise;
        return connect;

    } catch (error) {
        console.error("❌ MongoDB Atlas connection failed:", error.message)
        console.error("💡 Please check your Atlas connection string in .env file")
        console.error("💡 Make sure your Atlas cluster is running and accessible")
        
        // Reset cache on error
        cached.promise = null;
        cached.conn = null;
        
        // In serverless, don't exit - let the function handle the error
        // Only exit in local development
        if (process.env.NODE_ENV !== 'production' && !process.env.VERCEL) {
            process.exit(1);
        }
        
        throw error;
    }
}

module.exports=dbConnection