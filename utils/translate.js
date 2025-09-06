// utils/translate.js
// This file provides a simple and robust wrapper around the Google Translate API.
//
// --- Key Design Principles ---
// 1. **Never Crash:** This module is designed to never throw an unhandled exception.
//    It always returns a structured object, even if the translation fails,
//    so that the calling code doesn't need complex try/catch blocks.
// 2. **Graceful Fallback:** On any error, it returns the original text.
// 3. **Efficient:** It includes a simple optimization to avoid unnecessary API calls
//    for text that is already in English.

const translate = require('@vitalets/google-translate-api');

// The default language we'll translate to if none is specified.
const DEFAULT_TARGET = 'en';

/**
 * Translates text to a specified target language, automatically detecting the source language.
 *
 * @param {string} text The text to be translated.
 * @param {string} [targetLang='en'] The two-letter language code for the target language (e.g., 'en', 'hi', 'ta').
 * @returns {Promise<{
 * success: boolean,      // Was the translation API call successful?
 * text: string,          // The translated text (or original text on failure).
 * detectedLang: string|null, // The detected source language code (e.g., 'hi').
 * target: string,        // The target language.
 * error?: string          // A simple error message if success is false.
 * }>} A structured object with the translation result.
 */
async function translateText(text, targetLang = DEFAULT_TARGET) {
  try {
    // --- Input Validation ---
    // Handle null or undefined inputs right away.
    if (text === null || text === undefined) {
      return { success: false, text: '', detectedLang: null, target: targetLang, error: 'No text provided' };
    }

    // Ensure we're working with a string and trim any whitespace.
    const input = String(text).trim();
    if (!input) {
      // If the input is empty after trimming, there's nothing to do.
      return { success: true, text: '', detectedLang: null, target: targetLang };
    }


    // --- Optimization: Fast-Path for English ---
    // If the target is English and the input text looks like basic ASCII,
    // we can skip the network call entirely. This saves time and API quota.
    // The regex checks for standard English characters, numbers, and symbols.
    if (targetLang === 'en' && /^[\x00-\x7F]+$/.test(input)) {
      return { success: true, text: input, detectedLang: 'en', target: 'en' };
    }


    // --- API Call ---
    // If we've gotten this far, we need to call the actual translation service.
    const result = await translate(input, { to: targetLang });
    const detected = result?.from?.language?.iso || null;

    // --- Success Response ---
    // We successfully got a response from the API.
    return {
      success: true,
      text: result?.text ?? input, // Use the translated text, or fallback to input just in case.
      detectedLang: detected,
      target: targetLang,
    };

  } catch (err) {
    // --- Graceful Error Handling ---
    // Something went wrong (e.g., network error, API limit).
    // Instead of crashing, we log the error and return the original text.
    console.error("Translation API error:", err.message);
    return {
      success: false,
      text: String(text ?? ''), // Return the original text.
      detectedLang: null,
      target: targetLang,
      error: 'Translation failed',
    };
  }
}

// Export the function for use throughout the application.
module.exports = { translateText };
