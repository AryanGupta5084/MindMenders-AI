/**
 * controllers/journalController.js
 * * This controller is all about the user's personal journal.
 * It handles creating new entries, fetching past entries, and calculating
 * interesting statistics like mood distribution and journaling streaks.
 */

// We need the JournalEntry and User models to work with the database.
const JournalEntry = require('../models/JournalEntry');
const User = require('../models/User');
// Axios is for making HTTP requests to our external sentiment analysis service.
const axios = require('axios');
// Mongoose is needed for its advanced features like ObjectId types in aggregation.
const mongoose = require('mongoose');

// Helper function to call the external Python sentiment analysis service.
async function analyzeJournalSentiment(text) {
  try {
    // We send the journal's text content to the service URL defined in our environment variables.
    const response = await axios.post(process.env.SENTIMENT_SERVICE_URL, { text });
    // The service should return a JSON object with an 'emotion' key.
    return response.data.emotion;
  } catch (error) {
    // If the service is down or there's an error, we don't want to crash the whole process.
    console.error('Journal sentiment analysis error:', error.message);
    return null; // Just return null and proceed. The journal entry will still be saved.
  }
}

/**
 * [FIX] A robust helper function to recalculate a user's journal streak from scratch.
 * This should be called any time an entry is deleted to ensure data integrity.
 * @param {object} user - The Mongoose user document to update.
 */
async function recalculateStreak(user) {
    // 1. Fetch all of the user's journal entries, sorted oldest to newest.
    const entries = await JournalEntry.find({ user: user._id }).sort({ entryDate: 'asc' });

    if (entries.length === 0) {
        // 2. If the user has no entries left, reset their streak and last entry date.
        user.journalStreak = 0;
        user.lastJournalDate = null;
        await user.save();
        return;
    }

    // 3. Iterate through the entries to calculate the correct streak.
    let currentStreak = 0;
    let lastEntryDate = null;

    for (const entry of entries) {
        if (lastEntryDate) {
            const diffTime = entry.entryDate.getTime() - lastEntryDate.getTime();
            const diffDays = Math.round(diffTime / (1000 * 60 * 60 * 24));

            if (diffDays === 1) {
                // The streak continues.
                currentStreak++;
            } else if (diffDays > 1) {
                // The streak was broken. Reset to 1 for the current entry.
                currentStreak = 1;
            }
            // If diffDays is 0 or less, it's an anomaly, but the streak doesn't increase.
        } else {
            // This is the very first entry. The streak starts at 1.
            currentStreak = 1;
        }
        lastEntryDate = entry.entryDate;
    }

    // 4. Update the user's profile with the newly calculated, correct streak and last entry date.
    user.journalStreak = currentStreak;
    user.lastJournalDate = lastEntryDate; // This will be the date of the most recent entry.

    // Now, we must also validate their achievements against this new, correct streak.
    // If their new streak is lower than an achievement they have, we must remove it.
    
    // Create a mutable copy of their achievements array (or an empty one if it doesn't exist)
    let updatedAchievements = [...(user.achievements || [])];

    if (currentStreak < 30) {
        // If the new streak is less than 30, they definitely don't have the 30-day achievement.
        updatedAchievements = updatedAchievements.filter(ach => ach !== '30-day-streak');
    }
    if (currentStreak < 7) {
         // If the new streak is less than 7, they also don't have the 7-day achievement.
        updatedAchievements = updatedAchievements.filter(ach => ach !== '7-day-streak');
    }
    // (This logic can be expanded if other streak achievements are added)

    // 5. Save the updated achievements array back to the user object.
    user.achievements = updatedAchievements;

    // 6. Finally, save all changes (streak, last date, AND achievements) to the database.
    await user.save();
}


// @desc      Create a new journal entry
// @route     POST /api/journal
// @access    Private
exports.createJournalEntry = async (req, res) => {
  try {
    const { mood, content } = req.body;
    const userId = req.user.id;
    const user = await User.findById(userId);

    // Normalize the entry date to the beginning of the day for accurate streak calculation.
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // Get the AI-powered sentiment analysis for the entry content.
    const analyzedSentiment = await analyzeJournalSentiment(content);

    // Now, create the actual journal entry in the database.
    const newEntry = await JournalEntry.create({
      user: userId,
      mood,
      content, // Our model schema will automatically encrypt this field.
      entryDate: today,
      analyzedSentiment,
    });

    // --- Streak and Achievement Logic ---
    let newStreak = 0; // Initialize streak
    let newAchievements = [...user.achievements]; // Copy existing achievements

    if (user.lastJournalDate) {
      // If they have a previous entry, let's calculate the difference.
      const lastEntryDate = new Date(user.lastJournalDate);
      lastEntryDate.setHours(0, 0, 0, 0);

      const diffTime = today.getTime() - lastEntryDate.getTime();
      const diffDays = Math.round(diffTime / (1000 * 60 * 60 * 24));

      if (diffDays === 1) {
        // Perfect, they continued the streak.
        newStreak = (user.journalStreak || 0) + 1;
      } else if (diffDays > 1) {
        // Oh no, they missed a day. Streak is broken, start a new one.
        newStreak = 1;
      } else { // diffDays is 0
        // Same day entry attempt. Streak doesn't change.
        // The unique index on the schema will prevent this entry from being saved,
        // but the streak logic remains correct.
        newStreak = user.journalStreak || 0;
      }
    } else {
      // This is their very first journal entry. Welcome!
      newStreak = 1;
    }
    
    // Check if the new streak has unlocked any achievements.
    if (newStreak >= 7 && !newAchievements.includes('7-day-streak')) {
        newAchievements.push('7-day-streak');
    }
    if (newStreak >= 30 && !newAchievements.includes('30-day-streak')) {
        newAchievements.push('30-day-streak');
    }

    // Update the user's profile with the new streak info.
    user.journalStreak = newStreak;
    user.lastJournalDate = today;
    user.achievements = newAchievements;
    await user.save();


    // Send back both the new entry and the updated user object (which contains the streak/achievements)
    // The client expects an object containing the user's new streak and achievements.
    res.status(201).json({
        success: true,
        data: {
            newEntry, // Send the new entry (in case we need it later)
            user: {   // Send the specific user data the client needs
                streak: newStreak,
                unlockedAchievements: user.achievements.filter(ach => !req.user.achievements.includes(ach)) // Send only newly unlocked ones
            }
        },
        error: null
    });
  } catch (error) {
    console.error("Failed to create journal entry:", error);
    // Our schema has a unique index on user + entryDate. If it fails, it means an entry for this date already exists.
    if (error.code === 11000) {
      return res.status(409).json({ success: false, data: null, error: 'An entry for this date already exists.' });
    }
    res.status(400).json({ success: false, data: null, error: 'Failed to create journal entry.' });
  }
};

// @desc      Get all journal entries for the logged-in user
// @route     GET /api/journal
// @access    Private
exports.getJournalEntries = async (req, res) => {
  try {
    // A straightforward query: find all entries by the user's ID and sort them with the newest first.
    const entries = await JournalEntry.find({ user: req.user.id }).sort({ entryDate: -1 });
    res.status(200).json({ success: true, data: entries, error: null });
  } catch (error) {
    console.error("Failed to fetch journal entries:", error);
    res.status(500).json({ success: false, data: null, error: 'Server error fetching journal entries.' });
  }
};

// @desc      Get aggregated journal stats for the logged-in user
// @route     GET /api/journal/stats
// @access    Private
exports.getJournalStats = async (req, res) => {
  try {
    const userId = new mongoose.Types.ObjectId(req.user.id);

    // --- Mood Distribution (all time) ---
    // This pipeline groups all entries by mood and counts how many fall into each category.
    const moodDistribution = await JournalEntry.aggregate([
      { $match: { user: userId } },
      { $group: { _id: '$mood', count: { $sum: 1 } } },
      { $project: { _id: 0, mood: '$_id', count: 1 } }
    ]);

    // --- AI Sentiment Distribution (all time) ---
    // Same as above, but for the AI-analyzed sentiment.
    const sentimentDistribution = await JournalEntry.aggregate([
      { $match: { user: userId, analyzedSentiment: { $ne: null } } },
      { $group: { _id: '$analyzedSentiment', count: { $sum: 1 } } },
      { $project: { _id: 0, sentiment: '$_id', count: 1 } }
    ]);

    // --- Mood Trend (last 30 days) ---
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    // This pipeline is more complex. It finds recent entries and converts the mood (a string)
    // into a numerical value so it can be easily plotted on a chart.
    const moodTrend = await JournalEntry.aggregate([
        { $match: { user: userId, entryDate: { $gte: thirtyDaysAgo } } },
        { $sort: { entryDate: 1 } },
        { 
            $project: { 
                date: { $dateToString: { format: "%Y-%m-%d", date: "$entryDate" } },
                moodValue: {
                    $switch: {
                        branches: [
                            { case: { $eq: ['$mood', 'awful'] }, then: 1 },
                            { case: { $eq: ['$mood', 'bad'] }, then: 2 },
                            { case: { $eq: ['$mood', 'meh'] }, then: 3 },
                            { case: { $eq: ['$mood', 'good'] }, then: 4 },
                            { case: { $eq: ['$mood', 'great'] }, then: 5 }
                        ],
                        default: 0
                    }
                }
            }
        }
    ]);

    res.status(200).json({
      success: true,
      data: {
        moodDistribution,
        sentimentDistribution,
        moodTrend,
      },
      error: null
    });

  } catch (error) {
    console.error("Journal stats error:", error);
    res.status(500).json({ success: false, data: null, error: 'Server error fetching journal statistics.' });
  }
};

/**
 * @desc      Delete a journal entry owned by the logged-in user
 * @route     DELETE /api/journal/:id
 * @access    Private
 *
 * [FIXED] This function now calls a helper to perform a full streak recalculation
 * after every deletion to ensure data integrity, fixing the bug where deleting
 * an entry from the middle of a streak did not break the streak.
 */
exports.deleteMyJournalEntry = async (req, res) => {
    try {
        const entryId = req.params.id;
        const userId = req.user.id;

        const entry = await JournalEntry.findById(entryId);
        // We need the user document to pass to our recalculation helper.
        const user = await User.findById(userId); 

        if (!entry) {
            return res.status(404).json({ success: false, data: null, error: 'Journal entry not found.' });
        }

        // --- CRITICAL SECURITY CHECK ---
        if (entry.user.toString() !== userId) {
            return res.status(403).json({ success: false, data: null, error: 'User not authorized to delete this entry.' });
        }
        
        // 1. Delete the entry first.
        await JournalEntry.findByIdAndDelete(entryId);

        // 2. [FIX] Call our new helper function to completely rebuild the streak.
        // This runs EVERY time an entry is deleted, guaranteeing the streak data is correct.
        await recalculateStreak(user); 

        res.status(200).json({ success: true, data: { message: 'Journal entry deleted successfully.' }, error: null });
    } catch (error) {
        console.error("Failed to delete journal entry:", error);
        res.status(500).json({ success: false, data: null, error: 'Server error while deleting entry.' });
    }
};

// Export all the functions so our router can use them.
module.exports = {
    createJournalEntry,
    getJournalEntries,
    getJournalStats,
    deleteMyJournalEntry
}