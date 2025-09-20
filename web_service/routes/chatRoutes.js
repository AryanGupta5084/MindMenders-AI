// routes/chatRoutes.js
// This file will handle all the API routes related to our chat feature.

const express = require("express");
const router = express.Router();

// Pull in the controller functions that do the actual work.
const { 
    sendMessage, 
    getChatHistory, 
    deleteAllChats, 
    getChatSessions 
} = require("../controllers/chatController");

// And our trusty authentication middleware. All chat functions should be protected.
const { protect } = require("../middleware/authMiddleware");

// --- Protected Chat Routes ---
// A user must be logged in to use any of these chat features.

// POST /api/chat/message
// The main endpoint for a user to send a new message.
router.post("/message", protect, sendMessage);

// GET /api/chat/history
// Used to retrieve the chat history for a user's current session.
router.get("/history", protect, getChatHistory);

// DELETE /api/chat/history
// A bit of a destructive one... this lets a user wipe their entire chat history.
// We should probably add a confirmation step on the frontend for this.
router.delete("/history", protect, deleteAllChats);

// GET /api/chat/sessions
// This will get a list of all past chat sessions a user has had.
// Useful for letting them jump back into an old conversation.
router.get("/sessions", protect, getChatSessions);


// And finally, export the router.
module.exports = router;
