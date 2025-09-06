/**
 * models/Resource.js
 * * This file defines the Mongoose model for a wellness Resource.
 * Resources are external content like articles, videos, or audio clips that we can
 * recommend to users based on their needs, language, or interests.
 */

// We need Mongoose to define our schema and model.
const mongoose = require('mongoose');

// Let's define the schema for a single resource.
const resourceSchema = new mongoose.Schema({
  // The main, user-facing title of the resource.
  title: {
    type: String,
    required: [true, 'A title is required.'],
    trim: true, // Automatically remove leading/trailing whitespace.
  },
  // A brief summary of what the resource is about.
  description: {
    type: String,
    required: [true, 'A description is required.'],
    trim: true,
  },
  // The format of the resource. Using an `enum` ensures the type is always
  // one of these predefined values, which keeps our data clean and reliable.
  type: {
    type: String,
    required: true,
    enum: ['video', 'audio', 'article'],
  },
  // The direct URL to access the resource.
  url: {
    type: String,
    required: [true, 'A URL is required.'],
  },
  // The language of the resource content. The `enum` contains ISO 639-1 language codes.
  language: {
    type: String,
    required: true,
    enum: ['en', 'hi', 'pa', 'bn', 'ta', 'te', 'ml', 'mr', 'gu', 'kn'],
    default: 'en', // Default to English if no language is specified.
  },
  // An array of keywords that describe the resource. This is super helpful for
  // allowing users to filter and find relevant content.
  // Example tags: 'stress', 'anxiety', 'breathing-exercise', 'motivation'
  tags: {
    type: [String],
    default: [],
  },
}, {
  // Automatically add `createdAt` and `updatedAt` timestamps to each document.
  timestamps: true,
});

// --- Database Indexes for Performance ---
// Indexes help MongoDB quickly find documents without scanning the entire collection.
// We should add them to any fields that will be frequently used in filters or queries.

// Index for quickly filtering resources by their language.
resourceSchema.index({ language: 1 });
// Index for quickly finding resources that contain a specific tag.
resourceSchema.index({ tags: 1 });

// Now, we compile our schema into a 'Resource' model.
const Resource = mongoose.model('Resource', resourceSchema);

// And finally, we export it so our controllers can use it to manage resources.
module.exports = Resource;
