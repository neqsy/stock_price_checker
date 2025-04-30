// server.js
'use strict';
require('dotenv').config();
const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
const helmet = require('helmet');

const apiRoutes = require('./routes/api.js');
const fccTestingRoutes = require('./routes/fcctesting.js');
const runner = require('./test-runner');
const connectDB = require('./db-connection'); // Import DB connection function

const app = express();

// Connect to Database
connectDB();

// Security Middleware
app.use(helmet.contentSecurityPolicy({
  directives: {
    defaultSrc: ["'self'"], // Default source: only self
    scriptSrc: ["'self'"],  // Allow scripts only from own origin
    styleSrc: ["'self'"],   // Allow CSS only from own origin
    // If you load fonts or images from CDNs, add them here, e.g.:
    // fontSrc: ["'self'", 'fonts.gstatic.com'],
    // imgSrc: ["'self'", 'cdn.example.com']
  }
}));
// Other Helmet defaults for security headers
app.use(helmet.dnsPrefetchControl());
app.use(helmet.frameguard({ action: 'deny' }));
app.use(helmet.hidePoweredBy());
app.use(helmet.hsts({ maxAge: 86400, includeSubDomains: true, preload: true })); // 1 day in seconds for testing, increase for production
app.use(helmet.ieNoOpen());
app.use(helmet.noSniff());
app.use(helmet.referrerPolicy({ policy: 'same-origin' }));
app.use(helmet.xssFilter());


app.use('/public', express.static(process.cwd() + '/public'));

app.use(cors({ origin: '*' })); // For FCC testing purposes, allow all origins

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

// Enable trusting proxy headers if running behind one (like Glitch, Heroku, etc.)
// This is important for getting the correct req.ip or req.headers['x-forwarded-for']
app.enable('trust proxy');

// Index page (static HTML)
app.route('/').get(function (req, res) {
  res.sendFile(process.cwd() + '/views/index.html');
});

// For FCC testing purposes
fccTestingRoutes(app);

// Routing for API
apiRoutes(app);

// 404 Not Found Middleware
app.use(function (req, res, next) {
  res.status(404).type('text').send('Not Found');
});

// Start server and tests
const listener = app.listen(process.env.PORT || 3000, function () {
  console.log('Your app is listening on port ' + listener.address().port);
  if (process.env.NODE_ENV === 'test') {
    console.log('Running Tests...');
    setTimeout(function () {
      try {
        runner.run();
      } catch (e) {
        let error = e;
        console.log('Tests are not valid:');
        console.log(error);
      }
    }, 3500); // Increased timeout for DB connection and potential async operations in tests
  }
});

module.exports = app; // for testing