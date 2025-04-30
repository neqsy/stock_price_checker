// models/Stock.js
const mongoose = require('mongoose');
const { Schema } = mongoose;

const stockSchema = new Schema({
  symbol: { type: String, required: true, uppercase: true, unique: true },
  likes: { type: Number, default: 0 },
  ips: [{ type: String }] // Store hashed IPs that liked this stock
});

const Stock = mongoose.model('Stock', stockSchema);

module.exports = Stock;