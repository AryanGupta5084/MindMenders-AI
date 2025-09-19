/**
 * controllers/exerciseController.js
 * * This controller manages the interactive guided exercises.
 * It fetches the list of exercises and uses the Gemini AI to create a dynamic,
 * conversational experience as the user progresses through the steps of an exercise.
 */

// We'll need our GuidedExercise model to fetch exercise data from the DB.
const GuidedExercise = require('../models/GuidedExercise');
// And of course, the Google Generative AI for our smart responses.
const { GoogleGenerativeAI } = require("@google/generative-ai");

// Let's get the AI model ready with our API key.
const genAI = new GoogleGenerativeAI(process.env.GOOGLE_API_KEY);

// @desc      Get all available guided exercises
// @route     GET /api/exercises
// @access    Private
exports.getExercises = async (req, res) => {
  try {
    // Find all exercises, but we don't need to send all the step-by-step data yet.
    // Using .select() is a neat way to keep the payload light, only sending what's needed for the list view.
    const exercises = await GuidedExercise.find().select('title description category');
    res.status(200).json({ success: true, data: exercises, error: null });
  } catch (error) {
    console.error("Failed to fetch exercises:", error);
    res.status(500).json({ success: false, data: null, error: 'Server error fetching exercises.' });
  }
};

// @desc      Start an exercise or process a step
// @route     POST /api/exercises/start
// @access    Private
exports.startOrContinueExercise = async (req, res) => {
  try {
    const { exerciseId, userResponse, currentStep } = req.body;

    // First things first, let's find the exercise the user wants to do.
    const exercise = await GuidedExercise.findById(exerciseId);
    if (!exercise) {
      // No exercise with that ID? Send a 404 Not Found.
      return res.status(404).json({ success: false, data: null, error: 'Exercise not found.' });
    }

    // --- Handling the very first step ---
    // If the client doesn't provide a `currentStep`, it means the user is just starting.
    if (!currentStep) {
      // Find the first step (the one with stepNumber 1).
      const firstStep = exercise.steps.find(s => s.stepNumber === 1);
      // Send back the prompt for the first step to get things rolling.
      return res.status(200).json({
        success: true,
        data: {
          nextPrompt: firstStep.prompt,
          nextStep: 1, // Tell the client we're on step 1.
          isComplete: false
        },
        error: null
      });
    }

    // --- AI-Powered Step Progression for all subsequent steps ---
    const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });

    // We need to know what the user was just asked.
    const previousStep = exercise.steps.find(s => s.stepNumber === currentStep);
    
    // And what the next question in the script is.
    const nextStepNumber = currentStep + 1;
    const nextStep = exercise.steps.find(s => s.stepNumber === nextStepNumber);

    // --- Handling the end of the exercise ---
    if (!nextStep) {
      // If there's no next step in our script, the exercise is over.
      return res.status(200).json({
        success: true,
        data: {
          nextPrompt: "You've completed the exercise. Take a moment to reflect on your thoughts. Well done.",
          isComplete: true // Signal to the client that we're finished.
        },
        error: null
      });
    }

    // --- Dynamic Prompt Engineering based on Step Type ---
    // This logic dynamically instructs the AI on how to behave based on
    // whether the user is answering a question or just finished an instruction.
    let promptTask = '';
    
    if (previousStep.stepType === 'user_input') {
        // The user just answered a real question. We need to validate their input and transition.
        promptTask = `
            The user was just asked: "${previousStep.prompt}"
            The user responded: "${userResponse}"
            
            Your task is to provide a gentle, validating, and transitional response that acknowledges the user's input and naturally leads into the next question. Keep it brief and encouraging.
        `;
    } else {
        // The user just finished an 'instruction' step and clicked continue. The userResponse is irrelevant.
        promptTask = `
            The user was just shown the instruction: "${previousStep.prompt}"
            The user has clicked "continue" to move on.

            Your task is to provide a very simple transitional phrase (like "Great.", "Okay, next...", or "Well done.") and then immediately present the next question.
        `;
    }
    
    // --- Prompt Engineering for a Therapeutic Response ---
    // This is where we instruct the AI. We give it a role, context, and a clear task.
    const prompt = `
      You are an AI therapist guiding a user through a Cognitive Behavioral Therapy (CBT) exercise called "${exercise.title}".
      
      // This next section defines your context and task based on the user's last action.
      ${promptTask}
      
      // This is the next required step you must guide the user to.
      The next step in the exercise is to ask: "${nextStep.prompt}"

      // Combine your task (from above) with the next step's question into a single, natural response.
      Respond directly with the text that should be shown to the user.
    `;

    // Ask Gemini to generate the content based on our detailed prompt.
    const result = await model.generateContent(prompt);
    const response = await result.response;
    // This is the AI-generated text that will bridge the gap between steps.
    const aiTransition = response.text();

    // Send the AI's thoughtful transition back to the user.
    res.status(200).json({
      success: true,
      data: {
        nextPrompt: aiTransition,
        nextStep: nextStepNumber, // Let the client know the new step number.
        isComplete: false
      },
      error: null
    });

  } catch (error) {
    console.error("Exercise processing error:", error);
    res.status(500).json({ success: false, data: null, error: 'Server error processing exercise step.' });
  }
};
