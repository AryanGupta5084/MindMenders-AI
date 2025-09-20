/**
 * routes/screeningRoutes.js
 * * Defines all API endpoints related to the screening questionnaires.
 * * This entire feature is private and requires a user to be logged in.
 */
const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/authMiddleware');

// Import our new controller functions
const {
    getAvailableTests,
    getTestByKey,
    submitTest
} = require('../controllers/screeningController');

// --- Protected Routes ---
// Apply the 'protect' middleware to ALL routes in this file.
// Guests cannot access these questionnaires.
router.use(protect);

// GET /api/screening/
// Fetches a list of all available tests (e.g., PHQ-9, GAD-7)
router.get('/', getAvailableTests);

// GET /api/screening/:testKey
// Fetches the full questionnaire data (questions, options) for a single test
router.get('/:testKey', getTestByKey);

// POST /api/screening/:testKey
// Submits a user's answers, calculates score, and saves the result
router.post('/:testKey', submitTest);


module.exports = router;