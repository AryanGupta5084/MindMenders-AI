// routes/bookingRoutes.js
// This file is where we define all the API endpoints related to booking appointments.

const express = require('express');
const router = express.Router();

// First, we'll need our middleware for authentication to make sure only logged-in users can do certain things.
const { protect } = require('../middleware/authMiddleware');

// And of course, we need to import the controller functions that contain the actual logic.
const {
  getPublicCounselors,
  getAvailableSlots,
  bookAppointment,
  getMyAppointments,
  cancelAppointment,
} = require('../controllers/bookingController');


// --- Public Routes ---
// These endpoints are open to everyone, no login required.

// Route to get a list of all available counselors.
// Example: GET /api/booking/counselors
router.get('/counselors', getPublicCounselors);

// Route to find the available time slots for a specific counselor.
// Example: GET /api/booking/slots/some-counselor-id-123
router.get('/slots/:counselorId', getAvailableSlots);


// --- Protected Routes ---
// A user must be logged in to access these. The `protect` middleware handles checking the token.

// Route for a user to fetch their own list of appointments.
router.get('/my-appointments', protect, getMyAppointments);

// The main route for creating or booking a new appointment.
router.post('/appointments', protect, bookAppointment);

// Route for a user to cancel an appointment they've made.
// NOTE: We're using PUT here to "update" the appointment status to 'cancelled'.
// Could have used DELETE, but this feels more appropriate since the record isn't being deleted.
router.put('/appointments/:id/cancel', protect, cancelAppointment);


// Finally, we export the router so our main server file (server.js) can use it.
module.exports = router;
