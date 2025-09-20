/**
 * models/ScreeningTest.js
 * * This model defines the structure for a standardized screening questionnaire,
 * * such as the PHQ-9 or GAD-7. It stores the questions, answer options,
 * * and the rules for scoring the test.
 */
const mongoose = require('mongoose');

// Sub-schema for a single answer option (e.g., "Not at all" = 0 points)
const optionSchema = new mongoose.Schema({
    text: { type: String, required: true },
    value: { type: Number, required: true } // The point value for this answer
}, { _id: false });

// Sub-schema for a single question
const questionSchema = new mongoose.Schema({
    questionNumber: { type: Number, required: true },
    text: { type: String, required: true }
}, { _id: false });

// Sub-schema for interpreting the final score (e.g., 10-14 = "Moderate Depression")
const scoringRuleSchema = new mongoose.Schema({
    minScore: { type: Number, required: true },
    maxScore: { type: Number, required: true },
    interpretation: { type: String, required: true }, // e.g., "Mild", "Moderate", "Severe"
    recommendation: { type: String, required: true } // e.g., "Consider speaking to a professional."
}, { _id: false });

// --- Main Screening Test Schema ---
const screeningTestSchema = new mongoose.Schema({
    // A unique short-name/slug for the test (e.g., "phq-9", "gad-7")
    testKey: {
        type: String,
        required: true,
        unique: true,
        index: true
    },
    // The full, user-facing name
    fullName: {
        type: String,
        required: true
    },
    description: {
        type: String,
        required: true
    },
    // The array of questions
    questions: [questionSchema],
    // The array of answer options (these are the same for every question in PHQ-9/GAD-7)
    options: [optionSchema],
    // The array of rules to interpret the total score
    scoringRules: [scoringRuleSchema]
}, { timestamps: true });


module.exports = mongoose.model('ScreeningTest', screeningTestSchema);