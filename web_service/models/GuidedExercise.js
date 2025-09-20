/**
 * models/GuidedExercise.js
 * * This file defines the Mongoose model for a Guided Exercise. These are structured,
 * multi-step activities designed to help users with specific wellness techniques
 * like mindfulness or Cognitive Behavioral Therapy (CBT).
 */

// We need Mongoose to create our schemas and models.
const mongoose = require('mongoose');

// --- Exercise Step Sub-Schema ---
// Before creating the main exercise, we need a blueprint for each individual step.
// This is a sub-schema, meaning it doesn't create its own collection in the database.
// Instead, it defines the structure for objects within an array in the main exercise schema.
const exerciseStepSchema = new mongoose.Schema({
  // A simple number to keep the steps in the correct order.
  stepNumber: {
    type: Number,
    required: true
  },
  // This is the core of the step: the text prompt, question, or instruction for the user.
  prompt: {
    type: String,
    required: true
  },
  // This helps the front-end know how to display the step.
  // 'instruction' might just show a "Continue" button, whereas 'user_input'
  // would show a text box for the user to type a response.
  stepType: {
    type: String,
    enum: ['instruction', 'user_input'],
    default: 'user_input',
  },
}, { _id: false }); // We don't need a separate _id for each step.

// --- Main Guided Exercise Schema ---
const guidedExerciseSchema = new mongoose.Schema({
  // The public-facing title of the exercise.
  title: {
    type: String,
    required: true,
    unique: true, // Each exercise should have a unique title.
  },
  // A brief summary explaining what the exercise is about and its benefits.
  description: {
    type: String,
    required: true,
  },
  // Categories help users find the type of exercise they're looking for.
  category: {
    type: String,
    enum: ['Mindfulness', 'CBT', 'Stress Relief'],
    required: true,
  },
  // Here, we embed an array of our `exerciseStepSchema` blueprints.
  // This creates the ordered, step-by-step structure of the exercise.
  steps: [exerciseStepSchema],
}, {
  // Automatically add `createdAt` and `updatedAt` timestamps.
  timestamps: true,
});

// Now we compile our main schema into a 'GuidedExercise' model.
const GuidedExercise = mongoose.model('GuidedExercise', guidedExerciseSchema);

// And finally, export it for use in our controllers.
module.exports = GuidedExercise;
