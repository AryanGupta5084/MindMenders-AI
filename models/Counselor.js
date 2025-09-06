/**
 * models/Counselor.js
 * * This file defines the Mongoose model for a Counselor. This schema is separate
 * from the main User model and holds all the specific information related to a
 * counselor's professional profile, like their specialty, bio, and availability.
 */

// We need Mongoose to create our schemas and models.
const mongoose = require('mongoose');

// --- Availability Sub-Schema ---
// Before we define the main counselor, we need a way to structure their availability.
// This sub-schema is not a model on its own; it's a blueprint for an object
// that will be part of the main counselor schema.
const availabilitySchema = new mongoose.Schema({
  // We'll use numbers to represent the day of the week, following the JavaScript convention.
  // This is more efficient for querying than using strings like "Monday".
  dayOfWeek: {
    type: Number, // 0 = Sunday, 1 = Monday, ..., 6 = Saturday
    required: true,
    min: 0,
    max: 6,
  },
  // We'll store times in a simple "HH:MM" string format.
  // The `match` property uses a regular expression to make sure the format is always correct.
  startTime: {
    type: String, // e.g., "09:00"
    required: true,
    match: /^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/,
  },
  endTime: {
    type: String, // e.g., "17:00"
    required: true,
    match: /^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/,
  },
}, { _id: false }); // `_id: false` tells Mongoose not to add an _id to these sub-documents.

// --- Main Counselor Schema ---
const counselorSchema = new mongoose.Schema({
  // This is the most important field. It links this counselor profile directly
  // to a registered user account in our 'User' collection.
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true, // A counselor profile MUST be linked to a user.
    unique: true,   // A user can only have one counselor profile.
  },
  // The counselor's area of expertise.
  specialty: {
    type: String,
    trim: true,
    default: 'General Wellness',
  },
  // A short biography for the counselor's public profile.
  bio: {
    type: String,
    trim: true,
    maxlength: 500, // Keep it concise.
  },
  // This is where we use our sub-schema. A counselor can have an array
  // of these availability blocks to define their weekly schedule.
  availability: {
    type: [availabilitySchema],
    default: [],
  },
  // How long each appointment slot is, in minutes. This is key for calculating available slots.
  slotDuration: {
    type: Number,
    required: true,
    default: 30,
  },
  // A simple flag for admins. It allows them to temporarily disable a counselor's
  // profile from appearing publicly without having to delete their record.
  isActive: {
    type: Boolean,
    default: true,
  }
}, {
  // Automatically add `createdAt` and `updatedAt` fields.
  timestamps: true,
});

// Compile the schema into a model named 'Counselor'.
const Counselor = mongoose.model('Counselor', counselorSchema);

// And export it for use in our controllers.
module.exports = Counselor;
