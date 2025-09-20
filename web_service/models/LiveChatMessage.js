/**
 * models/LiveChatMessage.js
 * * This file defines the Mongoose model for a single message sent during a live
 * chat session between a user and a counselor, which is linked to a specific appointment.
 * The messages are encrypted to ensure privacy.
 */

// We need Mongoose to define our schema and model.
const mongoose = require('mongoose');
// We'll also use our custom encryption/decryption utilities for message privacy.
const { encrypt, decrypt } = require('../utils/crypto');

// Let's define the schema for a live chat message.
const liveChatMessageSchema = new mongoose.Schema({
  // This links the message to a specific appointment session. It's how we'll group
  // all messages for a particular chat history.
  appointment: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Appointment', // This tells Mongoose the ID refers to a document in the 'Appointment' collection.
    required: true,
    index: true, // An index here is critical for performance, allowing us to quickly fetch all messages for an appointment.
  },
  // This records who sent the message – it could be the user or the counselor.
  sender: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User', // The sender will always be a registered user.
    required: true,
  },
  // The actual text content of the message.
  message: {
    type: String,
    required: true,
    // --- PRIVACY FEATURE ---
    // Just like with journal entries, we automatically encrypt messages before they're saved
    // and decrypt them when they're retrieved. This keeps the conversation content secure in the database.
    get: decrypt,
    set: encrypt,
  },
}, {
  // Automatically add `createdAt` and `updatedAt` timestamps. `createdAt` is perfect for showing when a message was sent.
  timestamps: true,
  // These options are essential to make sure our `get` function (the `decrypt` utility) is
  // applied when we send the message data back in an API response.
  toJSON: { getters: true },
  toObject: { getters: true }
});

// Now, we compile our schema into a 'LiveChatMessage' model.
const LiveChatMessage = mongoose.model('LiveChatMessage', liveChatMessageSchema);

// And finally, we export it so our real-time chat service and controllers can use it.
module.exports = LiveChatMessage;
