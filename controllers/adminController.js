/**
 * controllers/adminController.js
 * * This file is the command center for all administrative actions.
 * It handles creating, updating, and managing counselor profiles, as well as viewing
 * and managing all appointments from an admin perspective.
 */

// We need our data blueprints to interact with the database.
const Counselor = require('../models/Counselor');
const Appointment = require('../models/Appointment');
const LiveChatMessage = require('../models/LiveChatMessage');
const User = require('../models/User');
const JournalEntry = require('../models/JournalEntry');
const mongoose = require('mongoose');

// Helper function to sanitize user input for use in a regular expression.
function escapeRegex(text) {
  if (!text) return '';
  return text.replace(/[-[\]{}()*+?.,\\^$|#\s]/g, '\\$&');
}

// @desc      Get all counselor profiles for the admin dashboard (NOW PAGINATED)
// @route     GET /api/admin/counselors
// @access    Private/Admin
exports.getAllCounselors = async (req, res) => {
  try {
    // --- Add pagination and search logic ---
    const page = parseInt(req.query.page, 10) || 1;
    const limit = parseInt(req.query.limit, 10) || 10;
    const skip = (page - 1) * limit;
    const { search } = req.query;

    let matchStage = {};
    if (search) {
        const searchRegex = new RegExp(escapeRegex(search), 'i');
        matchStage = {
            $or: [
                { 'user.username': searchRegex },
                { 'user.email': searchRegex },
                { specialty: searchRegex }
            ]
        };
    }
    
    // We must use aggregate to search on populated user fields
    const pipeline = [
        {
            $lookup: {
                from: 'users', // The collection name for the User model
                localField: 'user',
                foreignField: '_id',
                as: 'user'
            }
        },
        { $unwind: '$user' },
        { $match: matchStage },
        { $sort: { createdAt: -1 } }
    ];

    const countPipeline = [...pipeline, { $count: 'total' }];
    const dataPipeline = [...pipeline, { $skip: skip }, { $limit: limit }];

    const [counselorsResult, totalResult] = await Promise.all([
        Counselor.aggregate(dataPipeline),
        Counselor.aggregate(countPipeline)
    ]);
    
    const total = totalResult.length > 0 ? totalResult[0].total : 0;

    res.status(200).json({
        success: true,
        data: {
            items: counselorsResult,
            total,
            pages: Math.ceil(total / limit),
            currentPage: page
        },
        error: null
    });
  } catch (error) {
    console.error("Admin failed to fetch counselors:", error);
    res.status(500).json({ success: false, data: null, error: 'Server error while fetching counselors.' });
  }
};

/**
 * @desc      [NEW] Get a single counselor by ID
 * @route     GET /api/admin/counselors/:id
 * @access    Private/Admin
 */
exports.getCounselorById = async (req, res) => {
    try {
        const counselor = await Counselor.findById(req.params.id).populate('user', 'username email');
        if (!counselor) {
            return res.status(404).json({ success: false, data: null, error: 'Counselor not found.' });
        }
        res.status(200).json({ success: true, data: counselor, error: null });
    } catch (error) {
        console.error("Failed to fetch counselor by ID:", error);
        res.status(500).json({ success: false, data: null, error: 'Server error.' });
    }
};

// @desc      Create a new counselor profile
// @route     POST /api/admin/counselors
// @access    Private/Admin
exports.createCounselor = async (req, res) => {
  try {
    const { userId, specialty, bio, availability, slotDuration, isActive } = req.body;

    const user = await User.findById(userId);
    if (!user || user.isGuest) {
      return res.status(404).json({ success: false, data: null, error: 'Valid user not found.' });
    }

    const existingCounselor = await Counselor.findOne({ user: userId });
    if (existingCounselor) {
      return res.status(400).json({ success: false, data: null, error: 'A counselor profile already exists for this user.' });
    }

    const newCounselor = await Counselor.create({
      user: userId,
      specialty,
      bio,
      availability,
      slotDuration,
      isActive,
    });

    res.status(201).json({ success: true, data: newCounselor, error: null });
  } catch (error) {
    console.error("Failed to create counselor:", error);
    res.status(400).json({ success: false, data: null, error: 'Failed to create counselor profile. Please check input.' });
  }
};

// @desc      Update an existing counselor's profile
// @route     PUT /api/admin/counselors/:id
// @access    Private/Admin
exports.updateCounselor = async (req, res) => {
  try {
    const counselor = await Counselor.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
      runValidators: true,
    });

    if (!counselor) {
      return res.status(404).json({ success: false, data: null, error: 'Counselor not found.' });
    }
    res.status(200).json({ success: true, data: counselor, error: null });
  } catch (error) {
    console.error("Failed to update counselor:", error);
    res.status(400).json({ success: false, data: null, error: 'Failed to update counselor profile.' });
  }
};

// @desc      Securely delete a counselor and ALL their associated data in a transaction.
// @route     DELETE /api/admin/counselors/:id
// @access    Private/Admin
exports.deleteCounselor = async (req, res) => {
    // A full cascading delete MUST be done in a transaction.
    const session = await mongoose.startSession();
    session.startTransaction(); // Start the database transaction

    try {
        const counselorId = req.params.id;

        // 1. Find all appointments linked to this counselor, using the session.
        const appointmentsToDelete = await Appointment.find({ counselor: counselorId })
            .select('_id') // We only need the IDs
            .session(session);
        
        const appointmentIds = appointmentsToDelete.map(apt => apt._id);

        // 2. Delete all data that depends on appointments (Live Chat Messages)
        if (appointmentIds.length > 0) {
            await LiveChatMessage.deleteMany({ appointment: { $in: appointmentIds } }).session(session);
        }
        
        // 3. Delete the appointments themselves
        await Appointment.deleteMany({ counselor: counselorId }).session(session);

        // 4. Finally, delete the counselor profile itself
        const counselor = await Counselor.findByIdAndDelete(counselorId).session(session);

        if (!counselor) {
            // If the counselor didn't exist, throw an error to abort the transaction.
            throw new Error('Counselor not found.');
        }

        // 5. If all steps succeeded without error, commit the transaction.
        await session.commitTransaction();
        res.status(200).json({ 
            success: true, 
            data: { message: 'Counselor profile and all associated appointments/chats deleted successfully.' }, 
            error: null 
        });

    } catch (error) {
        // 6. If ANY step failed, abort the entire transaction. All changes will be rolled back.
        await session.abortTransaction();
        console.error("Failed to delete counselor (operation rolled back):", error);
        res.status(500).json({ 
            success: false, 
            data: null, 
            error: 'Server error during delete. Operation was rolled back.' 
        });
    } finally {
        // 7. Always end the session when we are done.
        session.endSession();
    }
};

/**
 * It efficiently finds users who are NOT guests and do NOT already have a counselor profile.
 * This logic is now performed in the database instead of in the browser.
 * * @desc      Get all users eligible to become counselors (non-guest, no profile)
 * @route     GET /api/admin/available-users
 * @access    Private/Admin
 */
exports.getAvailableUsersForCounselor = async (req, res) => {
    try {
        // 1. First, get an array of all user IDs that *already* belong to a counselor.
        // We use .distinct() for a highly efficient query that just returns an array of IDs.
        const existingCounselorUserIds = await Counselor.distinct('user');

        // 2. Now, query the User collection for all users that meet two criteria:
        //    - They are NOT a guest (isGuest: false)
        //    - Their _id is NOT IN ($nin) the list we just fetched.
        const availableUsers = await User.find({
            isGuest: false,
            _id: { $nin: existingCounselorUserIds }
        })
        .select('username email') // We only need their name and email for the dropdown.
        .sort({ username: 1 }); // Sort them alphabetically.

        // 3. Send back the clean list.
        res.status(200).json({
            success: true,
            data: availableUsers,
            error: null
        });

    } catch (error) {
        console.error("Failed to fetch available users:", error);
        res.status(500).json({ success: false, data: null, error: 'Server error fetching available users.' });
    }
};

// @desc      Get a master list of all appointments for the admin (NOW PAGINATED)
// @route     GET /api/admin/appointments
// @access    Private/Admin
exports.getAllAppointmentsForAdmin = async (req, res) => {
    try {
        // --- Add pagination and search logic ---
        const page = parseInt(req.query.page, 10) || 1;
        const limit = parseInt(req.query.limit, 10) || 10;
        const skip = (page - 1) * limit;
        const { search } = req.query;

        // We need an aggregation pipeline to filter on populated fields (user and counselor names)
        const pipeline = [
            {
                $lookup: {
                    from: 'users',
                    localField: 'user',
                    foreignField: '_id',
                    as: 'userDoc'
                }
            },
            { $unwind: { path: '$userDoc', preserveNullAndEmptyArrays: true } },
            {
                $lookup: {
                    from: 'counselors',
                    localField: 'counselor',
                    foreignField: '_id',
                    as: 'counselorDoc'
                }
            },
            { $unwind: { path: '$counselorDoc', preserveNullAndEmptyArrays: true } },
            {
                $lookup: {
                    from: 'users',
                    localField: 'counselorDoc.user',
                    foreignField: '_id',
                    as: 'counselorUserDoc'
                }
            },
            { $unwind: { path: '$counselorUserDoc', preserveNullAndEmptyArrays: true } },
        ];
        
        // Add search stage if a search term exists
        if (search) {
            const searchRegex = new RegExp(escapeRegex(search), 'i');
            pipeline.push({
                $match: {
                    $or: [
                        { 'userDoc.username': searchRegex },
                        { 'userDoc.email': searchRegex },
                        { 'counselorUserDoc.username': searchRegex }
                    ]
                }
            });
        }

        pipeline.push({ $sort: { startTime: -1 } });

        // Create parallel pipelines for data and total count
        const dataPipeline = [
            ...pipeline,
            { $skip: skip },
            { $limit: limit },
            {
                $project: {
                    _id: 1,
                    startTime: 1,
                    endTime: 1,
                    status: 1,
                    notes: 1,
                    createdAt: 1,
                    updatedAt: 1,
                    user: { _id: '$userDoc._id', username: '$userDoc.username', email: '$userDoc.email' },
                    counselor: { 
                        _id: '$counselorDoc._id',
                        user: { _id: '$counselorUserDoc._id', username: '$counselorUserDoc.username' }
                    }
                }
            }
        ];
        const countPipeline = [...pipeline, { $count: 'total' }];

        const [appointments, totalResult] = await Promise.all([
            Appointment.aggregate(dataPipeline),
            Appointment.aggregate(countPipeline)
        ]);

        const total = totalResult.length > 0 ? totalResult[0].total : 0;

        res.status(200).json({
            success: true,
            data: {
                items: appointments,
                total,
                pages: Math.ceil(total / limit),
                currentPage: page
            },
            error: null
        });
    } catch (error) {
        console.error("Admin failed to fetch appointments:", error);
        res.status(500).json({ success: false, data: null, error: 'Server error while fetching appointments.' });
    }
};

// @desc      Allow an admin to update an appointment (e.g., to confirm or cancel it)
// @route     PUT /api/admin/appointments/:id
// @access    Private/Admin
exports.updateAppointmentByAdmin = async (req, res) => {
    try {
        const { status } = req.body;

        const validStatuses = Appointment.schema.path('status').enumValues;
        if (status && !validStatuses.includes(status)) {
             return res.status(400).json({ success: false, data: null, error: 'Invalid status value.' });
        }

        const appointment = await Appointment.findById(req.params.id);

        if (!appointment) {
            return res.status(404).json({ success: false, data: null, error: 'Appointment not found.' });
        }

        if (status) {
            appointment.status = status;
        }
        
        await appointment.save();

        res.status(200).json({ success: true, data: appointment, error: null });
    } catch (error) {
        console.error("Admin failed to update appointment:", error);
        res.status(500).json({ success: false, data: null, error: 'Failed to update appointment.' });
    }
};

/**
 * @desc      Get global aggregated analytics for the admin dashboard
 * @route     GET /api/admin/analytics
 * @access    Private/Admin
 */
exports.getGlobalAnalytics = async (req, res) => {
    try {
        // --- Global Mood Distribution (all time) ---
        const moodDistribution = await JournalEntry.aggregate([
            { $group: { _id: '$mood', count: { $sum: 1 } } },
            { $project: { _id: 0, mood: '$_id', count: 1 } }
        ]);

        // --- Global AI Sentiment Distribution (all time) ---
        const sentimentDistribution = await JournalEntry.aggregate([
            { $match: { analyzedSentiment: { $ne: null } } },
            { $group: { _id: '$analyzedSentiment', count: { $sum: 1 } } },
            { $project: { _id: 0, sentiment: '$_id', count: 1 } }
        ]);

        res.status(200).json({
            success: true,
            data: {
                moodDistribution,
                sentimentDistribution,
            },
            error: null
        });

    } catch (error) {
        console.error("Global Analytics error:", error);
        res.status(500).json({ success: false, data: null, error: 'Server error fetching global statistics.' });
    }
};