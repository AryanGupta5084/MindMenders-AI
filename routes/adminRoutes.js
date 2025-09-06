/**
 * routes/admin.js
 * * This file defines all the API routes for the admin panel.
 * Every route in this file is protected and can only be accessed by a logged-in user
 * who has administrator privileges. It handles all the backend logic for managing
 * users, viewing chat logs, and controlling site content like resources and counselors.
 */

// --- Basic setup ---
const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');

// --- Models ---
// We need these models to interact with the corresponding database collections.
const User = require('../models/User');
const Chat = require('../models/Chat');
const Counselor = require('../models/Counselor'); // Import Counselor for the getById route
const ForumPost = require('../models/ForumPost'); // Import ForumPost for the getById route
const JournalEntry = require('../models/JournalEntry');
const Appointment = require('../models/Appointment');
const ForumComment = require('../models/ForumComment');
const LiveChatMessage = require('../models/LiveChatMessage');

// --- Middleware ---
// These are our security guards for the admin routes.
const { protect } = require('../middleware/authMiddleware'); // Ensures the user is logged in.
const { isAdmin } = require('../middleware/adminMiddleware'); // Ensures the logged-in user is an admin.

// --- Utilities ---
const { decrypt } = require('../utils/crypto'); // To decrypt sensitive chat data for viewing.

// Helper function to sanitize user input for use in a regular expression.
function escapeRegex(text) {
  return text.replace(/[-[\]{}()*+?.,\\^$|#\s]/g, '\\$&');
}

// --- Controllers ---
const {
  getAdminResources,
  getAdminResourceById,
  createResource,
  updateResource,
  deleteResource
} = require('../controllers/resourceController');

const {
  getAllCounselors,
  getCounselorById,
  createCounselor,
  updateCounselor,
  deleteCounselor,
  getAllAppointmentsForAdmin,
  updateAppointmentByAdmin,
  getAvailableUsersForCounselor,
  getGlobalAnalytics
} = require('../controllers/adminController');

const {
  getAllPostsForAdmin,
  getPostByIdForAdmin,
  deletePostByAdmin
} = require('../controllers/forumController');

// ===================================================================================
// --- APPLY MIDDLEWARE ---
// This is a crucial line. `router.use()` applies these middleware functions to EVERY
// single route defined in this file from this point forward.
// ===================================================================================
router.use(protect, isAdmin);

// ===================================================================================
// --- 1. User Management Routes ---
// ===================================================================================

// @desc    Get all users, with pagination and search.
// @route   GET /api/admin/users
router.get('/users', async (req, res) => {
  try {
    // --- Add pagination and search logic ---
    const page = parseInt(req.query.page, 10) || 1;
    const limit = parseInt(req.query.limit, 10) || 10; // Default to 10 per page
    const skip = (page - 1) * limit;
    const { search } = req.query;
    let filter = {};

    if (search) {
      const searchRegex = new RegExp(escapeRegex(search), 'i');
      filter = { $or: [{ username: searchRegex }, { email: searchRegex }] };
    }

    // Fetch paginated users and total count simultaneously
    const [users, total] = await Promise.all([
      User.find(filter).select('-password').sort({ createdAt: -1 }).skip(skip).limit(limit),
      User.countDocuments(filter)
    ]);
    
    res.status(200).json({
      success: true,
      data: {
        items: users, // Send items under an 'items' key
        total,
        pages: Math.ceil(total / limit),
        currentPage: page
      },
      error: null
    });
  } catch (error) {
    console.error('Admin user fetch error:', error);
    res.status(500).json({ success: false, data: null, error: 'Server error while fetching users.' });
  }
});

// @desc    Get a single user by their ID.
// @route   GET /api/admin/users/:id
router.get('/users/:id', async (req, res) => {
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
        return res.status(400).json({ success: false, data: null, error: 'User not found.' });
    }
    try {
        const user = await User.findById(req.params.id).select('-password');
        if (!user) {
            return res.status(404).json({ success: false, data: null, error: 'User not found.' });
        }
        res.status(200).json({ success: true, data: user, error: null });
    } catch (error) {
        console.error('Admin user detail error:', error);
        res.status(500).json({ success: false, data: null, error: 'Server error while fetching user details.' });
    }
});

// @desc    Update a user's details (username, email, admin status).
// @route   PUT /api/admin/users/:id
router.put('/users/:id', async (req, res) => {
  try {
    const { username, email, isAdmin } = req.body;
    const updateData = { username, email, isAdmin };
    
    if (req.params.id === req.user.id) {
      if (isAdmin === false) {
        return res.status(403).json({ success: false, data: null, error: 'Admins cannot remove their own administrator privileges.' });
      }
      updateData.isAdmin = true;
    }
    
    const user = await User.findByIdAndUpdate(req.params.id, updateData, { new: true, runValidators: true }).select('-password');
    if (!user) {
      return res.status(404).json({ success: false, data: null, error: 'User not found.' });
    }
    res.status(200).json({ success: true, data: user, error: null });
  } catch (error) {
    console.error('Admin user update error:', error);
    res.status(500).json({ success: false, data: null, error: 'Server error while updating user.' });
  }
});

// @desc    Securely delete a user and ALL their associated data in a transaction.
// @route   DELETE /api/admin/users/:id
router.delete('/users/:id', async (req, res) => {
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
        return res.status(400).json({ success: false, data: null, error: 'Invalid user ID format.' });
    }

    if (req.params.id === req.user.id) {
        return res.status(403).json({ 
            success: false, 
            data: null, 
            error: 'Admins cannot delete their own account.' 
        });
    }

    // A full cascading delete MUST be done in a transaction.
    // This ensures that if step 5 fails, steps 1-4 are rolled back.
    const session = await mongoose.startSession();
    session.startTransaction();

    try {
        const userId = req.params.id;

        // 1. Get all data associated with the user.
        // We must fetch all related documents *first* to gather all the IDs we need to cascade.

        // Find all posts this user created
        const userPosts = await ForumPost.find({ user: userId }).select('_id').session(session);
        const postIdsToDelete = userPosts.map(p => p._id);

        // Find counselor profile (if any)
        const counselorProfile = await Counselor.findOne({ user: userId }).select('_id').session(session);

        // Find all appointments this user is part of (as patient OR as counselor)
        const appointmentQuery = [{ user: userId }];
        if (counselorProfile) {
            appointmentQuery.push({ counselor: counselorProfile._id });
        }
        const userAppointments = await Appointment.find({ $or: appointmentQuery }).select('_id').session(session);
        const appointmentIdsToDelete = userAppointments.map(a => a._id);

        // --- Now execute the cascade delete in the correct order ---

        // 2. Delete all data that depends on higher-level documents
        await LiveChatMessage.deleteMany({ appointment: { $in: appointmentIdsToDelete } }).session(session);
        await ForumComment.deleteMany({ post: { $in: postIdsToDelete } }).session(session);

        // 3. Delete all remaining user-generated content
        await Appointment.deleteMany({ _id: { $in: appointmentIdsToDelete } }).session(session);
        await ForumComment.deleteMany({ user: userId }).session(session); // Comments they wrote on other's posts
        await ForumPost.deleteMany({ user: userId }).session(session); // Their posts
        await JournalEntry.deleteMany({ user: userId }).session(session);
        await Chat.deleteMany({ user: userId }).session(session); // Their AI chats

        // 4. Delete their specific profile (if they are a counselor)
        if (counselorProfile) {
            await Counselor.findByIdAndDelete(counselorProfile._id).session(session);
        }

        // 5. Finally, delete the User document itself
        const deletedUser = await User.findByIdAndDelete(userId).session(session);

        if (!deletedUser) {
             throw new Error('User not found.'); // This will trigger the catch block and abort the transaction
        }

        // 6. If all steps succeeded, commit the transaction.
        await session.commitTransaction();
        res.status(200).json({ success: true, data: { message: "User and all associated data deleted successfully." }, error: null });

    } catch (error) {
        // If ANY error occurred, abort the entire transaction. No data will be deleted.
        await session.abortTransaction();
        console.error('Admin user cascade delete error:', error);
        res.status(500).json({ success: false, data: null, error: 'Server error during delete. Operation was rolled back.' });
    } finally {
        // Always end the session
        session.endSession();
    }
});


// ===================================================================================
// --- 2. Chat Log Routes (This logic was already correct) ---
// ===================================================================================

// @desc    Get a paginated list of all chat logs.
// @route   GET /api/admin/chats
router.get('/chats', async (req, res) => {
    try {
      const page = parseInt(req.query.page, 10) || 1;
      const limit = parseInt(req.query.limit, 10) || 20;
      const skip = (page - 1) * limit;
      const { search } = req.query;

      let matchStage = {};
      if (search) {
        const searchRegex = new RegExp(escapeRegex(search), 'i');
        const searchesForGuest = searchRegex.test('guest');

        if (searchesForGuest) {
            matchStage = {
                $or: [
                  { 'user.username': searchRegex },
                  { isGuest: true }
                ]
            };
        } else {
            matchStage = { 'user.username': searchRegex };
        }
      }
      const pipeline = [
        { $lookup: { from: 'users', localField: 'user', foreignField: '_id', as: 'user' } },
        { $unwind: { path: '$user', preserveNullAndEmptyArrays: true } }, 
        { $match: matchStage },
        { $sort: { createdAt: -1 } }
      ];
      
      const chatsPipeline = [ ...pipeline, { $skip: skip }, { $limit: limit } ];
      const totalPipeline = [ ...pipeline, { $count: 'total' } ];
      let chats = await Chat.aggregate(chatsPipeline);
      const totalResult = await Chat.aggregate(totalPipeline);
      const total = totalResult.length > 0 ? totalResult[0].total : 0;
      
      chats = chats.map(chat => ({
        ...chat,
        message: chat.message ? decrypt(chat.message) : '',
      }));
      
      res.status(200).json({
        success: true,
        data: { 
          items: chats,
          total, 
          pages: Math.ceil(total / limit), 
          currentPage: page 
        },
        error: null
      });
    } catch (error) {
      console.error('Admin chats fetch error:', error);
      res.status(500).json({ success: false, data: null, error: 'Server error while fetching chats.' });
    }
});

router.get('/chats/:id', async (req, res) => {
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
        return res.status(400).json({ success: false, data: null, error: 'Invalid chat ID format.' });
    }
    try {
        const chat = await Chat.findById(req.params.id).populate('user', 'username email');
        if (!chat) {
            return res.status(404).json({ success: false, data: null, error: 'Chat not found.' });
        }
        const decryptedChat = chat.toObject();
        res.status(200).json({ success: true, data: decryptedChat, error: null });
    } catch (error) {
        console.error('Admin chat detail error:', error);
        res.status(500).json({ success: false, data: null, error: 'Server error while fetching chat details.' });
    }
});
router.put('/chats/:id', async (req, res) => {
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
        return res.status(400).json({ success: false, data: null, error: 'Invalid chat ID format.' });
    }
    try {
        let { flag, sentiment } = req.body;
        const allowedFlags = ['anxiety', 'depression', 'neutral', 'stress', 'suicidal', null];

        if (flag === '') flag = null; 
        if (flag && !allowedFlags.includes(flag)) {
            return res.status(400).json({ success: false, data: null, error: 'Invalid flag value.' });
        }
        
        const chat = await Chat.findByIdAndUpdate(req.params.id, { flag, sentiment }, { new: true, runValidators: true }).populate('user', 'username email');
        if (!chat) {
            return res.status(404).json({ success: false, data: null, error: 'Chat not found.' });
        }
        res.status(200).json({ success: true, data: chat, error: null });
    } catch (error) {
        console.error('Admin chat update error:', error);
        res.status(500).json({ success: false, data: null, error: 'Server error while updating chat.' });
    }
});
router.delete('/chats/:id', async (req, res) => {
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
        return res.status(400).json({ success: false, data: null, error: 'Invalid chat ID format.' });
    }
    try {
        const chat = await Chat.findById(req.params.id);
        if (!chat) {
            return res.status(404).json({ success: false, data: null, error: 'Chat not found.' });
        }
        await Chat.findByIdAndDelete(req.params.id);
        res.status(200).json({ success: true, data: { message: "Chat deleted successfully." }, error: null });
    } catch (error) {
        console.error('Admin chat delete error:', error);
        res.status(500).json({ success: false, data: null, error: 'Server error while deleting chat.' });
    }
});


// ===================================================================================
// --- 3. Content & Feature Management Routes ---
// ===================================================================================

// --- Resource Management ---
router.route('/resources')
  .get(getAdminResources)  
  .post(createResource);   

router.route('/resources/:id')
  .get(getAdminResourceById) 
  .put(updateResource)     
  .delete(deleteResource);  

// --- Counselor Management ---
router.route('/counselors')
  .get(getAllCounselors) 
  .post(createCounselor);

router.route('/counselors/:id')
  .get(getCounselorById) 
  .put(updateCounselor)
  .delete(deleteCounselor);

router.get('/available-users', getAvailableUsersForCounselor);

// --- Appointment Management ---
router.get('/appointments', getAllAppointmentsForAdmin); 
router.put('/appointments/:id', updateAppointmentByAdmin);

// --- Forum Moderation ---
router.get('/forum/posts', getAllPostsForAdmin); 
router.route('/forum/posts/:id')
    .get(getPostByIdForAdmin) 
    .delete(deletePostByAdmin); 

// ===================================================================================
// --- 4. Dashboard Stats Route ---
// ===================================================================================
router.get('/stats', async (req, res) => {
  try {
    const totalUsers = await User.countDocuments({ isGuest: false });
    const totalChats = await Chat.countDocuments();
    const newUsers = await User.countDocuments({ createdAt: { $gte: new Date(Date.now() - 7*24*60*60*1000) }, isGuest: false });
    const newChats = await Chat.countDocuments({ createdAt: { $gte: new Date(Date.now() - 7*24*60*60*1000) } });
    
    res.status(200).json({
      success: true,
      data: { totalUsers, totalChats, newUsers, newChats },
      error: null
    });
  } catch (error) {
    res.status(500).json({ success: false, data: null, error: 'Server error while fetching stats.' });
  }
});

// --- ROUTE FOR THE CHARTS ---
router.get('/analytics', getGlobalAnalytics);

module.exports = router;