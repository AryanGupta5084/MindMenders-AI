// routes/forumRoutes.js
// This is where we'll define all the API routes related to the community forum.
// Things like fetching posts, creating new posts, and adding comments.

const express = require('express');
const router = express.Router();

// We'll need our authentication middleware for the protected routes.
const { protect } = require('../middleware/authMiddleware');

// Import all the controller functions that this router will use.
const {
  getAllPosts,
  getPostById,
  createPost,
  addComment,
  deleteMyPost,
  deleteMyComment,
  reportPost, 
  reportComment
} = require('../controllers/forumController');


// --- Public Forum Routes ---
// These are visible to everyone, even if they aren't logged in.

// GET /api/forum/posts
// Fetches a list of all posts to display on the main forum page.
router.get('/posts', getAllPosts);

// GET /api/forum/posts/:id
// Gets the details of a single post, including its comments.
router.get('/posts/:id', getPostById);


// --- Protected Forum Routes ---
// Users need to be logged in to perform these actions.

// POST /api/forum/posts
// The endpoint for creating a brand new forum post.
router.post('/posts', protect, createPost);

// POST /api/forum/posts/:id/comments
// Allows a logged-in user to add a new comment to a specific post.
router.post('/posts/:id/comments', protect, addComment);

// DELETE /api/forum/posts/:id
// Allows a logged-in user to delete their own post.
router.delete('/posts/:id', protect, deleteMyPost);

// DELETE /api/forum/comments/:id
// Allows a logged-in user to delete their own comment.
router.delete('/comments/:id', protect, deleteMyComment);

// POST /api/forum/posts/:id/report
router.post('/posts/:id/report', protect, reportPost);

// POST /api/forum/comments/:id/report
router.post('/comments/:id/report', protect, reportComment);

// Finally, we export the configured router.
module.exports = router;
