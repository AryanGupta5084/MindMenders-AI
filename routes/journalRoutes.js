// routes/journalRoutes.js
// This file handles all API routes for the personal journal feature.
// It's a private feature, so every single route here will require the user to be logged in.

const express = require('express');
const router = express.Router();

// Our trusty authentication middleware.
const { protect } = require('../middleware/authMiddleware');

// Import the controller functions that do the actual work.
const { createJournalEntry, getJournalEntries, getJournalStats, deleteMyJournalEntry } = require('../controllers/journalController');


// --- Protected Journal Routes ---

// Apply the 'protect' middleware to all routes defined in this file.
// This is a great way to ensure no one can access journaling features without logging in first.
router.use(protect);


// This is a nice, clean way to chain routes for the same endpoint ('/').
// It handles both creating a new entry and getting all existing entries.
router.route('/')
  // POST /api/journal/ → Create a new journal entry.
  .post(createJournalEntry)
  // GET /api/journal/ → Fetch all of the user's journal entries.
  .get(getJournalEntries);


// GET /api/journal/stats → Get some statistics about the user's journaling habits.
// For example, mood trends, entry count, etc.
router.get('/stats', getJournalStats);

// DELETE /api/journal/:id
// Deletes a specific journal entry owned by the user.
router.delete('/:id', deleteMyJournalEntry);


// Don't forget to export the router!
module.exports = router;
