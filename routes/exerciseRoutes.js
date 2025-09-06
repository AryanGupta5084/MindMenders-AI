// routes/exerciseRoutes.js
// This file defines all the API endpoints related to the user exercises feature.

const express = require('express');
const router = express.Router();

// Like most features, we'll need our authentication middleware.
const { protect } = require('../middleware/authMiddleware');

// And we'll pull in the controller functions that have the core logic.
const { getExercises, startOrContinueExercise } = require('../controllers/exerciseController');


// --- Protected Exercise Routes ---

// We're applying the 'protect' middleware to all routes in this file.
// This ensures that only a logged-in user can access any of these exercise endpoints.
router.use(protect);

// GET /api/exercises/
// This will fetch a list of all available exercises for the user.
router.get('/', getExercises);

// POST /api/exercises/start
// This is for when a user either starts a new exercise or resumes one they left off.
// The controller will figure out which case it is.
router.post('/start', startOrContinueExercise);

// TODO: maybe add a route later to get progress on a specific exercise?
// e.g., router.get('/:exerciseId/progress', getExerciseProgress);


// And finally, export the router so it can be used by the main app.
module.exports = router;
