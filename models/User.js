/**
 * models/User.js
 * * This file defines the Mongoose model for a User.
 * It's a versatile model that can represent both registered users and temporary guest users.
 * It includes logic for password hashing, password comparison, and automatic cleanup of guest accounts.
 */

// We need Mongoose to define our schema and model.
const mongoose = require("mongoose");
// We need bcryptjs for securely hashing and comparing passwords.
const bcrypt = require("bcryptjs");

// Let's define the schema for a user.
const userSchema = new mongoose.Schema({
  // The user's chosen display name. Required for everyone.
  username: { type: String, required: true },
  // The user's email address. This is required for registered users but not for guests.
  // `unique: true` ensures no two registered users can share an email.
  // `sparse: true` is important because it allows multiple documents to have a null email (i.e., multiple guests).
  email: { type: String, unique: true, sparse: true },
  // The user's password. This is not required for guest accounts.
  password: { type: String },
  // A flag to identify administrators. Defaults to false for security.
  isAdmin: { type: Boolean, default: false },
  // A flag to easily distinguish between registered users and temporary guests.
  isGuest: { type: Boolean, default: false },
  // This field is used for guest accounts to set an expiration date.
  // When the date is reached, the TTL index (defined below) will automatically delete the user.
  expireAt: { type: Date, default: null },

  // A blocklist for session IDs. When a user logs out, their token's session ID
  // is added here. This invalidates the token immediately, even if it hasn't expired.
  blockedSessionIds: {
    type: [String],
    default: []
  },

  // A timestamp to log exactly when this user agreed to the terms.
  // This is a critical legal and auditing requirement.
  termsAgreed: {
    type: Date,
    default: null
  },
  
  // --- Gamification/Tracking Fields ---
  // Tracks the user's consecutive daily journaling streak.
  journalStreak: {
    type: Number,
    default: 0
  },
  // Stores the date of the user's last journal entry to help calculate the streak.
  lastJournalDate: {
    type: Date
  },
  // An array to store the names of achievements the user has unlocked (e.g., '7-day-streak').
  achievements: {
    type: [String],
    default: []
  }
}, {
  // Automatically add `createdAt` and `updatedAt` timestamps.
  timestamps: true
});

// --- Database Index for Auto-Cleanup ---
// This is a Time-To-Live (TTL) index. It tells MongoDB to automatically delete any document
// from this collection 'expireAfterSeconds' (0 in this case) after the time specified in the `expireAt` field.
// This is perfect for cleaning up guest user accounts automatically. The index only applies where `expireAt` is not null.
userSchema.index({ expireAt: 1 }, { expireAfterSeconds: 0 });

// --- Mongoose Middleware for Password Hashing ---
// The .pre('save', ...) hook runs automatically right before a document is saved to the database.
userSchema.pre("save", async function (next) {
  // If the user is a guest, they don't have a password, so we just skip the hashing logic.
  if (this.isGuest) return next();
  // We only want to re-hash the password if it has actually been changed (or is new).
  // This prevents re-hashing on every user profile update (e.g., changing a username).
  if (!this.isModified("password")) return next();

  // Generate a "salt" - a random string to make the hash more secure.
  const salt = await bcrypt.genSalt(10);
  // Hash the plain-text password with the salt and update the document.
  this.password = await bcrypt.hash(this.password, salt);
  // Continue with the save operation.
  next();
});

// --- Custom Method for Password Comparison ---
// We're adding a custom method to our schema to handle login password checks.
userSchema.methods.comparePassword = async function (candidatePassword) {
  // Guests don't have a password, so any comparison should automatically fail.
  if (this.isGuest) return false;
  // Use bcrypt's safe compare function to check if the provided password matches the stored hash.
  // This is a secure way to do it, avoiding timing attacks.
  return await bcrypt.compare(candidatePassword, this.password);
};

// Now, we compile our schema into a 'User' model.
const User = mongoose.model("User", userSchema);

// And finally, we export it for our controllers to use.
module.exports = User;
