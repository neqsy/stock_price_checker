// db-connection.js
const mongoose = require('mongoose');
const dotenv = require('dotenv');
dotenv.config();

const connectDB = async () => {
  try {
    await mongoose.connect(process.env.DB, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    console.log('MongoDB Connected...');
    // Add unique index after connection (best practice)
    const Stock = require('./models/Stock'); // Load model after connection established
    await Stock.createIndexes();
    console.log('Stock index ensured.');

  } catch (err) {
    console.error('DB Connection Error:', err.message);
    // Exit process with failure
    process.exit(1);
  }
};

module.exports = connectDB;