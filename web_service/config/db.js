// config/db.js

// Bringing in Mongoose, which is our tool for interacting with MongoDB.
const mongoose = require('mongoose');

// Here's our main function to connect to the database.
// We make it async because database connections are inherently asynchronous.
const connectDB = async () => {
  try {
    // Attempt to connect to the MongoDB cluster.
    // The actual connection string is safely stored in our environment variables.
    const conn = await mongoose.connect(process.env.MONGO_URI);

    // If the connection is successful, let's log it to the console.
    // It's helpful to see which host we're connected to during development.
    console.log(`✅ MongoDB connected: ${conn.connection.host}`);

  } catch (err) {
    // If something goes wrong during the connection, we'll catch the error here.
    console.error(`❌ DB connection error: ${err.message}`);

    // It's important to stop the application if we can't connect to the DB.
    // So, we'll re-throw the error, and our main app.js file can handle shutting down the process gracefully.
    throw err; // let app.js handle exit
  }
};

// We need to export this function so we can use it in other parts of our application, like our main server file.
module.exports = connectDB;
