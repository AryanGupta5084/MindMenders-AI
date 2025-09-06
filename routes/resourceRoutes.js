// routes/resourceRoutes.js
// This file is for API routes that serve up helpful resources,
// like articles, videos, or articles.

const express = require('express');
const router = express.Router();

// Pull in the specific controller function we need.
const { getPublicResources } = require('../controllers/resourceController');


// --- Public Resource Routes ---

// This route is open to everyone, no login required.
// It's designed to provide helpful materials to all users.

// GET /api/resources/
// Fetches a list of all public resources.
// It also supports filtering via query parameters (e.g., /api/resources?type=article)
router.get('/', getPublicResources);


// Export the router so the main app can use it.
module.exports = router;
