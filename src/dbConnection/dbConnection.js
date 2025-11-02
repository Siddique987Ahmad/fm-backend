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
        
        // Create new connection promise
        cached.promise = mongoose.connect(process.env.MONGO_URI, {
            serverSelectionTimeoutMS: 10000, // 10 second timeout
            maxPoolSize: 10, // Maintain up to 10 socket connections
        }).then((connect) => {
            console.log("✅ MongoDB Atlas connected successfully:", connect.connection.name, "on", connect.connection.host);
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