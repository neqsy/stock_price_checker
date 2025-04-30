// tests/2_functional-tests.js
const chaiHttp = require('chai-http');
const chai = require('chai');
const assert = chai.assert;
const server = require('../server'); // Your server file

chai.use(chaiHttp);

let likes = 0; // Variable to track likes between tests for GOOG

suite('Functional Tests', function() {

  suite('GET /api/stock-prices => stockData object', function() {

    test('1. Viewing one stock: GET request to /api/stock-prices/', function(done) {
     chai.request(server)
      .get('/api/stock-prices')
      .query({stock: 'GOOG'})
      .end(function(err, res){
        assert.equal(res.status, 200);
        assert.isObject(res.body, 'response should be an object');
        assert.property(res.body, 'stockData', 'response should have stockData property');
        assert.isObject(res.body.stockData, 'stockData should be an object');
        assert.property(res.body.stockData, 'stock', 'stockData should have stock property');
        assert.property(res.body.stockData, 'price', 'stockData should have price property');
        assert.property(res.body.stockData, 'likes', 'stockData should have likes property');
        assert.equal(res.body.stockData.stock, 'GOOG', 'stock symbol should be GOOG');
        assert.isNumber(res.body.stockData.price, 'price should be a number');
        assert.isNumber(res.body.stockData.likes, 'likes should be a number');
        // Store the initial likes count for the next tests
        // Note: This assumes GOOG starts with 0 likes or retrieves existing likes.
        // The exact value isn't asserted here, just its existence and type.
        likes = res.body.stockData.likes || 0;
        done();
      });
    });

    test('2. Viewing one stock and liking it: GET request to /api/stock-prices/', function(done) {
      chai.request(server)
       .get('/api/stock-prices')
       .query({stock: 'GOOG', like: 'true'})
       .end(function(err, res){
         assert.equal(res.status, 200);
         assert.isObject(res.body.stockData, 'stockData should be an object');
         assert.equal(res.body.stockData.stock, 'GOOG', 'stock symbol should be GOOG');
         assert.isNumber(res.body.stockData.price, 'price should be a number');
         assert.isNumber(res.body.stockData.likes, 'likes should be a number');
         // Likes should have incremented by 1 from the previous state
         assert.equal(res.body.stockData.likes, likes + 1, 'likes should increment by 1');
         likes++; // Update our tracked likes count
         done();
       });
    });

    test('3. Viewing the same stock and liking it again: GET request to /api/stock-prices/', function(done) {
      // This test relies on the IP being the same as the previous test
      chai.request(server)
       .get('/api/stock-prices')
       .query({stock: 'GOOG', like: 'true'})
       .end(function(err, res){
         assert.equal(res.status, 200);
         assert.isObject(res.body.stockData, 'stockData should be an object');
         assert.equal(res.body.stockData.stock, 'GOOG', 'stock symbol should be GOOG');
         assert.isNumber(res.body.stockData.price, 'price should be a number');
         assert.isNumber(res.body.stockData.likes, 'likes should be a number');
         // Likes should NOT have incremented again for the same IP
         assert.equal(res.body.stockData.likes, likes, 'likes should not increment again for the same IP');
         done();
       });
    });

    test('4. Viewing two stocks: GET request to /api/stock-prices/', function(done) {
       chai.request(server)
        .get('/api/stock-prices')
        .query({stock: ['MSFT', 'AAPL']}) // Using two different valid stocks
        .end(function(err, res){
          assert.equal(res.status, 200);
          assert.isObject(res.body, 'response should be an object');
          assert.property(res.body, 'stockData', 'response should have stockData property');
          assert.isArray(res.body.stockData, 'stockData should be an array');
          assert.lengthOf(res.body.stockData, 2, 'stockData array should contain 2 items');

          // Check stock 1 (MSFT)
          assert.isObject(res.body.stockData[0], 'stockData[0] should be an object');
          assert.property(res.body.stockData[0], 'stock', 'stockData[0] should have stock');
          assert.property(res.body.stockData[0], 'price', 'stockData[0] should have price');
          assert.property(res.body.stockData[0], 'rel_likes', 'stockData[0] should have rel_likes');
          assert.equal(res.body.stockData[0].stock, 'MSFT', 'stockData[0] stock symbol');
          assert.isNumber(res.body.stockData[0].price, 'stockData[0] price should be a number');
          assert.isNumber(res.body.stockData[0].rel_likes, 'stockData[0] rel_likes should be a number');

          // Check stock 2 (AAPL)
          assert.isObject(res.body.stockData[1], 'stockData[1] should be an object');
          assert.property(res.body.stockData[1], 'stock', 'stockData[1] should have stock');
          assert.property(res.body.stockData[1], 'price', 'stockData[1] should have price');
          assert.property(res.body.stockData[1], 'rel_likes', 'stockData[1] should have rel_likes');
          assert.equal(res.body.stockData[1].stock, 'AAPL', 'stockData[1] stock symbol');
          assert.isNumber(res.body.stockData[1].price, 'stockData[1] price should be a number');
          assert.isNumber(res.body.stockData[1].rel_likes, 'stockData[1] rel_likes should be a number');

          // Check rel_likes relationship
          assert.equal(res.body.stockData[0].rel_likes, -res.body.stockData[1].rel_likes, 'rel_likes should be opposites');

          done();
        });
    });

    let likes1 = 0;
    let likes2 = 0;

    test('5. Viewing two stocks and liking them: GET request to /api/stock-prices/', function(done) {
      chai.request(server)
        .get('/api/stock-prices')
        .query({stock: ['AMZN', 'TSLA'], like: 'true'}) // Use different stocks than test 4 to avoid interference if needed
        .end(function(err, res){
          assert.equal(res.status, 200);
          assert.isObject(res.body, 'response should be an object');
          assert.property(res.body, 'stockData', 'response should have stockData property');
          assert.isArray(res.body.stockData, 'stockData should be an array');
          assert.lengthOf(res.body.stockData, 2, 'stockData array should contain 2 items');

          // Stock 1 (AMZN)
          assert.equal(res.body.stockData[0].stock, 'AMZN');
          assert.isNumber(res.body.stockData[0].price);
          assert.isNumber(res.body.stockData[0].rel_likes);
          likes1 = res.body.stockData[0].rel_likes; // Store relative likes temporarily

          // Stock 2 (TSLA)
          assert.equal(res.body.stockData[1].stock, 'TSLA');
          assert.isNumber(res.body.stockData[1].price);
          assert.isNumber(res.body.stockData[1].rel_likes);
          likes2 = res.body.stockData[1].rel_likes; // Store relative likes temporarily

          // Check rel_likes relationship again after liking
          assert.equal(likes1, -likes2, 'rel_likes should be opposites after liking');

          // Note: We can't easily assert the *absolute* like counts here without fetching them individually first,
          // but we know rel_likes should reflect the difference, and liking should have been attempted for both.
          // The IP check ensures the like only counts once per stock *for this IP*.

          done();
        });
    });

     // Optional: Test for invalid stock symbol
     test('6. Viewing an invalid stock: GET request to /api/stock-prices/', function(done) {
      chai.request(server)
       .get('/api/stock-prices')
       .query({stock: 'INVALIDSTOCK'})
       .end(function(err, res){
         // FCC tests expect a 200 OK even for invalid stocks, but returning specific data
         assert.equal(res.status, 404); // Or 200 depending on how strict you interpret FCC tests vs REST principles
         assert.isObject(res.body);
         // Depending on your error handling in api.js, check the response structure
         // Example if returning the FCC expected structure on failure:
         assert.property(res.body, 'error');
         assert.equal(res.body.error, 'Invalid stock symbol or data unavailable');
         // Or if just returning error:
         // assert.property(res.body, 'error');
         // assert.equal(res.body.error, 'Invalid stock symbol');
         done();
       });
     });

     // Optional: Test for two invalid stocks
     test('7. Viewing two stocks where one is invalid: GET request to /api/stock-prices/', function(done) {
      chai.request(server)
       .get('/api/stock-prices')
       .query({stock: ['GOOG', 'INVALIDSTOCK2']})
       .end(function(err, res){
         assert.equal(res.status, 404); // Or 200 based on interpretation
         assert.isObject(res.body);
         assert.property(res.body, 'error');
         assert.equal(res.body.error, 'One or more stock symbols are invalid or data unavailable.');
         done();
       });
     });


  });

});