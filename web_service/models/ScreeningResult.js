/**
 * models/ScreeningResult.js
 * * This model stores an individual user's completed screening test result.
 * * It links the user, the test they took, their answers, and their final score.
 */
const mongoose = require('mongoose');

const screeningResultSchema = new mongoose.Schema({
    // The user who took the test
    user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
        index: true
    },
    // The specific test they took (e.g., the "PHQ-9" document)
    test: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'ScreeningTest',
        required: true
    },
    // An array of the raw scores (point values) for each answer.
    // e.g., For PHQ-9, this will be an array of 9 numbers like [0, 1, 3, 2, 0, 1, 0, 2, 1]
    answers: {
        type: [Number],
        required: true
    },
    totalScore: {
        type: Number,
        required: true
    },
    // The final interpreted risk level (e.g., "Moderate") based on the test's scoring rules.
    riskLevel: {
        type: String,
        required: true
    },
    // A flag to indicate if this result was high-risk and flagged for counselor review.
    isEscalated: {
        type: Boolean,
        default: false
    }
}, { timestamps: true }); // 'createdAt' will be the date the test was taken.

// Index to quickly find all results for a user
screeningResultSchema.index({ user: 1, createdAt: -1 });

module.exports = mongoose.model('ScreeningResult', screeningResultSchema);