/**
 * models/Appointment.js
 * * This is the Mongoose model for our appointments. It defines the structure
 * of how appointment data will be stored in our MongoDB database.
 */

// We'll need Mongoose to define our schema and model.
const mongoose = require('mongoose');

// Let's define the schema for an appointment.
const appointmentSchema = new mongoose.Schema({
  // The 'user' field links to the User who booked the appointment.
  // We're storing the user's ObjectId, and the 'ref' tells Mongoose
  // which model to look at when we want to populate this field with user data.
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true, // An appointment must belong to a user.
  },
  // Similarly, this links to the Counselor who the appointment is with.
  counselor: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Counselor',
    required: true, // An appointment must have a counselor.
  },
  // When the appointment is scheduled to begin.
  startTime: {
    type: Date,
    required: true,
  },
  // And when it's scheduled to end.
  endTime: {
    type: Date,
    required: true,
  },
  // The current status of the appointment.
  status: {
    type: String,
    // Using an 'enum' is great for restricting a field to a specific set of allowed values.
    enum: ['booked', 'confirmed', 'completed', 'cancelled_by_user', 'cancelled_by_counselor'],
    default: 'booked', // New appointments will default to 'booked'.
  },
  // A place for the user to leave any optional notes when they book.
  notes: {
    type: String,
    trim: true, // This will automatically remove any leading/trailing whitespace.
    maxlength: 500, // Let's keep the notes to a reasonable length.
  },
}, {
  // This handy option tells Mongoose to automatically add `createdAt` and `updatedAt` fields.
  // It's super useful for tracking when records were created or modified.
  timestamps: true,
});

// --- Database Indexes ---
// Indexes are like an index in a book; they make database queries much faster.
// It's a good idea to add indexes to fields that you'll be querying often.

// This helps us quickly find all appointments for a specific user, sorted by date.
appointmentSchema.index({ user: 1, startTime: -1 });
// This helps us quickly find all appointments for a specific counselor, sorted by date.
appointmentSchema.index({ counselor: 1, startTime: -1 });

// This is a crucial one for data integrity.
// The `unique: true` option creates a compound index that ensures a single counselor
// cannot have two appointments starting at the exact same time. It prevents double-booking!
appointmentSchema.index({ counselor: 1, startTime: 1 }, { unique: true });

// Now, we compile our schema into a Model.
const Appointment = mongoose.model('Appointment', appointmentSchema);

// And finally, we export it so we can use it elsewhere in our app.
module.exports = Appointment;
