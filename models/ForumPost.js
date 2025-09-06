/**
 * models/ForumPost.js
 * * This file defines the Mongoose model for a forum post. This is the core
 * of the forum, representing the initial topic that users will comment on.
 */

// We need Mongoose to define our schema and model.
const mongoose = require('mongoose');

// Let's define the schema for a forum post.
const forumPostSchema = new mongoose.Schema({
  // This links the post to the user who created it. Every post needs an author.
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User', // This tells Mongoose the ID refers to a document in the 'User' collection.
    required: true,
  },
  // The title of the forum post.
  title: {
    type: String,
    required: [true, 'A title is required for the post.'], // Provide a user-friendly error message.
    trim: true, // Automatically remove leading/trailing whitespace.
    maxlength: 150, // Keep titles from getting too long.
  },
  // The main body content of the post.
  content: {
    type: String,
    required: [true, 'Content is required for the post.'],
    trim: true,
    maxlength: 5000, // Allow for a decent-length post.
  },
  // Tags for categorizing the post, which can be used for filtering or searching.
  tags: {
    type: [String], // Stored as an array of strings.
    default: [],
  },
  // A flag to allow users to post without revealing their username.
  isAnonymous: {
    type: Boolean,
    default: false,
  },

  // Stores an array of User IDs who have reported this post.
  // We can check the array's size to see how many reports it has.
  reports: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }],
  
  // Just a little note for fellow developers: We're intentionally not embedding comments
  // here. Storing them in a separate 'ForumComment' collection is much better for performance
  // and scalability as a post could potentially have thousands of comments.
}, {
  // This handy option automatically adds `createdAt` and `updatedAt` timestamps.
  timestamps: true,
});

// --- Database Index ---
// This index will make it very fast to fetch all posts made by a specific user,
// sorted with the newest posts first. This is great for a user's profile page.
forumPostSchema.index({ user: 1, createdAt: -1 });

// Now, we compile our schema into a 'ForumPost' model.
const ForumPost = mongoose.model('ForumPost', forumPostSchema);

// And finally, export it so our controllers can use it to interact with the database.
module.exports = ForumPost;
