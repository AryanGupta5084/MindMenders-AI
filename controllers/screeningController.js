/**
 * controllers/screeningController.js
 * * This controller handles all logic for the standardized screening tools.
 * * It fetches tests for the user and processes their submissions.
 */
const ScreeningTest = require('../models/ScreeningTest');
const ScreeningResult = require('../models/ScreeningResult');

/**
 * @desc      Get a list of all available screening tests
 * @route     GET /api/screening
 * @access    Private
 */
exports.getAvailableTests = async (req, res) => {
    try {
        // Fetch all tests, but only the fields needed for the list view
        const tests = await ScreeningTest.find().select('testKey fullName description');
        res.status(200).json({ success: true, data: tests, error: null });
    } catch (error) {
        console.error("Error fetching available tests:", error);
        res.status(500).json({ success: false, data: null, error: 'Server error fetching tests.' });
    }
};

/**
 * @desc      Get the full data (questions/options) for a single test by its key
 * @route     GET /api/screening/:testKey
 * @access    Private
 */
exports.getTestByKey = async (req, res) => {
    try {
        const test = await ScreeningTest.findOne({ testKey: req.params.testKey });
        if (!test) {
            return res.status(404).json({ success: false, data: null, error: 'Test not found.' });
        }
        res.status(200).json({ success: true, data: test, error: null });
    } catch (error) {
        console.error("Error fetching test by key:", error);
        res.status(500).json({ success: false, data: null, error: 'Server error fetching test.' });
    }
};

/**
 * @desc      Submit a user's answers for a test and get their score
 * @route     POST /api/screening/:testKey
 * @access    Private
 */
exports.submitTest = async (req, res) => {
    try {
        const { answers } = req.body; // Expect an array of numbers, e.g., [0, 1, 3, 2, 1...]
        const test = await ScreeningTest.findOne({ testKey: req.params.testKey });

        if (!test) {
            return res.status(404).json({ success: false, data: null, error: 'Test not found.' });
        }

        // Validate that we received the correct number of answers
        if (!Array.isArray(answers) || answers.length !== test.questions.length) {
            return res.status(400).json({ success: false, data: null, error: 'Incorrect number of answers submitted.' });
        }

        // --- 1. Calculate Score ---
        const totalScore = answers.reduce((sum, val) => sum + val, 0);

        // --- 2. Interpret Score ---
        let resultInterpretation = null;
        for (const rule of test.scoringRules) {
            if (totalScore >= rule.minScore && totalScore <= rule.maxScore) {
                resultInterpretation = rule;
                break;
            }
        }

        if (!resultInterpretation) {
            // This should never happen if the rules are set up correctly, but it's a good safeguard
            return res.status(500).json({ success: false, error: 'Could not calculate score interpretation.' });
        }

        // --- 3. Escalation Logic ---
        // Let's define "high-risk" as "Moderate" or higher for GAD-7, and "Moderately Severe" or higher for PHQ-9.
        // We also explicitly escalate *any* non-zero answer to the suicide question on PHQ-9.
        let isEscalated = false;
        const suicidalAnswer = test.testKey === 'phq-9' ? answers[8] : 0; // PHQ-9 question #9

        if (resultInterpretation.interpretation.toLowerCase().includes('severe') || suicidalAnswer > 0) {
            isEscalated = true;
        }

        // --- 4. Save the Result ---
        const resultDoc = await ScreeningResult.create({
            user: req.user.id,
            test: test._id,
            answers: answers,
            totalScore: totalScore,
            riskLevel: resultInterpretation.interpretation,
            isEscalated: isEscalated
        });
        
        // --- 5. Return the full result to the user ---
        res.status(201).json({
            success: true,
            data: {
                ...resultInterpretation, // Contains minScore, maxScore, interpretation, recommendation
                totalScore: totalScore,
                isEscalated: isEscalated,
                resultId: resultDoc._id
            },
            error: null
        });

    } catch (error) {
        console.error("Error submitting test:", error);
        res.status(500).json({ success: false, data: null, error: 'Server error processing test results.' });
    }
};