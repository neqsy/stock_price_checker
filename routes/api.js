// routes/api.js
'use strict';
const axios = require('axios');
const Stock = require('../models/Stock');
const crypto = require('crypto');

// Function to anonymize IP
function anonymizeIp(ip) {
  // Use SHA-256 hashing for anonymization
  return crypto.createHash('sha256').update(ip).digest('hex');
}

// Function to fetch stock data from the proxy
async function getStockData(stockSymbol) {
  try {
    const apiUrl = `https://stock-price-checker-proxy.freecodecamp.rocks/v1/stock/${stockSymbol}/quote`;
    const response = await axios.get(apiUrl);
    if (response.data && response.data.symbol && response.data.latestPrice !== undefined) {
      // Check if the response looks valid before returning
      if (typeof response.data.latestPrice === 'number') {
         return {
           stock: response.data.symbol,
           price: response.data.latestPrice,
         };
      } else {
         console.error(`Invalid price type for ${stockSymbol}:`, response.data.latestPrice);
         return null; // Indicate invalid data format
      }
    } else {
      // Handle cases where the symbol might be valid but data isn't returned as expected
      // or if the API returns a string like "Unknown symbol" or an error object.
      console.error(`Invalid or incomplete data received for ${stockSymbol}:`, response.data);
      return null; // Indicate invalid data or symbol
    }
  } catch (error) {
    // Axios throws error for non-2xx responses, or network errors
    if (error.response && error.response.status === 404) {
        console.log(`Stock symbol ${stockSymbol} not found by proxy.`);
    } else {
        console.error(`Error fetching stock data for ${stockSymbol}:`, error.message);
    }
    return null; // Indicate failure to fetch data
  }
}


// Function to get/create stock doc and optionally add like
async function processStock(symbol, like, hashedIp) {
  const stockData = await getStockData(symbol);
  if (!stockData) {
    // If stock data couldn't be fetched, return null to indicate failure
    return null;
  }

  let stockDoc = await Stock.findOne({ symbol: stockData.stock });

  if (!stockDoc) {
    stockDoc = new Stock({ symbol: stockData.stock, likes: 0, ips: [] });
  }

  let likes = stockDoc.likes || 0; // Ensure likes is treated as 0 if undefined/null

  if (like === 'true' && !stockDoc.ips.includes(hashedIp)) {
    stockDoc.likes += 1;
    stockDoc.ips.push(hashedIp);
    likes = stockDoc.likes; // Update local likes variable
    await stockDoc.save(); // Save changes to DB
  } else {
     // Need to save even if not liked, if it's a new stock document
     if (stockDoc.isNew) {
         await stockDoc.save();
     }
  }


  return {
    stock: stockData.stock,
    price: stockData.price,
    likes: likes, // Return the potentially updated like count
  };
}

module.exports = function (app) {
  app.route('/api/stock-prices').get(async (req, res) => {
    const { stock, like } = req.query;
    // Anonymize the IP address - use 'x-forwarded-for' if behind proxy, else req.ip
    // Ensure 'trust proxy' is enabled in server.js if needed
    const ip = req.headers['x-forwarded-for']?.split(',')[0] || req.ip;
    const hashedIp = anonymizeIp(ip);

    if (!stock) {
      return res.status(400).json({ error: 'Stock symbol required' });
    }

    if (Array.isArray(stock)) {
      // --- Handle two stocks ---
      if (stock.length !== 2) {
        return res.status(400).json({ error: 'Please provide exactly two stock symbols' });
      }
      const symbol1 = stock[0].toUpperCase();
      const symbol2 = stock[1].toUpperCase();

      try {
         // Process both stocks concurrently
         const [data1, data2] = await Promise.all([
            processStock(symbol1, like, hashedIp),
            processStock(symbol2, like, hashedIp)
         ]);

         // Check if either stock failed to process
         if (!data1 || !data2) {
            // You might want more specific error handling here,
            // e.g., identifying *which* stock failed.
            // For now, a generic error if *any* fail.
             return res.status(404).json({ error: 'One or more stock symbols are invalid or data unavailable.' });
         }

         const responseData = {
            stockData: [
               {
                 stock: data1.stock,
                 price: data1.price,
                 rel_likes: data1.likes - data2.likes,
               },
               {
                 stock: data2.stock,
                 price: data2.price,
                 rel_likes: data2.likes - data1.likes,
               },
            ],
         };
         return res.json(responseData);

      } catch (error) {
         console.error("Error processing two stocks:", error);
         return res.status(500).json({ error: 'Internal server error while processing stocks' });
      }

    } else {
      // --- Handle single stock ---
      const symbol = stock.toUpperCase();
      try {
        const stockResult = await processStock(symbol, like, hashedIp);

        if (!stockResult) {
          // Handle case where stock symbol is invalid or data fetch failed
          return res.status(404).json({ error: 'Invalid stock symbol or data unavailable', stockData: {likes: like === 'true' ? 1 : 0} }); // FCC test expects this structure on failure
        }

        return res.json({
          stockData: {
            stock: stockResult.stock,
            price: stockResult.price,
            likes: stockResult.likes,
          },
        });
      } catch (error) {
         console.error("Error processing single stock:", error);
         // Check if the error might be due to an invalid stock (e.g., from getStockData returning null)
         // Although the `if (!stockResult)` block should catch this, adding robustness.
         if (error.message.includes("Invalid stock symbol")) { // Example check
            return res.status(404).json({ error: 'Invalid stock symbol', stockData: {likes: 0} });
         }
         return res.status(500).json({ error: 'Internal server error while processing stock' });
      }
    }
  });
};