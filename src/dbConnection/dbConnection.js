const mongoose=require('mongoose')

const dbConnection=async()=>{
    try {
        console.log("Attempting to connect to MongoDB Atlas...")
        
        const connect=await mongoose.connect(process.env.MONGO_URI, {
            serverSelectionTimeoutMS: 10000, // 10 second timeout
        })
        console.log("✅ MongoDB Atlas connected successfully:", connect.connection.name, "on", connect.connection.host)

    } catch (error) {
        console.log("❌ MongoDB Atlas connection failed:", error.message)
        console.log("💡 Please check your Atlas connection string in .env file")
        console.log("💡 Make sure your Atlas cluster is running and accessible")
        
        // Exit the process if Atlas connection fails
        process.exit(1)
    }
}

module.exports=dbConnection