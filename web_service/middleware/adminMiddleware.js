/**
 * middleware/adminMiddleware.js
 * * This file contains middleware specifically for protecting our admin routes.
 * Middleware functions are great because they can check things (like if a user is an admin)
 * before our main controller logic even runs.
 */

// We'll need JWT for token verification and the User model to check their roles.
const jwt = require('jsonwebtoken');
const User = require('../models/User');
// This is a handy package to prevent brute-force attacks on our admin routes.
const rateLimit = require('express-rate-limit');

/**
 * `isAdmin` Middleware
 * This function checks if the logged-in user has admin privileges.
 * It's designed to be placed *after* our main 'protect' middleware in the route definition.
 */
const isAdmin = async (req, res, next) => {
  try {
    // The 'protect' middleware should have already run and attached the user's info
    // from their token to the `req.user` object. If that's missing, they're not even logged in.
    if (!req.user || !req.user.id) {
       return res.status(401).json({ success: false, data: null, error: 'Authentication required.' });
    }

    // A user's roles can change. The data in the JWT token might be old.
    // For sensitive routes, we should *always* do a fresh check against the database
    // to get the user's most up-to-date permissions.
    const user = await User.findById(req.user.id);

    // Now, we check the `isAdmin` flag from the fresh data we just fetched.
    // If they aren't an admin, we deny access with a 403 Forbidden status.
    if (!user || !user.isAdmin) {
      return res.status(403).json({
        success: false,
        data: null,
        error: 'Access denied: Admin privileges are required.'
      });
    }

    // If they passed all the checks, they are indeed an admin.
    // `next()` passes the request along to the next function in the chain (usually the controller).
    next();
  } catch (error) {
    console.error("Admin verification middleware error:", error);
    return res.status(500).json({
      success: false,
      data: null,
      error: 'Server error during admin verification.'
    });
  }
};

/**
 * `adminLimiter` Rate Limiter
 * This creates a special rate limiter just for admin routes to make them more secure.
 * It helps prevent automated scripts from spamming login attempts or other actions.
 */
const adminLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // This sets the time window to 15 minutes.
  max: 100, // It allows a maximum of 100 requests from a single IP address within that 15-minute window.
  standardHeaders: true, // This sends back standard `RateLimit-*` headers.
  legacyHeaders: false, // We'll disable the older `X-RateLimit-*` headers.
  // This is the custom error message that gets sent if someone hits the limit.
  message: {
    success: false,
    data: null,
    error: 'Too many requests from this IP to admin routes, please try again after 15 minutes.'
  }
});

// We'll export both functions so they can be used in our route files.
module.exports = { isAdmin, adminLimiter };