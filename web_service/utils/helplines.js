// utils/helplines.js
// This module provides a centralized and easy-to-manage way to serve
// regional mental health helpline numbers. It's designed to be simple
// to extend with new languages and to provide a safe fallback.
// TODO: In the future, this data could be moved to a CMS or a database
//       to allow for updates without needing to deploy new code.

// A standard, high-priority message that gets appended to all helpline lists.
const DEFAULT_EMERGENCY_NOTE = 'If you are in immediate danger, call your local emergency number (112 in India).';

// The core data structure for our helplines.
// It's a simple object mapping two-letter language codes to an array of
// pre-formatted strings, making it easy to add or update information.
const HELPLINES = {
  en: [
    '📞 **KIRAN (Govt. of India 24/7):** 1800-599-0019',
    '📞 **Vandrevala Foundation (24/7):** 9999666555 (Phone or WhatsApp)',
    '📞 **Fortis Stress Helpline (24/7):** +91-8376804102',
    '📞 **Sneha Foundation (Tamil Nadu):** 044-24640050',
  ],
  hi: [
    '📞 **किरण हेल्पलाइन (भारत सरकार 24/7):** 1800-599-0019',
    '📞 **वंद्रेवाला फाउंडेशन (24/7):** 9999666555 (फोन या व्हाट्सएप)',
    '📞 **आसरा (24/7):** 9820466726',
  ],
  ta: [
    '📞 **கிரண் ஹெல்ப்லைன் (24/7):** 1800-599-0019',
    '📞 **ஸ்நேஹா ஃபவுண்டேஷன் (தமிழ்நாடு):** 044-24640050',
  ],
  te: [
    '📞 **కిరణ్ హెల్ప్‌లైన్ (24/7):** 1800-599-0019',
    '📞 **రోష్ని ట్రస్ట్ (హైదరాబాద్):** 040-66202000',
  ],
  pa: [
    '📞 **ਕਿਰਨ ਹੈਲਪਲਾਈਨ (24/7):** 1800-599-0019',
    '📞 **ਵੰਦ੍ਰੇਵਾਲਾ ਫਾਊਂਡੇਸ਼ਨ (24/7):** 9999666555',
  ],
  bn: [
    '📞 **কিরণ হেল্পলাইন (২৪/৭):** 1800-599-0019',
    '📞 **ভান্দ্রেওয়ালা ফাউন্ডেশন (24/7):** 9999666555',
  ],
  ml: [
    '📞 **കിരൺ ഹെൽപ്‌ലൈൻ (24/7):** 1800-599-0019',
    '📞 **മൈത്രി (കൊച്ചി):** 0484-2540530',
  ],
  kn: [
    '📞 **ಕಿರಣ್ ಸಹಾಯವಾಣಿ (24/7):** 1800-599-0019',
    '📞 **ವಂದ್ರೆವಾಲಾ ಫೌಂಡೇಶನ್ (24/7):** 9999666555',
  ],
  mr: [
    '📞 **किरण हेल्पलाइन (२४/७):** 1800-599-0019',
    '📞 **आसरा (24/7):** 9820466726',
  ],
  gu: [
    '📞 **કિરણ હેલ્પલાઇન (24/7):** 1800-599-0019',
    '📞 **લાઇફ હોપ હેલ્પલાઇન:** 1800-233-3330',
  ],
};

/**
 * Gets a list of helpline strings for a given locale.
 * It intelligently handles locales like "en-US" or "hi-IN" by just using the
 * primary language code ("en", "hi"). If the requested language isn't found,
 * it safely falls back to English.
 *
 * @param {string} [locale='en'] - The locale or language code (e.g., "en", "hi-IN").
 * @returns {string[]} An array of strings, ready to be displayed in the UI.
 */
function getHelplines(locale = 'en') {
  // Gracefully handle null/undefined locales and extract the primary language code (e.g., "hi" from "hi-IN").
  const lang = (locale || 'en').toLowerCase().split('-')[0];

  // Get the lines for the requested language, or default to English if it doesn't exist.
  const lines = HELPLINES[lang] || HELPLINES.en;

  // Always include the emergency note at the end for safety.
  return [...lines, `⚠️ ${DEFAULT_EMERGENCY_NOTE}`];
}

/**
 * A utility function to dynamically add or replace a set of helplines at runtime.
 * This could be useful for an admin panel or for loading helplines from an external source.
 *
 * @param {string} lang - The two-letter language code (e.g., 'en').
 * @param {string[]} lines - An array of helpline strings to set for that language.
 */
function setHelplines(lang, lines) {
  // Basic validation to prevent setting invalid data.
  if (!lang || !Array.isArray(lines) || !lines.length) return;
  HELPLINES[lang.toLowerCase()] = lines;
}

// Export the primary functions for use in other parts of the application.
module.exports = { getHelplines, setHelplines };
