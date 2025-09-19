/**
 * controllers/bookingController.js
 * * This file handles all the logic related to the booking process.
 * It's the brains behind fetching counselors, finding open slots,
 * creating new appointments, and managing existing ones.
 */

// First, we need to pull in our data models.
// These are like blueprints for the data we're working with in MongoDB.
const mongoose = require('mongoose');
const Counselor = require('../models/Counselor');
const Appointment = require('../models/Appointment');
const User = require('../models/User'); // We need this for user-specific details.

// --- Utils ---
const sendEmail = require('../utils/sendEmail');
const ics = require('ics');

/**
 * Helper function to convert a JavaScript Date object into the 
 * array format that the 'ics' library requires: [YYYY, MM, DD, HH, MM]
 * Note: getMonth() is 0-indexed, so we add 1.
 */
function dateToIcsArray(date) {
    return [
        date.getUTCFullYear(),
        date.getUTCMonth() + 1,
        date.getUTCDate(),
        date.getUTCHours(),
        date.getUTCMinutes()
    ];
}

// @desc      Get all active counselors for public view
// @route     GET /api/booking/counselors
// @access    Public
exports.getPublicCounselors = async (req, res) => {
  try {
    // We're looking for all counselors who are marked as 'isActive'.
    // We also want to 'populate' their user information, but we only need the username.
    // This is like a mini-join to grab the counselor's name from the Users collection.
    const counselors = await Counselor.find({ isActive: true }).populate('user', 'username');

    // Looking good, send a 200 OK with the list of counselors.
    res.status(200).json({ success: true, data: counselors, error: null });
  } catch (error) {
    // If something went wrong with the database query, we'll catch it here.
    console.error("Error fetching counselors:", error); // Log the actual error for debugging.
    res.status(500).json({ success: false, data: null, error: 'Server error fetching counselors.' });
  }
};

// @desc      Get available appointment slots for a specific counselor and date
// @route     GET /api/booking/slots/:counselorId
// @access    Public
exports.getAvailableSlots = async (req, res) => {
  try {
    // The user needs to tell us what day they're looking for.
    const { date } = req.query; // Expects a date string like "YYYY-MM-DD"
    if (!date) {
      // No date? Can't proceed. Send a bad request error.
      return res.status(400).json({ success: false, data: null, error: 'Date query parameter is required.' });
    }

    // Convert the date string into a real Date object.
    // Using UTC day helps avoid timezone headaches.
    const targetDate = new Date(date);
    const dayOfWeek = targetDate.getUTCDay(); // Sunday is 0, Monday is 1, etc.

    // Let's find the counselor in question.
    const counselor = await Counselor.findById(req.params.counselorId);
    if (!counselor || !counselor.isActive) {
      // Can't find them, or they're not taking appointments.
      return res.status(404).json({ success: false, data: null, error: 'Counselor not found or not active.' });
    }

    // Now, check the counselor's schedule to see if they even work on this day of the week.
    const availabilityRule = counselor.availability.find(a => a.dayOfWeek === dayOfWeek);
    if (!availabilityRule) {
      // They don't work on this day. Send back an empty list of slots. Not an error, just no availability.
      return res.status(200).json({ success: true, data: [], error: null }); 
    }

    // To check for conflicts, we need to find all appointments already booked for that day.
    const startOfDay = new Date(`${date}T00:00:00.000Z`);
    const endOfDay = new Date(`${date}T23:59:59.999Z`);

    const existingAppointments = await Appointment.find({
      counselor: req.params.counselorId,
      startTime: { $gte: startOfDay, $lte: endOfDay },
      // We should probably ignore appointments that users have cancelled.
      status: { $ne: ['cancelled_by_user', 'cancelled_by_counselor'] }
    });
    
    // It's way faster to check against a simple Set of timestamps than to loop through objects.
    const bookedSlots = new Set(existingAppointments.map(apt => apt.startTime.getTime()));

    // Time to build the list of available slots.
    const availableSlots = [];
    const { startTime, endTime } = availabilityRule; // e.g., "09:00", "17:00"
    const slotDuration = counselor.slotDuration; // in minutes

    // Start at the beginning of their shift...
    let currentSlotTime = new Date(`${date}T${startTime}:00.000Z`);
    const endSlotTime = new Date(`${date}T${endTime}:00.000Z`);
    
    // If the end time is earlier than the start time, it means the shift crosses midnight.
    // We need to add a day to the end time to make the comparison work correctly.
    if (endSlotTime <= currentSlotTime) {
        endSlotTime.setDate(endSlotTime.getDate() + 1);
    }
    
    while (currentSlotTime < endSlotTime) {
      if (!bookedSlots.has(currentSlotTime.getTime()) && currentSlotTime > new Date()) {
        availableSlots.push(new Date(currentSlotTime));
      }
      
      currentSlotTime.setMinutes(currentSlotTime.getMinutes() + slotDuration);
    }
    
    // All done! Send the final list of available time slots.
    res.status(200).json({ success: true, data: availableSlots, error: null });
  } catch (error) {
    console.error("Error calculating slots:", error);
    res.status(500).json({ success: false, data: null, error: 'Server error calculating slots.' });
  }
};

// @desc      Book a new appointment
// @route     POST /api/booking/appointments
// @access    Private (user must be logged in)
exports.bookAppointment = async (req, res) => {
    // Start a new session for the transaction.
    const session = await mongoose.startSession();
    session.startTransaction();

    let newAppointment; // Define appointment here so we can access it after the transaction
    let counselor; // Define counselor here to access it in the email block

    try {
        const { counselorId, startTime, notes } = req.body;
        const userId = req.user.id;

        const counselor = await Counselor.findById(counselorId).populate('user', 'username email');
        if (!counselor || !counselor.isActive) {
            return res.status(404).json({ success: false, data: null, error: 'Counselor not found or is not active.' });
        }

        const start = new Date(startTime);
        const end = new Date(start.getTime() + counselor.slotDuration * 60000);

        // This single, robust check is now performed inside the transaction.
        const conflictingAppointment = await Appointment.findOne({
            counselor: counselorId,
            status: { $nin: ['cancelled_by_user', 'cancelled_by_counselor'] }, // Check for any non-cancelled status
            startTime: { $lt: end },
            endTime: { $gt: start }
        }).session(session); // Important: ensure this query is part of the transaction session.

        if (conflictingAppointment) {
            // If a conflict is found, we immediately abort the transaction.
            await session.abortTransaction();
            return res.status(409).json({
                success: false,
                data: null,
                error: 'This time slot is no longer available. Please select another slot.'
            });
        }

        // Create the new appointment within the transaction
        const appointmentArray = await Appointment.create([{
            user: userId,
            counselor: counselorId,
            startTime: start,
            endTime: end,
            notes,
        }], { session }); // Important: save within the session
        newAppointment = appointmentArray[0];

        // If we reach this point without errors, commit the transaction.
        await session.commitTransaction();

        // --- Send Confirmation Emails (AFTER transaction succeeds) ---
        try {
            const patient = req.user; // Already attached by 'protect' middleware
            const patientEmail = patient.email;
            const counselorEmail = counselor.user.email;
            const apptTime = start.toLocaleString('en-IN', { timeZone: 'Asia/Kolkata', dateStyle: 'full', timeStyle: 'short' });

            // 1. Create the iCalendar Event Details
            const event = {
                title: `Sahara Wellness Session: ${counselor.user.username} & ${patient.username}`,
                description: `This is a confidential one-on-one wellness session booked via the Sahara platform. Please log in to the Sahara dashboard at the scheduled time.`,
                start: dateToIcsArray(start),
                end: dateToIcsArray(end),
                status: 'CONFIRMED',
                organizer: { name: 'Sahara Platform Admin', email: process.env.MAIL_USER },
                attendees: [
                    { name: counselor.user.username, email: counselorEmail, rsvp: true, role: 'REQ-PARTICIPANT' },
                    { name: patient.username, email: patientEmail, rsvp: true, role: 'REQ-PARTICIPANT' }
                ]
            };

            // 2. Generate the .ics file string
            const { error, value } = ics.createEvent(event);
            if (error) {
                throw new Error('Failed to create ICS file.');
            }

            // 3. Create the Nodemailer attachment object
            const calendarAttachment = {
                filename: 'invite.ics',
                content: value,
                contentType: 'text/calendar; method=REQUEST'
            };

            // 4. Email to the Patient (User)
            await sendEmail({
                to: patientEmail,
                subject: 'Sahara Appointment Confirmation',
                html: `
                    <h2>Your Appointment is Confirmed!</h2>
                    <p>Hi ${patient.username},</p>
                    <p>This is to confirm your booking with <strong>${counselor.user.username}</strong>.</p>
                    <p><strong>Time:</strong> ${apptTime} (IST)</p>
                    <p>Please log in to your Sahara dashboard at the scheduled time to join the live chat session.</p>
                    <p>Thank you for taking this step for your well-being.</p>
                `,
                attachments: [calendarAttachment]
            });

            // 5. Email to the Counselor
            await sendEmail({
                to: counselorEmail,
                subject: 'New Patient Booking - Sahara Platform',
                html: `
                    <h2>You have a new appointment!</h2>
                    <p>Hi ${counselor.user.username},</p>
                    <p>A new appointment has been booked by <strong>${patient.username}</strong> (${patientEmail}).</p>
                    <p><strong>Time:</strong> ${apptTime} (IST)</p>
                    <p>Please be ready to log in to your Counselor Dashboard to begin the session at the scheduled time.</p>
                `,
                attachments: [calendarAttachment]
            });

        } catch (emailError) {
            // IMPORTANT: The appointment is BOOKED, but the email failed.
            // We should log this error, but still send the 201 success response to the user,
            // otherwise they will think the booking failed.
            console.error('CRITICAL: Booking succeeded but confirmation emails/invites failed!', emailError);
        }

        // Send the final successful response
        res.status(201).json({ success: true, data: newAppointment, error: null });

    } catch (error) {
        // If the transaction failed, abort it.
        await session.abortTransaction();
        console.error("Error booking appointment:", error);
        res.status(500).json({ success: false, data: null, error: 'Failed to book appointment due to a server error.' });
    } finally {
        // Finally, always end the session.
        session.endSession();
    }
};

// @desc      Get appointments for the logged-in user
// @route     GET /api/booking/my-appointments
// @access    Private
exports.getMyAppointments = async (req, res) => {
    try {
        // Find all appointments that belong to the current user.
        const appointments = await Appointment.find({ user: req.user.id })
            .populate({
                path: 'counselor', // Grab the full counselor document...
                populate: {
                    path: 'user', // ...then within that, grab their user document...
                    select: 'username' // ...but we only need the username.
                }
            })
            .sort({ startTime: 1 }); // Sort them chronologically.

        res.status(200).json({ success: true, data: appointments, error: null });
    } catch (error) {
        console.error("Error retrieving appointments:", error);
        res.status(500).json({ success: false, data: null, error: 'Failed to retrieve appointments.' });
    }
};

// @desc      Cancel an appointment
// @route     PUT /api/booking/appointments/:id/cancel
// @access    Private
exports.cancelAppointment = async (req, res) => {
    try {
        let appointment = await Appointment.findById(req.params.id);

        if (!appointment) {
            return res.status(404).json({ success: false, data: null, error: 'Appointment not found.' });
        }
        if (appointment.user.toString() !== req.user.id) {
            return res.status(403).json({ success: false, data: null, error: 'You are not authorized to cancel this appointment.' });
        }
        if (appointment.status !== 'booked' && appointment.status !== 'confirmed') {
             return res.status(400).json({ success: false, data: null, error: 'Only booked or confirmed appointments can be cancelled.' });
        }

        appointment.status = 'cancelled_by_user';
        await appointment.save();
        
        // --- Send Cancellation Emails with Calendar Update ---
        try {
            const fullAppt = await Appointment.findById(appointment._id).populate({
                path: 'counselor',
                populate: { path: 'user', select: 'username email' }
            });

            const patient = req.user;
            const counselor = fullAppt.counselor;
            const start = new Date(fullAppt.startTime);
            const end = new Date(fullAppt.endTime);

            // 1. Create a "CANCELLED" iCalendar event
            const event = {
                title: `CANCELLED: Sahara Session: ${counselor.user.username} & ${patient.username}`,
                start: dateToIcsArray(start),
                end: dateToIcsArray(end),
                status: 'CANCELLED', // This tells the calendar to remove the event
                organizer: { name: 'Sahara Platform Admin', email: process.env.MAIL_USER },
                attendees: [
                    { name: counselor.user.username, email: counselor.user.email },
                    { name: patient.username, email: patient.email }
                ]
            };
            
            const { error, value } = ics.createEvent(event);
            if (error) { throw new Error('Failed to create cancellation ICS'); }

            const calendarAttachment = {
                filename: 'cancel.ics',
                content: value,
                contentType: 'text/calendar; method=CANCEL' // Use the CANCEL method
            };

            // 2. Send emails
            await sendEmail({
                to: counselor.user.email,
                subject: 'Appointment Canceled by User',
                html: `
                    <h2>An appointment has been canceled.</h2>
                    <p>The appointment scheduled with <strong>${patient.username}</strong> on ${apptTime} (IST) has been cancelled by the user.</p>
                    <p>This time slot is now available on your schedule.</p>
                `,
                attachments: [calendarAttachment]
            });
             await sendEmail({
                to: patient.email,
                subject: 'Your Appointment Has Been Canceled',
                html: `
                    <h2>Your Appointment is Canceled.</h2>
                    <p>Hi ${patient.username},</p>
                    <p>This is to confirm your appointment with <strong>${fullAppt.counselor.user.username}</strong> on ${apptTime} (IST) has been successfully canceled.</p>
                `,
                attachments: [calendarAttachment]
            });

        } catch (emailError) {
            console.error('CRITICAL: Cancellation succeeded but notification emails failed!', emailError);
        }

        res.status(200).json({ success: true, data: appointment, error: null });
    } catch (error) {
        console.error("Error cancelling appointment:", error);
        res.status(500).json({ success: false, data: null, error: 'Failed to cancel appointment.' });
    }
};
