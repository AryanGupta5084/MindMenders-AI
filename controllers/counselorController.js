/**
 * controllers/counselorController.js
 * * This file handles all logic for counselor-specific actions, such as
 * viewing their own schedules, profile, and managing availability.
 */

const Counselor = require('../models/Counselor');
const Appointment = require('../models/Appointment');

/**
 * @desc      Get appointments for the currently logged-in counselor
 * @route     GET /api/counselors/my-appointments
 * @access    Private/Counselor
 */
exports.getCounselorAppointments = async (req, res) => {
    try {
        const counselor = await Counselor.findOne({ user: req.user.id });
        if (!counselor) {
            return res.status(403).json({ success: false, data: null, error: 'Access denied. Not a counselor.' });
        }

        const appointments = await Appointment.find({ counselor: counselor._id })
            .populate('user', 'username')
            .sort({ startTime: 1 });

        res.status(200).json({ success: true, data: appointments, error: null });
    } catch (error) {
        console.error("Failed to fetch counselor's appointments:", error);
        res.status(500).json({ success: false, data: null, error: 'Server error fetching counselor appointments.' });
    }
};

/**
 * @desc      Get the profile for the currently logged-in counselor
 * @route     GET /api/counselors/profile
 * @access    Private/Counselor
 */
exports.getMyCounselorProfile = async (req, res) => {
    try {
        const counselor = await Counselor.findOne({ user: req.user.id })
            .populate('user', 'username email'); // Populate the user details

        if (!counselor) {
            return res.status(404).json({ success: false, data: null, error: 'Counselor profile not found.' });
        }

        res.status(200).json({ success: true, data: counselor, error: null });
    } catch (error) {
        console.error("Failed to fetch counselor profile:", error);
        res.status(500).json({ success: false, data: null, error: 'Server error fetching profile.' });
    }
};

/**
 * @desc      Update availability for the currently logged-in counselor
 * @route     PUT /api/counselors/availability
 * @access    Private/Counselor
 */
exports.updateAvailability = async (req, res) => {
    try {
        const { availability } = req.body;

        // Basic validation to ensure we received an array.
        if (!Array.isArray(availability)) {
            return res.status(400).json({ success: false, error: 'Availability data must be an array.' });
        }

        const counselor = await Counselor.findOneAndUpdate(
            { user: req.user.id },
            { $set: { availability: availability } },
            { new: true, runValidators: true } // Return the updated document and run schema validation
        );

        if (!counselor) {
            return res.status(404).json({ success: false, data: null, error: 'Counselor profile not found.' });
        }

        res.status(200).json({ success: true, data: counselor.availability, error: null });
    } catch (error) {
        console.error("Failed to update availability:", error);
        res.status(500).json({ success: false, data: null, error: 'Server error updating availability.' });
    }
};