/**
 * controllers/chatController.js
 * * This is the heart of our AI chat functionality. It connects to the database,
 * initializes the AI model, processes incoming messages, analyzes sentiment,
 * maintains conversation history, and sends back thoughtful responses.
 */

// --- IMPORTS ---
// Let's bring in all the tools we'll need.
const mongoose = require("mongoose");
const { GoogleGenerativeAI } = require("@google/generative-ai");
const axios = require('axios'); // For making HTTP requests, like to our sentiment service.
const Chat = require('../models/Chat'); // Our database model for storing chat messages.
const { encrypt, decrypt } = require('../utils/crypto'); // Utility functions to keep chat logs private.
const { translateText } = require('../utils/translate'); // For supporting multiple languages.
const { getHelplines } = require('../utils/helplines'); // For providing safety resources.
const { v4: uuidv4 } = require('uuid');
const jwt = require('jsonwebtoken');


// ------------------- Gemini AI Initialization -------------------
// Here we wake up our AI brain, giving it the API key it needs to think.
const genAI = new GoogleGenerativeAI(process.env.GOOGLE_API_KEY);


// ------------------- Sentiment Analysis Helper -------------------
// This function helps us understand the user's emotional state.
async function analyzeSentiment(text) {
  try {
    // We're calling a separate, dedicated service to analyze the text.
    // This keeps our main app focused. The URL is stored in environment variables.
    const response = await axios.post(process.env.SENTIMENT_SERVICE_URL, { text });
    return response.data;
  } catch (error) {
    // If the sentiment service is down or there's an error, we don't want to crash.
    // We'll log the issue and just assume a neutral emotion as a safe fallback.
    console.error('Sentiment analysis error:', error.message);
    return { emotion: 'neutral', confidence: 0, needs_immediate_help: false };
  }
}


// ------------------- Context Memory Helper -------------------
// This function stitches together recent messages to give the AI some short-term memory.
function buildContextThread(chatHistory) {
  // We format the history into a simple "User: ... AI: ..." script.
  // This helps the AI follow the conversational flow.
  return chatHistory
    .map(({ message, response }) => `User: ${message}\nMindfulChat: ${response}`)
    .join('\n\n'); // Separate turns with a double newline for clarity.
}


// ------------------- Topic Reset Detection Helper -------------------
// A simple way to check if the user wants to change the subject.
function isNewTopic(userMessage) {
  // We keep a list of common phrases people might use to start over.
  const resetTriggers = [
    "let's talk about something else",
    "new topic",
    "change subject",
    "different issue",
    "start fresh"
  ];
  const normalized = userMessage.toLowerCase(); // Case-insensitive check.
  // If the user's message includes any of our trigger phrases, we return true.
  return resetTriggers.some(trigger => normalized.includes(trigger));
}


// ------------------- Main Gemini AI Response Function -------------------
// This is where the magic happens. We build a detailed prompt and ask Gemini for a response.
async function getGeminiResponse(userMessage, emotion, confidence, locale = 'en', historyContext = '') {
    try {
        // We're using the gemini-2.0-flash model, which is great for fast chat applications.
        const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });

        // Based on the sentiment analysis, we prepare some internal notes for the AI.
        // This helps it tailor its response to be more empathetic and relevant.
        let emotionContext = "";
        let youthExamples = "";
        if (confidence > 0.7) { // We only act on high-confidence emotions.
            switch (emotion) {
                case "anxiety":
                    emotionContext = "The user is showing signs of anxiety. Focus on calming, grounding techniques, and gentle reassurance. Ask what's making them feel overwhelmed.";
                    youthExamples = "Relate to common stressors like exam pressure, social situations, or uncertainty about the future.";
                    break;
                case "depression":
                    emotionContext = "The user is showing signs of depression. Emphasize that their feelings are valid. Focus on hope, small steps, and self-compassion. Avoid toxic positivity.";
                    youthExamples = "Acknowledge feelings of loneliness or lack of motivation that many young people face.";
                    break;
                case "stress":
                    emotionContext = "The user is experiencing stress. Help them identify the source of the stress and suggest simple, actionable relaxation techniques.";
                    youthExamples = "Connect with the pressures of academics, deadlines, or family expectations.";
                    break;
                case "suicidal":
                    emotionContext = "CRITICAL SAFETY ALERT: The user is showing signs of suicidal ideation. Your absolute first priority is to be gentle, validate their pain without validating the idea of self-harm, and immediately provide the helplines.";
                    youthExamples = "Ensure the tone is extremely soft and caring, not alarming.";
                    break;
                default:
                    emotionContext = `The user seems to be in a ${emotion} state. Be an empathetic listener.`;
            }
        }

        // Get the correct list of helplines based on the user's language/locale.
        const helplineText = getHelplines(locale).join('\n');

        // This is the prompt. It's like a detailed instruction manual for the AI.
        // We give it a persona, rules to follow, the conversation history, and our analysis.
        const prompt = `
            You are Sahara, an expert AI wellness companion for Indian youth. Your persona is that of a warm, patient, and deeply empathetic friend who listens without judgment.

            **Your Core Directives:**
            1.  **MAINTAIN CONTEXT:** This is your most important task. The conversation history is provided below. You MUST remember what the user has already told you in this session and refer to it to show you are listening. Avoid asking questions the user has already answered.
            2.  **BE INTERACTIVE, NOT A ROBOT:** Do not just provide generic advice. Your goal is to have a real conversation. Ask gentle, open-ended follow-up questions to help the user explore their feelings (e.g., "That sounds really tough, can you tell me more about what that felt like?").
            3.  **VALIDATE FEELINGS:** Always start by acknowledging and validating the user's feelings (e.g., "It makes complete sense that you would feel that way," or "Thank you for sharing that with me.").
            4.  **OFFER GENTLE SUGGESTIONS:** Instead of commanding, suggest small, actionable coping strategies from the problem statement (e.g., "Sometimes, just focusing on our breath for a moment can help. Would you be open to trying that?").
            5.  **BE CULTURALLY SENSITIVE:** Use relatable Indian examples (exams, family, festivals, local food) to build trust.

            --- Conversation History (Most Recent Last) ---
            ${historyContext || "This is the first message of the conversation."}
            ---------------------------------------------

            Current User Message: "${userMessage}"

            **Internal Analysis (For Your Eyes Only):**
            -   **Detected Emotion:** ${emotion} (Confidence: ${(confidence * 100).toFixed(0)}%)
            -   **Strategy:** ${emotionContext}

            **Critical Safety Protocol:**
            -   If the detected emotion is 'suicidal', your **FIRST priority** is to gently and immediately provide the helplines. Weave them into a caring message like: "It sounds like you are in an incredible amount of pain, and I'm so sorry you're going through this. Please know there are people who want to help right now. You can connect with them here:"
            -   **Helplines:**
                ${helplineText}

            **Your Task:**
            Based on the full context and conversation history, provide a short, supportive, and interactive response.
        `;

        // Send the prompt to the Gemini API and wait for its response.
        const result = await model.generateContent(prompt);
        const response = await result.response;
        return response.text();

    } catch (error) {
        // If the AI fails, we need a graceful fallback message.
        console.error('🔴 Gemini API error:', error.message);
        return "I'm sorry, I'm having trouble forming a response. If you're feeling overwhelmed, please reach out to one of the helplines listed in our resources.";
    }
}


// ------------------- API Controllers -------------------
// These are the functions that our API routes will actually call.

/**
 * @desc      Process a new incoming chat message
 * @route     POST /api/chat/send
 * @access    Private (or Guest)
 */
const sendMessage = async (req, res) => {
  const locale = req.locale || 'en'; // User's language.
  try {
    const { message } = req.body;
    // Can't send an empty message.
    if (!message || message.trim() === '') {
      return res.status(400).json({ success: false, data: null, error: 'Message cannot be empty.' });
    }
    
    // Split the message by whitespace and count the words.
    const wordCount = message.trim().split(/\s+/).length;
    if (wordCount > 100) {
        // Reject the request if it exceeds the word limit.
        return res.status(400).json({ 
            success: false, 
            data: null, 
            error: 'Message cannot exceed 100 words.' 
        });
    }
    
    // Figure out if this is a logged-in user or a temporary guest.
    const isGuest = req.user.isGuest || false;
    const userId = isGuest ? null : req.user._id;
    let sessionId = req.sessionId; // Unique ID for this conversation session.
    let newToken = null; // This will hold a new token if we generate one.

    // If the user isn't speaking English, translate their message first.
    const translatedMessageResult = (locale === 'en')
      ? { success: true, text: message }
      : await translateText(message, 'en');

    // If the translation service fails, we can't proceed.
    if (!translatedMessageResult.success) {
      console.error('Translation to English failed for message:', message);
      return res.status(503).json({ 
        success: false, 
        data: null, 
        error: 'Sorry, I am having trouble understanding that language right now. Please try again in English.' 
      });
    }
    const translatedMessage = translatedMessageResult.text;
    
    // Now, analyze the sentiment of the (English) message.
    const sentimentResult = await analyzeSentiment(translatedMessage);
    
    const newTopicDetected = isNewTopic(translatedMessage);
    
    if (newTopicDetected) {
        // If it's a new topic, generate a new session ID to create a fresh context.
        sessionId = uuidv4(); 
        // We must also generate a new token for the client to use from now on,
        // so their subsequent requests are associated with this new session.
        newToken = jwt.sign(
            { id: req.user._id, sessionId: sessionId, isGuest: isGuest },
            process.env.JWT_SECRET,
            { expiresIn: process.env.JWT_EXPIRE || '7d' }
        );
    }

    // Let's fetch the last few messages to give the AI some context.
    let historyContext = '';
    // Build context for ALL users (guests included) as long as they aren't changing the topic.
    if (!newTopicDetected) {
      // The history is tied to the unique session ID.
      const historyFilter = { sessionId };
      // For registered users, we can add the user ID to make the query more specific.
      if (!isGuest) {
        historyFilter.user = userId;
      }

      const pastChats = await Chat.find(historyFilter).sort({ createdAt: -1 }).limit(5);
      
      // The Mongoose getter automatically decrypts the fields when accessed.
      const recentHistory = pastChats.reverse().map(chat => ({
        message: chat.message,
        response: chat.response
      }));
      historyContext = buildContextThread(recentHistory);
    }
    
    // Get the AI's response in English.
    const aiResponseEnglish = await getGeminiResponse(translatedMessage, sentimentResult.emotion, sentimentResult.confidence, locale, historyContext);
    
    // If the original message wasn't in English, translate the AI's response back.
    const finalResponseResult = (locale === 'en')
      ? { success: true, text: aiResponseEnglish }
      : await translateText(aiResponseEnglish, locale);
    
    // It's better to give an English response than no response if the translation back fails.
    const finalResponse = finalResponseResult.text;

    // Prepare the data to be saved in our database.
    const chatData = {
      user: userId, 
      isGuest, 
      sessionId,
      originalMessage: encrypt(message),  // Store the user's original, untranslated message.
      message: encrypt(translatedMessage), // Encrypt the translated message for privacy.
      response: encrypt(finalResponse), // Encrypt the AI's response.
      sentiment: sentimentResult.emotion,
      confidence: sentimentResult.confidence,
      needs_immediate_help: sentimentResult.needs_immediate_help,
      // Flag messages that might need review.
      flag: sentimentResult.needs_immediate_help ? 'suicidal' : null
    };

    // Guest chats should expire after 7 days to save space.
    if (isGuest) {
      // This syncs the chat message's expiration to the guest user's account expiration.
      chatData.expireAt = req.user.expireAt;
    }
    
    // Save the new chat entry to the database.
    const chat = await Chat.create(chatData);

    // Send a clean, successful response back to the client.
    res.status(200).json({
      success: true,
      data: {
        message, // The original, unencrypted message.
        response: finalResponse,
        sentiment: chat.sentiment,
        confidence: chat.confidence,
        needs_immediate_help: chat.needs_immediate_help,
        timestamp: chat.createdAt,
        isGuest: chat.isGuest,
        sessionId: chat.sessionId,
        newToken: newToken
      },
      error: null
    });

  } catch (error) {
    console.error('Error in sendMessage:', error.message);
    const errorFallback = "Failed to process message due to a server error.";
    const translatedErrorResult = (locale === 'en')
      ? { text: errorFallback } // No need to call API if we just need English
      : await translateText(errorFallback, locale); // Translate the error
      
    res.status(500).json({ 
        success: false, 
        data: null, 
        error: translatedErrorResult.text // Send the translated error
    });
  }
};


/**
 * @desc      Get the chat history for a specific session
 * @route     GET /api/chat/history
 * @access    Private
 */
const getChatHistory = async (req, res) => {
  try {
    const { _id: userId, isGuest } = req.user;
    // The client can specify which session they want to see.
    const sessionId = req.query.sessionId || req.sessionId;
    
    let filter = {};

    if (isGuest) {
        // For guest users, messages are saved with 'user: null' and 'isGuest: true'.
        // We MUST query using the session ID and isGuest flag, not the user ID.
        filter = { 
            sessionId: sessionId, 
            isGuest: true 
        };
    } else {
        // For registered users, the original logic is correct.
        filter = { 
            user: userId, 
            sessionId: sessionId 
        };
    }
    const history = await Chat.find(filter).sort({ createdAt: 1 }).select('-__v');

    // We need to decrypt the history before sending it to the client.
    const decryptedHistory = history.map(chat => ({
      _id: chat._id,
      // Simply access the properties; the getter hook decrypts them automatically.
      message: chat.originalMessage ? chat.originalMessage : chat.message, 
      response: chat.response,
      sentiment: chat.sentiment,
      confidence: chat.confidence,
      needs_immediate_help: chat.needs_immediate_help,
      timestamp: chat.createdAt,
      sessionId: chat.sessionId
    }));

    res.status(200).json({ success: true, data: decryptedHistory, error: null });

  } catch (error) {
    console.error('Error in getChatHistory:', error.message);
    res.status(500).json({ success: false, data: null, error: 'Failed to retrieve chat history.' });
  }
};


/**
 * @desc      Delete all chat history for the logged-in user
 * @route     DELETE /api/chat/all
 * @access    Private
 */
const deleteAllChats = async (req, res) => {
  try {
    const userId = req.user._id;
    // A straightforward delete operation.
    await Chat.deleteMany({ user: userId });

    res.status(200).json({ success: true, data: { message: 'All chats deleted successfully.' }, error: null });

  } catch (error) {
    console.error('Error in deleteAllChats:', error.message);
    res.status(500).json({ success: false, data: null, error: 'Failed to delete chats.' });
  }
};


/**
 * @desc      Get a list of all unique chat sessions for a user
 * @route     GET /api/chat/sessions
 * @access    Private
 */
const getChatSessions = async (req, res) => {
  try {
    const userId = req.user._id;

    // This is a more advanced database query to get a clean list of sessions.
    const sessions = await Chat.aggregate([
      // Stage 1: Find all chats belonging to this user.
      { $match: { user: mongoose.Types.ObjectId(userId) } },
      // Stage 2: Sort them so we can find the earliest message easily.
      { $sort: { createdAt: -1 } },
      // Stage 3: Group all messages by their `sessionId`.
      { 
        $group: { 
          _id: "$sessionId", // The field we're grouping by.
          firstMessageDate: { $min: "$createdAt" } // Find the earliest message date in each group.
        } 
      },
      // Stage 4: Sort the groups themselves, newest session first.
      { $sort: { firstMessageDate: -1 } },
      // Stage 5: Clean up the output to be nice and tidy.
      { 
        $project: { 
          _id: 0, // Don't include the default _id field.
          sessionId: "$_id", // Rename _id to sessionId.
          firstMessageDate: "$firstMessageDate" 
        } 
      }
    ]);

    res.status(200).json({ success: true, data: sessions, error: null });

  } catch (error) {
    console.error('Error in getChatSessions:', error.message);
    res.status(500).json({ success: false, data: null, error: 'Failed to retrieve chat sessions.' });
  }
};

// --- EXPORTS ---
// Make all our controller functions available to our router file.
module.exports = { 
  sendMessage, 
  getChatHistory, 
  deleteAllChats, 
  getChatSessions
};