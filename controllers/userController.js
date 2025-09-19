/**
 * controllers/userController.js
 * * This controller is the heart of user authentication. It handles everything from
 * creating a new account (registration) and signing in (login) to fetching the
 * currently logged-in user's profile.
 */

// We need our User model to interact with the user's collection in the database.
const User = require("../models/User");
// JWT is used to create secure access tokens for users.
const jwt = require("jsonwebtoken");
// UUID will help us generate unique session IDs for each login.
const { v4: uuidv4 } = require("uuid");

// A little helper function to generate our JWT token.
// It's good practice to keep this separate.
const generateToken = (id, sessionId, isGuest = false) => {
  // The token's payload will contain the user's database ID, a unique session ID,
  // and a flag to know if they are a guest. This is all the server needs to identify them later.
  return jwt.sign(
    { id, sessionId, isGuest },
    process.env.JWT_SECRET, // The secret should always be stored in an environment variable, never in the code!
    { expiresIn: process.env.JWT_EXPIRE || "7d" } // Let the token expire after a set time.
  );
};

// @desc      Register a new user
// @route     POST /api/auth/register
// @access    Public
exports.registerUser = async (req, res) => {
  try {
    const { username, email, password, hasAgreed } = req.body;

    if (!hasAgreed) {
      return res.status(400).json({
        success: false,
        data: null,
        error: "You must agree to the Terms and Conditions and Privacy Policy to create an account."
      });
    }

    // First, we should check if a user with that email or username already exists.
    // We don't want duplicate accounts.
    const existingUser = await User.findOne({ $or: [{ email }, { username }] });
    if (existingUser) {
      return res.status(400).json({
        success: false,
        data: null,
        error: "A user with that email or username already exists."
      });
    }

    // If we're clear, create the new user. The password will be automatically
    // hashed by a 'pre-save' hook in our User model.
    const user = await User.create({ 
        username, 
        email, 
        password, 
        termsAgreed: new Date() // Set the timestamp for the audit log
    });
    
    // Create a unique session ID for this specific login.
    const sessionId = uuidv4();
    // Generate their access token.
    const token = generateToken(user._id, sessionId, false); // isGuest is false for registered users.
    
    // VERY IMPORTANT: Never send the hashed password back to the client.
    // We create a new object `userData` that contains everything from the user object *except* the password.
    const { password: pw, ...userData } = user.toObject();

    res.status(201).json({
      success: true,
      data: { user: userData, token, sessionId },
      error: null
    });

  } catch (err) {
    console.error("Registration Error:", err);
    res.status(500).json({
      success: false,
      data: null,
      error: "Registration failed due to a server error."
    });
  }
};

// @desc      Login an existing user
// @route     POST /api/auth/login
// @access    Public
exports.loginUser = async (req, res) => {
  try {
    const { email, password } = req.body;
    // Basic validation: make sure we actually received an email and password.
    if (!email || !password) {
      return res.status(400).json({
        success: false,
        data: null,
        error: "Please provide both email and password."
      });
    }

    // Find the user by their email.
    const user = await User.findOne({ email });

    // If we couldn't find a user, or if the password they provided is incorrect,
    // send back a generic "Invalid credentials" error.
    // The `comparePassword` method is defined in our User model to securely check the hashed password.
    if (!user || !(await user.comparePassword(password))) {
      return res.status(401).json({
        success: false,
        data: null,
        error: "Invalid email or password."
      });
    }

    // If credentials are correct, generate a new session and token.
    const sessionId = uuidv4();
    const token = generateToken(user._id, sessionId, false);
    
    // Again, strip the password from the user object before sending it.
    const { password: pw, ...userData } = user.toObject();

    res.status(200).json({
      success: true,
      data: { user: userData, token, sessionId },
      error: null
    });

  } catch (err) {
    console.error("Login Error:", err);
    res.status(500).json({
      success: false,
      data: null,
      error: "Login failed due to a server error."
    });
  }
};

// @desc      Securely logout a REGISTERED user by invalidating their session token.
// @route     POST /api/users/logout
// @access    Private
exports.logout = async (req, res) => {
  // This route is now protected (see routes/userRoutes.js fix). 
  // The 'protect' middleware has run, providing req.user (the user doc) and req.sessionId (from the token).
  try {
    if (!req.user || !req.sessionId) {
      // This should theoretically never hit if 'protect' middleware is active, but it's a good safeguard.
      return res.status(401).json({ success: false, error: 'User not authenticated.' });
    }

    // Add the specific session ID from the user's token to their blocklist.
    // This is the exact same logic we use for guestLogout, ensuring session invalidation for all users.
    req.user.blockedSessionIds.push(req.sessionId);
    await req.user.save();

    // The token is now invalid (it will be blocked by authMiddleware on the next request).
    res.status(200).json({ success: true, data: { message: "Session invalidated successfully." } });
    
  } catch(err) {
    console.error("Logout Error:", err);
    res.status(500).json({ success: false, error: "Server error during logout." });
  }
};

/**
 * @desc      Logout a GUEST user
 * @route     POST /api/users/guest-logout
 * @access    Private (requires a guest token)
 */
exports.guestLogout = async (req, res) => {
  try {
    // This route is hit by a guest. The 'protect' middleware has run,
    // so req.user is the guest user document and req.sessionId is their session ID.
    if (!req.user.isGuest) {
      return res.status(400).json({ success: false, error: 'This route is only for guest users.' });
    }
    
    // Add the current session ID to the guest user's blocklist.
    req.user.blockedSessionIds.push(req.sessionId);
    await req.user.save();

    // The token is now invalid (it will be blocked by authMiddleware).
    // The user document and all chat data REMAIN in the database,
    // allowing the 7-day TTL index to function normally. This fulfills both requirements.
    res.status(200).json({ success: true, data: { message: "Guest session invalidated. Data will be purged per retention policy." } });
    
  } catch (err) {
    console.error("Guest Logout Error:", err);
    res.status(500).json({ success: false, error: "Server error during guest logout." });
  }
};

// @desc      Get the currently logged-in user's data
// @route     GET /api/auth/me
// @access    Private
exports.getMe = async (req, res) => {
  try {
    // This is a protected route. Our 'protect' middleware should have already
    // verified the token and attached the user's data to `req.user`.
    if (!req.user) {
      return res.status(401).json({
        success: false,
        error: "Not authorized"
      });
    }
    // If we have a user, send their data back.
    res.status(200).json({ success: true, data: req.user });
  } catch (err) {
    console.error("Get Me Error:", err);
    res.status(500).json({ success: false, error: err.message });
  }
};
