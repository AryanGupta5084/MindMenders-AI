// routes/counselorRoutes.js
// This file is dedicated to handling all API routes that are specific to counselors.
// Things like viewing their own schedules, managing availability, etc. will go here.

const express = require('express');
const router = express.Router();

// We'll definitely need our authentication middleware.
const { protect } = require('../middleware/authMiddleware');

// And we'll import the controller that holds the logic for these routes.
const {
    getCounselorAppointments,
    getMyCounselorProfile,
    updateAvailability
} = require('../controllers/counselorController');


// --- Counselor-Only Routes ---
router.use(protect);

// GET /api/counselors/my-appointments
// Fetches all upcoming appointments for the currently logged-in counselor.
router.get('/my-appointments', getCounselorAppointments);

// GET /api/counselors/profile
// Fetches the professional profile for the logged-in counselor.
router.get('/profile', getMyCounselorProfile);

// PUT /api/counselors/availability
// Updates the weekly availability for the logged-in counselor.
router.put('/availability', updateAvailability);

// And finally, we export the router for the main server file to use.
module.exports = router;
