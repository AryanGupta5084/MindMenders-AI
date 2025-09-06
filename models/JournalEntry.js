/**
 * models/JournalEntry.js
 * * This file defines the Mongoose model for a user's journal entry.
 * It's a private and secure space for users to record their thoughts and moods.
 * A key feature here is the automatic encryption of the journal content for privacy.
 */

// We need Mongoose to define our schema and model.
const mongoose = require('mongoose');
// We also need our custom encryption and decryption utility functions.
const { encrypt, decrypt } = require('../utils/crypto');

// Let's define the schema for a single journal entry.
const journalEntrySchema = new mongoose.Schema({
  // This links the journal entry to a specific user. It's the most important field.
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User', // This tells Mongoose the ID refers to a document in the 'User' collection.
    required: true,
    index: true, // We'll often be fetching all entries for a user, so an index here is great for speed.
  },
  // This stores the mood the user manually selects when creating the entry.
  mood: {
    type: String,
    required: true,
    enum: ['awful', 'bad', 'meh', 'good', 'great'], // `enum` ensures the mood is always one of these valid options.
  },
  // This is the user's private written content.
  content: {
    type: String,
    required: true,
    trim: true, // Automatically removes any extra whitespace from the beginning or end.
    maxlength: 10000, // A generous character limit for the entry.
    // --- PRIVACY FEATURE ---
    // The `get` and `set` functions are Mongoose middleware.
    // `set`: Before saving to the database, the `encrypt` function is automatically called on the content.
    // `get`: Whenever we retrieve the entry, the `decrypt` function is automatically called.
    // This ensures the journal content is always encrypted in the database ("at rest").
    get: decrypt,
    set: encrypt,
  },
  // This field will store the sentiment (e.g., 'anxiety', 'stress') that is
  // automatically determined by our external Python sentiment analysis service.
  analyzedSentiment: {
    type: String,
    enum: ['anxiety', 'depression', 'neutral', 'stress', 'suicidal', null],
  },
  // We store the specific date the entry is for. This is crucial for tracking streaks
  // and for the unique index below, which prevents a user from making two entries on the same day.
  entryDate: {
    type: Date,
    required: true,
  }
}, {
  // Automatically adds `createdAt` and `updatedAt` timestamps.
  timestamps: true,
  // These options ensure that when we convert the Mongoose document to JSON (e.g., to send in an API response),
  // our custom `get` functions (like `decrypt` on the content field) are applied.
  toJSON: { getters: true },
  toObject: { getters: true }
});

// --- Database Index for Data Integrity ---
// This is a compound unique index. It enforces a rule that the combination of a `user` ID
// and an `entryDate` must be unique across all documents in the collection.
// In simple terms: a single user cannot create more than one journal entry for the same date.
journalEntrySchema.index({ user: 1, entryDate: 1 }, { unique: true });

// Now, we compile our schema into a 'JournalEntry' model.
const JournalEntry = mongoose.model('JournalEntry', journalEntrySchema);

// And finally, we export it for our controllers to use.
module.exports = JournalEntry;
