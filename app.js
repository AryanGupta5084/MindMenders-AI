// app.js
// This is the main entry point for our Express server application.
// It's responsible for setting up all the essential components:
// - Security middleware (CORS, Helmet, Rate Limiting)
// - Database connection with a fail-safe mechanism
// - Real-time communication with Socket.IO
// - API route handling
// - Serving the static front-end application (SPA)
// - Global error handling and health checks.

// Load environment variables from a .env file into process.env
require('dotenv').config();

// --- Block for security ---
if (!process.env.JWT_SECRET || process.env.JWT_SECRET.length < 16) {
  console.error('❌ FATAL ERROR: JWT_SECRET is missing or too short. Please set a strong secret in your .env file.');
  process.exit(1); // Exit with a failure code
}

// --- Core Imports ---
const express = require('express');
const http = require('http'); // We use the http module to integrate Socket.IO with Express
const { Server } = require("socket.io");
const path = require('path');
const cors = require('cors');
const helmet = require('helmet');
const compression = require('compression');
const rateLimit = require('express-rate-limit');

// --- Local Imports ---
const connectDB = require('./config/db');
const seedScreeningTests = require('./utils/seedScreeningTests');
// Grouping our route imports for cleaner code
const chatRoutes = require('./routes/chatRoutes');
const userRoutes = require('./routes/userRoutes');
const adminRoutes = require('./routes/adminRoutes');
const resourceRoutes = require('./routes/resourceRoutes');
const bookingRoutes = require('./routes/bookingRoutes');
const forumRoutes = require('./routes/forumRoutes');
const journalRoutes = require('./routes/journalRoutes');
const exerciseRoutes = require('./routes/exerciseRoutes');
const counselorRoutes = require('./routes/counselorRoutes');
const screeningRoutes = require('./routes/screeningRoutes');

// --- App & Server Initialization ---
const app = express();
const server = http.createServer(app); // Create an HTTP server from our Express app
const io = new Server(server, {         // Initialize Socket.IO on top of the HTTP server
  cors: {
    // Dynamically pull allowed origins from environment variables for security.
    origin: (process.env.CORS_ORIGINS || '').split(',').filter(Boolean),
    methods: ["GET", "POST"]
  }
});


// --- Critical: Database Connection ---
// We wrap this in an async IIFE (Immediately Invoked Function Expression)
// to use await and ensure the connection happens on startup.
(async () => {
  try {
    await connectDB();
    console.log('✅ MongoDB connected successfully.');

    // --- Run the seeder to ensure tests exist ---
    await seedScreeningTests();

  } catch (err) {
    // This is a "fail-fast" approach. If we can't connect to the database,
    // the application is useless. So, we log a critical error and exit
    // immediately to prevent it from running in a broken state.
    console.error('❌ CRITICAL: MongoDB connection failed. The application cannot start.', err?.message || err);
    process.exit(1); // Exit with a failure code.
  }
})();


// --- Real-time Socket.io Logic ---
// We keep all the socket logic in a separate file for organization.
// We pass our `io` instance to the handler so it can attach event listeners.
require('./socket/socketHandler')(io);


// --- Security & Core Middlewares ---
// This is important if the app is behind a reverse proxy (like NGINX or Heroku).
// It helps express-rate-limit identify the correct client IP.
app.set('trust proxy', 1);

// A great security package that sets various HTTP headers to prevent common attacks.
app.use(
  helmet({
    crossOriginEmbedderPolicy: false,
    contentSecurityPolicy: {
      directives: {
        "default-src": ["'self'"],
        "script-src": [
          "'self'",
          "https://cdn.jsdelivr.net/npm/chart.js" // Allow Chart.js library
        ],
        "style-src": [
          "'self'",
          "https://cdnjs.cloudflare.com" // Allow Font Awesome icons
        ],
        "connect-src": [
          "'self'", // Allow API calls and WebSockets to our own domain
          "ws:",  // Allow WebSocket connections
          "wss:"  // Allow Secure WebSocket connections
        ],
        "img-src": ["'self'", "data:", "blob:"],
        "font-src": ["'self'", "https://cdnjs.cloudflare.com"], // Allow fonts for Font Awesome
        "object-src": ["'none'"], // Disallow plugins like Flash
        "upgrade-insecure-requests": [], // Automatically upgrade http to https
      },
    },
  })
);

// Configure Cross-Origin Resource Sharing (CORS)
const allowedOrigins = (process.env.CORS_ORIGINS || '').split(',').filter(Boolean);
app.use(
  cors({
    origin: function (origin, callback) {
      // Allow requests with no origin (like mobile apps or curl requests)
      // or if the origin is in our allowed list.
      if (!origin || allowedOrigins.length === 0 || allowedOrigins.indexOf(origin) !== -1) {
        callback(null, true);
      } else {
        callback(new Error('This origin is not allowed by CORS'));
      }
    },
    credentials: false, // Set to true if you need to handle cookies/sessions across domains
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
  })
);

// Use morgan for HTTP request logging during development.
if (process.env.NODE_ENV !== 'production') {
  app.use(require('morgan')('dev'));
}

// Compress response bodies for better performance.
app.use(compression());
// Parse incoming JSON requests. We set a reasonable payload limit.
app.use(express.json({ limit: '100kb' }));
// Parse URL-encoded bodies (as sent by HTML forms).
app.use(express.urlencoded({ extended: true, limit: '50kb' }));

// Apply rate limiting to all API routes to prevent abuse.
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 600, // Limit each IP to 600 requests per window
  standardHeaders: true,
  legacyHeaders: false,
});
app.use('/api', apiLimiter);


// --- Health Check Endpoint ---
// A simple endpoint that monitoring services can hit to see if the app is alive.
app.get('/healthz', (req, res) => {
  res.status(200).json({ ok: true, uptime: process.uptime() });
});


// --- API Routes ---
// We mount all our different route handlers on the '/api' path.
app.use('/api/chat', chatRoutes);
app.use('/api/users', userRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/resources', resourceRoutes);
app.use('/api/booking', bookingRoutes);
app.use('/api/forum', forumRoutes);
app.use('/api/journal', journalRoutes);
app.use('/api/exercises', exerciseRoutes);
app.use('/api/counselors', counselorRoutes);
app.use('/api/screening', screeningRoutes);


// --- Static Asset Serving & SPA Fallback ---
// Serve the static files from the 'public' directory (e.g., our React build).
app.use(express.static(path.join(__dirname, 'public')));

// This is the "catch-all" handler for our Single Page Application (SPA).
// The regex matches any route that DOES NOT start with '/api'.
// For any such request, we send back the main index.html file.
// The client-side router (e.g., React Router) will then take over and display the correct page.
app.get(/^(?!\/api).*/, (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});


// --- API 404 Not Found Handler ---
// This middleware runs only if a request starts with /api but didn't match any of our routes.
app.all(/^\/api\/.*/, (req, res) => {
  res.status(404).json({ success: false, data: null, error: 'API route not found' });
});


// --- Global Error Handler ---
// This is our final safety net. Any unhandled error from anywhere in the app will end up here.
// It must have four arguments (err, req, res, next) for Express to recognize it as an error handler.
app.use((err, req, res, next) => {
  console.error('Unhandled Error:', err?.stack || err);
  const status = err.status || 500;
  // We send a generic message for 500 errors to avoid leaking implementation details.
  res.status(status).json({
    success: false,
    data: null,
    error: status === 500 ? 'Internal server error' : err.message,
  });
});


// --- Start the Server ---
const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
  console.log(`\n✅ Server running and listening on: http://localhost:${PORT}\n`);
});
