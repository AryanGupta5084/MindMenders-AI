/**
 * middleware/authMiddleware.js
 * * This file contains our primary "gatekeeper" middleware.
 * The `protect` function is used on any route that requires a user to be logged in.
 * It checks for a valid JSON Web Token (JWT) and attaches the user's data to the request.
 */

// We need the 'jsonwebtoken' library to verify the token.
const jwt = require('jsonwebtoken');
// We need the User model to fetch the user's details from the database.
const User = require('../models/User');

/**
 * `protect` Middleware
 * This function is the first line of defense for our private routes.
 */
const protect = async (req, res, next) => {
  // A token is usually sent in the 'Authorization' header, formatted as "Bearer [token]".
  // We need to extract just the token part.
  const token = req.headers.authorization?.split(' ')[1];

  // If there's no token at all, we don't even need to check anything else.
  // We can immediately deny access.
  if (!token) {
    return res.status(401).json({ success: false, data: null, error: 'Not authorized, no token provided.' });
  }

  try {
    // `jwt.verify` is the magic function. It decodes the token using our secret key.
    // If the token is expired or has been tampered with, this will throw an error.
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    // If the token is valid, the `decoded` object will contain the payload we signed earlier (id, sessionId).
    // We use the ID to find the user in our database.
    // `.select('-password')` is a crucial security step to make sure we never include the hashed password.
    req.user = await User.findById(decoded.id).select('-password');

    // It's possible a token is valid, but the user has since been deleted.
    // This check ensures the user still exists in our system.
    if (!req.user) {
      return res.status(401).json({ success: false, data: null, error: 'Not authorized, user not found.' });
    }

    // Check if the specific session ID from this token is in the user's blocklist.
    // This immediately invalidates any tokens from a "logout" action.
    if (req.user.blockedSessionIds && req.user.blockedSessionIds.includes(decoded.sessionId)) {
      return res.status(401).json({ success: false, data: null, error: 'Not authorized, session has been logged out.' });
    }
    
    // We'll also attach the session ID to the request object.
    // This is useful for tracking specific login sessions, especially for the chat feature.
    req.sessionId = decoded.sessionId;

    // If everything checks out, we call `next()` to pass control to the next
    // middleware or the actual route controller.
    return next();
  } catch (err) {
    // If `jwt.verify` threw an error (e.g., bad signature, expired token),
    // we'll catch it here and send a "Not authorized" response.
    return res.status(401).json({ success: false, data: null, error: 'Not authorized, token is invalid.' });
  }
};

// We export the function so we can use it in our route files.
module.exports = { protect };
