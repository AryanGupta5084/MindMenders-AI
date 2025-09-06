// socket/socketHandler.js
// This is the heart of our real-time communication system using Socket.IO.
// It handles authenticating users, managing connections, and processing
// live chat events for appointments.

const jwt = require('jsonwebtoken');
const User = require('../models/User');
const LiveChatMessage = require('../models/LiveChatMessage');
const Appointment = require('../models/Appointment');
const Counselor = require('../models/Counselor');

module.exports = function(io) {
  // --- Socket.IO Middleware for Authentication ---
  // This runs for every incoming connection *before* the main 'connection' event.
  // It's like a bouncer at the door for our real-time server.
  io.use(async (socket, next) => {
    const token = socket.handshake.auth.token;

    // If the client didn't send a token, don't let them in.
    if (!token) {
      return next(new Error('Authentication error: Token not provided.'));
    }

    try {
      // 1. Verify the JWT token is valid and not expired.
      const decoded = jwt.verify(token, process.env.JWT_SECRET);

      // 2. Find the user in our database based on the ID from the token.
      const user = await User.findById(decoded.id).select('-password');
      if (!user) {
        return next(new Error('Authentication error: User not found.'));
      }

      // 3. Success! Attach the user object to the socket itself.
      // This is super useful because now we can access `socket.user` in all our event handlers.
      socket.user = user;
      next(); // Let the connection proceed.

    } catch (err) {
      // This catches errors like an invalid signature or an expired token.
      next(new Error('Authentication error: Invalid token.'));
    }
  });


  // --- Main Connection Handler ---
  // This block runs after a user has been successfully authenticated by our middleware.
  io.on('connection', (socket) => {
    // A nice little log to know who just connected.
    console.log(`🔌 User connected: ${socket.user.username} (${socket.id})`);

    // --- Event: joinSession ---
    // A client will emit this event when they enter a specific chat screen.
    socket.on('joinSession', async ({ appointmentId }) => {
      try {
        if (!appointmentId) {
            return socket.emit('messageError', { error: 'Invalid session ID.' });
        }

        // 1. Find the appointment the user is trying to join.
        const appointment = await Appointment.findById(appointmentId);
        if (!appointment) {
            return socket.emit('messageError', { error: 'Appointment not found.' });
        }

        // 2. Find the counselor profile linked to that appointment.
        const counselor = await Counselor.findById(appointment.counselor);
        if (!counselor) {
            return socket.emit('messageError', { error: 'Session configuration error.' });
        }

        // 3. CRITICAL: Check if the authenticated socket user is a valid participant.
        const isPatient = appointment.user.toString() === socket.user._id.toString();
        const isCounselor = counselor.user.toString() === socket.user._id.toString();

        if (!isPatient && !isCounselor) {
            // If the user is neither the patient nor the counselor, deny access.
            console.warn(`SECURITY: User ${socket.user.username} attempted to join unauthorized room ${appointmentId}`);
            return socket.emit('messageError', { error: 'You are not authorized to join this session.' });
        }
        
        socket.join(appointmentId);
        console.log(`${socket.user.username} joined session (room): ${appointmentId}`);

        // Fetch the existing chat history for this appointment.
        const historyDocs = await LiveChatMessage.find({ appointment: appointmentId })
          .populate('sender', 'username') // Get the sender's username
          .sort({ createdAt: 'asc' });   // Sort from oldest to newest

        // This is necessary to trigger the 'decrypt' getter before sending over Socket.IO.
        const history = historyDocs.map(msg => msg.toObject());

        // Send the fetched history only to the client who just joined.
        socket.emit('loadHistory', history);

      } catch (error) {
        console.error('Error fetching chat history:', error);
        // Let the user know if history couldn't be loaded.
        socket.emit('messageError', { error: 'Could not load chat history.' });
      }
    });


    // --- Event: sendMessage ---
    // Fired when a user sends a message in a chat.
    socket.on('sendMessage', async ({ appointmentId, message }) => {
      try {
        const MAX_CHAT_LENGTH = 2000; // Set a reasonable limit

        if (typeof message !== 'string' || message.trim() === '') {
            // Don't process empty messages
            return socket.emit('messageError', { error: 'Message cannot be empty.' });
        }

        if (message.length > MAX_CHAT_LENGTH) {
            // Reject messages that are too long
            return socket.emit('messageError', { error: `Message exceeds the ${MAX_CHAT_LENGTH} character limit.` });
        }
        // Step 1: Persist the message to the database so it's saved forever.
        const chatMessage = await LiveChatMessage.create({
          appointment: appointmentId,
          sender: socket.user._id,
          message: message // The original, unencrypted message
        });

        // A quick debug log, sometimes useful during development.
        // console.log(`Message from ${socket.user.username} in room ${appointmentId}: ${message}`);

        // Step 2: Prepare the data payload to send to the other clients.
        const messageData = {
            senderId: socket.user._id,
            senderUsername: socket.user.username,
            message: message, // The plain text message for the UI
            timestamp: chatMessage.createdAt
        };

        // Step 3: Broadcast the message to everyone *else* in the appointment room.
        // `socket.to(room)` sends it to all clients in the room except the sender.
        socket.to(appointmentId).emit('receiveMessage', messageData);

      } catch (error) {
        console.error('Error saving or sending message:', error);
        // Let the sender know that their message failed to send.
        socket.emit('messageError', { error: 'Sorry, we could not send your message.' });
      }
    });


    // --- Event: disconnect ---
    // This is a built-in event that fires when the client closes the connection.
    socket.on('disconnect', () => {
      console.log(`🔌 User disconnected: ${socket.user.username} (${socket.id})`);
    });
  });
};
