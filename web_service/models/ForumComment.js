/**
 * models/ForumComment.js
 * * This file defines the Mongoose model for a single comment on a forum post.
 * It links a user's comment to a specific post and includes options for anonymity.
 */

// We need Mongoose to define our schema and model.
const mongoose = require('mongoose');

// Let's define the schema for a forum comment.
const forumCommentSchema = new mongoose.Schema({
  // This is the link back to the parent post. It's the most important relationship here.
  post: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'ForumPost', // This tells Mongoose that this ID refers to a document in the 'ForumPost' collection.
    required: true,
    index: true, // We'll be fetching all comments for a post, so this index is crucial for performance.
  },
  // This links the comment to the user who wrote it.
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true, // A comment must have an author.
  },
  // The actual text content of the comment.
  content: {
    type: String,
    required: [true, 'Comment content cannot be empty.'], // A custom error message for better feedback.
    trim: true, // Automatically remove any leading or trailing whitespace.
    maxlength: 2000, // Let's keep comments to a reasonable length.
  },
  // A simple flag that allows the user to post this comment anonymously.
  // The controller will handle showing "Anonymous" instead of their username.
  isAnonymous: {
    type: Boolean,
    default: false,
  },

  // Stores an array of User IDs who have reported this comment.
  reports: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }],
}, {
  // This option automatically adds `createdAt` and `updatedAt` fields to our documents.
  timestamps: true,
});

// --- Database Index ---
// This compound index is a performance powerhouse. It allows MongoDB to efficiently
// find all comments for a specific `post` and already have them sorted by `createdAt`.
// This makes loading a post and its comments page super fast.
forumCommentSchema.index({ post: 1, createdAt: 1 });

// Now we compile our schema into a model.
const ForumComment = mongoose.model('ForumComment', forumCommentSchema);

// And finally, we export it for use in our controllers.
module.exports = ForumComment;
