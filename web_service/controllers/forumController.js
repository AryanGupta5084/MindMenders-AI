/**
 * controllers/forumController.js
 * * This controller handles all the logic for our community forum.
 * It manages creating and viewing posts, adding comments, and provides
 * moderation tools for administrators. A key feature here is handling anonymity.
 */

// We'll need our database models for posts and comments.
const ForumPost = require('../models/ForumPost');
const ForumComment = require('../models/ForumComment');

// Helper function to sanitize user input for use in a regular expression.
function escapeRegex(text) {
  if (!text) return '';
  return text.replace(/[-[\]{}()*+?.,\\^$|#\s]/g, '\\$&');
}


// @desc      Get all forum posts for public viewing
// @route     GET /api/forum/posts
// @access    Public
exports.getAllPosts = async (req, res) => {
  try {
    const posts = await ForumPost.find()
      .populate('user', 'username')
      .sort({ createdAt: -1 });
      
    const sanitizedPosts = posts.map(post => {
        if (post.isAnonymous) {
            post.user = { _id: post.user._id, username: 'Anonymous' };
        }
        return post;
    });

    res.status(200).json({ success: true, data: sanitizedPosts, error: null });
  } catch (error) {
    console.error("Failed to fetch forum posts:", error);
    res.status(500).json({ success: false, data: null, error: 'Server error fetching posts.' });
  }
};

// @desc      Get a single post along with all of its comments
// @route     GET /api/forum/posts/:id
// @access    Public
exports.getPostById = async (req, res) => {
    try {
        const post = await ForumPost.findById(req.params.id).populate('user', 'username');
        if (!post) {
            return res.status(404).json({ success: false, data: null, error: 'Post not found.' });
        }

        const comments = await ForumComment.find({ post: req.params.id })
            .populate('user', 'username')
            .sort({ createdAt: 1 }); 

        if (post.isAnonymous) post.user = { _id: post.user._id, username: 'Anonymous' };
        
        const sanitizedComments = comments.map(comment => {
            if (comment.isAnonymous) {
                comment.user = { _id: comment.user._id, username: 'Anonymous' };
            }
            return comment;
        });

        res.status(200).json({ success: true, data: { post, comments: sanitizedComments }, error: null });
    } catch (error) {
        console.error("Failed to fetch single post:", error);
        res.status(500).json({ success: false, data: null, error: 'Server error fetching post.' });
    }
};

exports.createPost = async (req, res) => {
  try {
    const { title, content, isAnonymous } = req.body;
    const userId = req.user.id; 

    const newPost = await ForumPost.create({
      user: userId,
      title,
      content,
      isAnonymous,
    });
    res.status(201).json({ success: true, data: newPost, error: null });
  } catch (error) {
    console.error("Failed to create post:", error);
    res.status(400).json({ success: false, data: null, error: 'Failed to create post. Please check input.' });
  }
};
exports.addComment = async (req, res) => {
    try {
        const { content, isAnonymous } = req.body;
        const postId = req.params.id;
        const userId = req.user.id;

        const newComment = await ForumComment.create({
            post: postId,
            user: userId,
            content,
            isAnonymous,
        });
        res.status(201).json({ success: true, data: newComment, error: null });
    } catch (error) {
        console.error("Failed to add comment:", error);
        res.status(400).json({ success: false, data: null, error: 'Failed to add comment.' });
    }
};
exports.deleteMyPost = async (req, res) => {
    try {
        const postId = req.params.id;
        const userId = req.user.id;

        const post = await ForumPost.findById(postId);

        if (!post) {
            return res.status(404).json({ success: false, data: null, error: 'Post not found.' });
        }

        if (post.user.toString() !== userId) {
            return res.status(403).json({ success: false, data: null, error: 'User not authorized to delete this post.' });
        }

        await ForumComment.deleteMany({ post: postId });
        await ForumPost.findByIdAndDelete(postId);

        res.status(200).json({ success: true, data: { message: 'Post deleted successfully.' }, error: null });
    } catch (error) {
        console.error("Failed to delete post:", error);
        res.status(500).json({ success: false, data: null, error: 'Server error while deleting post.' });
    }
};
exports.deleteMyComment = async (req, res) => {
    try {
        const commentId = req.params.id;
        const userId = req.user.id;

        const comment = await ForumComment.findById(commentId);

        if (!comment) {
            return res.status(404).json({ success: false, data: null, error: 'Comment not found.' });
        }

        if (comment.user.toString() !== userId) {
            return res.status(403).json({ success: false, data: null, error: 'User not authorized to delete this comment.' });
        }

        await ForumComment.findByIdAndDelete(commentId);

        res.status(200).json({ success: true, data: { message: 'Comment deleted successfully.' }, error: null });
    } catch (error) {
        console.error("Failed to delete comment:", error);
        res.status(500).json({ success: false, data: null, error: 'Server error while deleting comment.' });
    }
};


// @desc      Admin: Get all forum posts for moderation (NOW PAGINATED)
// @route     GET /api/admin/forum/posts
// @access    Private/Admin
exports.getAllPostsForAdmin = async (req, res) => {
    try {
        // --- Add pagination and search logic ---
        const page = parseInt(req.query.page, 10) || 1;
        const limit = parseInt(req.query.limit, 10) || 10;
        const skip = (page - 1) * limit;
        const { search } = req.query;

        // Use aggregation pipeline to search on populated user field and title
        let matchStage = {};
        if (search) {
            const searchRegex = new RegExp(escapeRegex(search), 'i');
            matchStage = {
                $or: [
                    { title: searchRegex },
                    { 'user.username': searchRegex }
                ]
            };
        }

        const pipeline = [
            {
                $lookup: {
                    from: 'users',
                    localField: 'user',
                    foreignField: '_id',
                    as: 'user'
                }
            },
            { $unwind: '$user' },
            { $match: matchStage },
            {
                $addFields: {
                    reportCount: { $size: { $ifNull: ["$reports", []] } }
                }
            },
            { $sort: { createdAt: -1 } }
        ];

        const dataPipeline = [...pipeline, { $skip: skip }, { $limit: limit }];
        const countPipeline = [...pipeline, { $count: 'total' }];

        const [posts, totalResult] = await Promise.all([
            ForumPost.aggregate(dataPipeline),
            ForumPost.aggregate(countPipeline)
        ]);

        const total = totalResult.length > 0 ? totalResult[0].total : 0;

        res.status(200).json({
            success: true,
            data: {
                items: posts,
                total,
                pages: Math.ceil(total / limit),
                currentPage: page
            },
            error: null
        });
    } catch (error) {
        console.error("Admin failed to fetch posts:", error);
        res.status(500).json({ success: false, data: null, error: 'Server error fetching posts for admin.' });
    }
};

/**
 * @desc      [NEW] Admin: Get a single post and its comments (unsanitized)
 * @route     GET /api/admin/forum/posts/:id
 * @access    Private/Admin
 */
exports.getPostByIdForAdmin = async (req, res) => {
    try {
        // Fetch post and populate the real user, DO NOT sanitize
        const post = await ForumPost.findById(req.params.id).populate('user', 'username email');
        if (!post) {
            return res.status(404).json({ success: false, data: null, error: 'Post not found.' });
        }

        // Fetch comments and populate real users, DO NOT sanitize
        const comments = await ForumComment.find({ post: req.params.id })
            .populate('user', 'username email')
            .sort({ createdAt: 1 });

        // Send the raw, unsanitized data
        res.status(200).json({ success: true, data: { post, comments }, error: null });
    } catch (error) {
        console.error("Admin failed to fetch single post:", error);
        res.status(500).json({ success: false, data: null, error: 'Server error fetching post.' });
    }
};


// @desc      Admin: Delete a forum post and all its comments
// @route     DELETE /api/admin/forum/posts/:id
// @access    Private/Admin
exports.deletePostByAdmin = async (req, res) => {
    try {
        const postId = req.params.id;
        const post = await ForumPost.findById(postId);
        if (!post) {
            return res.status(404).json({ success: false, data: null, error: 'Post not found.' });
        }
        
        await ForumComment.deleteMany({ post: postId });
        await ForumPost.findByIdAndDelete(postId);

        res.status(200).json({ success: true, data: { message: 'Post and comments deleted successfully.' }, error: null });
    } catch (error) {
        console.error("Admin failed to delete post:", error);
        res.status(500).json({ success: false, data: null, error: 'Server error deleting post.' });
    }
};

/**
 * @desc      [NEW] Report a post
 * @route     POST /api/forum/posts/:id/report
 * @access    Private
 */
exports.reportPost = async (req, res) => {
    try {
        const post = await ForumPost.findById(req.params.id);
        if (!post) {
            return res.status(404).json({ success: false, error: 'Post not found.' });
        }

        // Use $addToSet to add the user ID to the reports array only if it's not already there.
        await post.updateOne({ $addToSet: { reports: req.user.id } });

        res.status(200).json({ success: true, data: { message: 'Post reported successfully.' } });
    } catch (error) {
        console.error("Failed to report post:", error);
        res.status(500).json({ success: false, error: 'Server error while reporting post.' });
    }
};

/**
 * @desc      [NEW] Report a comment
 * @route     POST /api/forum/comments/:id/report
 * @access    Private
 */
exports.reportComment = async (req, res) => {
    try {
        const comment = await ForumComment.findById(req.params.id);
        if (!comment) {
            return res.status(404).json({ success: false, error: 'Comment not found.' });
        }

        // Add the user's ID to the comment's report list.
        await comment.updateOne({ $addToSet: { reports: req.user.id } });

        res.status(200).json({ success: true, data: { message: 'Comment reported successfully.' } });
    } catch (error) {
        console.error("Failed to report comment:", error);
        res.status(500).json({ success: false, error: 'Server error while reporting comment.' });
    }
};
