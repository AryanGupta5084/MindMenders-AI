/**
 * models/Chat.js
 * * This is the Mongoose model for our chat messages. It's a critical part of the app,
 * defining how each message, its AI response, and its associated metadata are stored.
 * It also includes fields for handling guest users and encrypting sensitive messages.
 */

// We need Mongoose to define the schema and model.
const mongoose = require('mongoose');
// We'll import our custom encryption and decryption functions to protect user privacy.
const { encrypt, decrypt } = require('../utils/crypto');

// Let's define the schema for a single chat entry.
const chatSchema = new mongoose.Schema({
    // A unique identifier for a single conversation session. This allows us to
    // group messages from the same chat together, even for guest users.
    sessionId: {
        type: String,
        required: true,
        index: true // We'll query by this a lot, so an index is a good idea.
    },
    // A flag set by our system if a message contains concerning content, like suicidal ideation.
    // This is useful for moderation and safety reviews.
    flag: {
        type: String,
        enum: ['anxiety', 'depression', 'neutral', 'stress', 'suicidal', null],
        default: null
    },
    // The user who sent the message. This is not required because guests can also chat.
    user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: false // We'll leave this null for guest users.
    },
    // A simple boolean to quickly identify chats from guest users.
    isGuest: {
        type: Boolean,
        default: false
    },
    // The user's original message.
    originalMessage: {
        type: String,
        get: decrypt,
        set: encrypt
    },
    // The user's translated message.
    message: {
        type: String,
        required: true,
        // These `get` and `set` functions are a powerful Mongoose feature.
        // 'set' automatically calls our `encrypt` function before saving to the DB.
        // 'get' automatically calls our `decrypt` function when we fetch the data.
        get: decrypt,
        set: encrypt
    },
    // The AI's response to the user's message.
    response: {
        type: String,
        required: true,
        get: decrypt, // We encrypt the AI's response too, for complete privacy.
        set: encrypt
    },
    // The sentiment detected by our analysis service (e.g., 'anxiety', 'stress').
    sentiment: {
        type: String,
        required: true,
        enum: ['anxiety', 'depression', 'neutral', 'stress', 'suicidal']
    },
    // The confidence score (from 0 to 1) of the sentiment analysis.
    confidence: {
        type: Number,
        required: true,
        min: 0,
        max: 1
    },
    // A boolean flag indicating if the sentiment analysis detected a need for immediate help.
    needs_immediate_help: {
        type: Boolean,
        default: false
    },
    // This is a special field for MongoDB's TTL (Time-To-Live) feature.
    // We only set this for guest chats, so the database automatically deletes them after a certain time.
    expireAt: {
        type: Date,
        default: null
    }
}, {
    // Automatically add `createdAt` and `updatedAt` timestamps.
    timestamps: true,
    // These options ensure that our `get` functions (for decryption) are applied
    // whenever we convert the document to JSON or a plain JavaScript object.
    toJSON: { getters: true },
    toObject: { getters: true }
});

// --- Database Indexes ---

// A compound index to speed up fetching chat history for a specific user's session.
chatSchema.index({ user: 1, sessionId: 1, createdAt: 1 });
// This is the TTL index. It tells MongoDB to look at the `expireAt` field and
// automatically delete any document where the current time is past the specified time.
// `expireAfterSeconds: 0` means "delete it as soon as `expireAt` is reached".
chatSchema.index({ expireAt: 1 }, { expireAfterSeconds: 0 });

// Compile the schema into a model and export it.
module.exports = mongoose.model('Chat', chatSchema);
