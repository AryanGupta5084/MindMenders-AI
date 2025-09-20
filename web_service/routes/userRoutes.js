// routes/userRoutes.js
// This file is the heart of user authentication. It handles everything
// from registration and logging in to a special guest access feature.

const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const { v4: uuidv4 } = require('uuid'); // To generate unique IDs for guests.
const rateLimit = require('express-rate-limit');

// Controller functions for standard user actions.
const {
  registerUser,
  loginUser,
  logout,
  guestLogout,
  getMe
} = require('../controllers/userController');

// Middleware to protect our routes.
const { protect } = require('../middleware/authMiddleware');

// User model for creating new guest users on the fly.
const User = require('../models/User');


// It's super important to have a JWT_SECRET in the .env file for production.
const JWT_SECRET = process.env.JWT_SECRET;

// Create a stricter rate limiter specifically for authentication routes
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 20, // Limit each IP to 20 authentication requests per window
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    data: null,
    error: 'Too many authentication attempts from this IP, please try again after 15 minutes.'
  },
  // We MUST count successful requests (like guest generation) against the limit to prevent abuse.
  skipSuccessfulRequests: false 
});


// -------------------- Normal User Routes --------------------
// Standard authentication endpoints for registered users.

// POST /api/users/register
router.post('/register', authLimiter, registerUser);

// POST /api/users/login
router.post('/login', authLimiter, loginUser);

// POST /api/users/logout
// This is a protected POST route to securely invalidate the user's session on the server.
router.post('/logout', protect, logout);

// GET /api/users/me
// A protected route to get the current logged-in user's info.
router.get('/me', protect, getMe);


// -------------------- Guest Login Route --------------------
// This is a cool feature to let people try the app without registering.

// POST /api/users/guest
router.post('/guest', authLimiter, async (req, res) => {
  try {
    // 1. Create a unique username for the guest.
    const guestId = `guest_${uuidv4()}`;

    // 2. Create a new user document in the database for this guest.
    const guestUser = new User({
      username: guestId,
      isGuest: true,
      // We're using MongoDB's TTL (Time-To-Live) index feature here.
      // This 'expireAt' field tells the database to automatically delete
      // this guest user document after 7 days. It's a great way to keep the DB clean!
      expireAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) // 7 days from now
    });
    
    // 3. Save the new guest user to the database.
    await guestUser.save();

    // 4. Create a JWT for the guest, just like a real user.
    // We'll include a unique session ID in case we need it for logging.
    const token = jwt.sign(
      { id: guestUser._id, isGuest: true, sessionId: `guest_session_${uuidv4()}` },
      JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRE || '7d' } // Token also expires in 7 days.
    );

    // 5. Send the token and user info back to the client.
    res.status(200).json({
      success: true,
      data: {
        token,
        user: { _id: guestUser._id, username: guestId, isGuest: true }
      },
      error: null
    });

  } catch (err) {
    // Something went wrong on our end.
    console.error("Guest login error:", err);
    res.status(500).json({ 
      success: false, 
      data: null, 
      error: "Guest login failed due to a server error." 
    });
  }
});

// This is a secure route that adds the guest's session to the blocklist
// without deleting their data, allowing the TTL to function.
router.post('/guest-logout', protect, guestLogout);

// -------------------- Server Date Route --------------------
// A simple public endpoint to get the server's current date, normalized to midnight.
// This helps the client sync with the server's timezone for features like journaling.
router.get('/server-date', (req, res) => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    res.status(200).json({ success: true, data: { today: today.toISOString() } });
});

module.exports = router;
