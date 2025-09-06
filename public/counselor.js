/**
 * public/counselor.js
 * * This script is the engine for the counselor's dashboard. It's responsible for:
 * - Authenticating the user to ensure only authorized counselors can access this page.
 * - Fetching and displaying the counselor's unique appointment schedule.
 * - Enabling the real-time chat functionality for active, confirmed appointments using Socket.IO.
 * - Handling a clean logout process.
 */
document.addEventListener('DOMContentLoaded', () => {

    // --- Let's grab all the HTML elements we'll need to work with ---
    const counselorUsernameEl = document.getElementById('counselorUsername');
    const logoutBtn = document.getElementById('logoutBtn');
    const appointmentsTableBody = document.getElementById('appointmentsTableBody');
    const liveChatModal = document.getElementById('liveChatModal');
    const closeLiveChatModalBtn = document.getElementById('closeLiveChatModalBtn');
    const liveChatHeader = document.getElementById('liveChatHeader');
    const liveChatMessages = document.getElementById('liveChatMessages');
    const liveChatForm = document.getElementById('liveChatForm');
    const liveChatMessageInput = document.getElementById('liveChatMessageInput');
    const counselorSpecialtyEl = document.getElementById('counselorSpecialty');
    const counselorBioEl = document.getElementById('counselorBio');
    const availabilityForm = document.getElementById('availabilityForm');
    const availabilityContainer = document.getElementById('availabilityContainer');

    // --- These variables will hold our app's state ---
    let socket; // This will hold our real-time connection.
    let currentUser = null; // To store the logged-in counselor's details.
    let currentAppointmentId = null; // To keep track of which chat room we're in.

    // --- Let's kick things off! ---
    // First, we need to verify the user is a logged-in counselor and then load their appointments.
    checkAuthAndLoadDashboard(); // [MODIFIED] Renamed function for clarity

    // --- Setting up our event listeners for user actions ---
    logoutBtn.addEventListener('click', () => {
        // When the user logs out, we clear their token and send them back to the homepage.
        localStorage.removeItem('token');
        window.location.href = '/';
    });

    closeLiveChatModalBtn.addEventListener('click', () => {
        // When closing the chat modal, we hide it and disconnect the socket to save resources.
        liveChatModal.classList.add('hidden');
        if (socket) {
            socket.disconnect();
        }
    });

    liveChatForm.addEventListener('submit', handleLiveChatMessageSend);
    availabilityForm.addEventListener('submit', handleAvailabilityUpdate);


    /**
     * The main security gate for this page.
     * It performs a sequential check:
     * 1. Check for a valid token (Authentication).
     * 2. Check if that user has a counselor profile (Authorization).
     * 3. Only if both pass, load the dashboard.
     */
    async function checkAuthAndLoadDashboard() {
        const token = localStorage.getItem('token');
        // If there's no token, they aren't logged in. Redirect them immediately.
        if (!token) {
            window.location.href = '/';
            return;
        }

        try {
            // Let the user know we're loading their schedule.
            appointmentsTableBody.innerHTML = '<tr><td colspan="4">Loading your schedule...</td></tr>';
            const authHeader = { 'Authorization': `Bearer ${token}` };

            // --- Step 1: Authentication ---
            // Verify who the user is with the /api/users/me endpoint.
            const meResponse = await fetch('/api/users/me', { headers: authHeader });
            const meResult = await meResponse.json();
            if (!meResult.success) {
                throw new Error('Authentication failed. Please log in again.');
            }
            currentUser = meResult.data;
            counselorUsernameEl.textContent = currentUser.username;

            // --- Step 2: Authorization ---
            // Now, check if this authenticated user is actually a counselor.
            const profileResponse = await fetch('/api/counselors/profile', { headers: authHeader });
            if (!profileResponse.ok) {
                 // If the response is not OK (e.g., 404 Not Found), this user is not a counselor.
                throw new Error('Access Denied: You are not authorized to view this page.');
            }
            
            // This is a counselor, extract their profile data.
            const profileResult = await profileResponse.json();
            if (!profileResult.success) throw new Error(profileResult.error);
            const profile = profileResult.data;

            // --- Step 3: Load Dashboard Data ---
            // Since we already have the profile data, we can populate it directly.
            buildAvailabilityForm(); // Build the form structure
            populateProfileData(profile); // Populate the form with data

            // Now, fetch the appointments specifically for this counselor.
            const appointmentsResponse = await fetch('/api/counselors/my-appointments', { headers: authHeader });
            const appointmentsResult = await appointmentsResponse.json();
            if (!appointmentsResult.success) {
                throw new Error(appointmentsResult.error);
            }

            // We've got the appointments! Time to display them.
            renderAppointments(appointmentsResult.data);

        } catch (error) {
            // This single catch block will now handle both auth failures AND authorization failures.
            alert(error.message);
            window.location.href = '/';
        }
    }

    /**
     * Takes an array of appointment data and beautifully renders it into our HTML table.
     * @param {Array} appointments - The list of appointments for this counselor.
     */
    function renderAppointments(appointments) {
        if (!appointments || appointments.length === 0) {
            appointmentsTableBody.innerHTML = '<tr><td colspan="4">You have no appointments scheduled.</td></tr>';
            return;
        }

        const now = new Date();
        // We only want to show appointments that haven't ended yet.
        const upcomingAppointments = appointments.filter(apt => new Date(apt.endTime) > now);

        if (upcomingAppointments.length === 0) {
            appointmentsTableBody.innerHTML = '<tr><td colspan="4">You have no upcoming appointments.</td></tr>';
            return;
        }

        // We'll build the table rows from our appointment data.
        appointmentsTableBody.innerHTML = upcomingAppointments.map(apt => {
            const startTime = new Date(apt.startTime);
            const endTime = new Date(apt.endTime);
            
            // The "Join Chat" button should only be active if the appointment is 'confirmed'
            // and the current time is within the scheduled appointment window.
            const canJoin = apt.status === 'confirmed' && now >= startTime && now <= endTime;

            return `
                <tr>
                    <td>${apt.user.username}</td>
                    <td>${startTime.toLocaleString()}</td>
                    <td>
                        <span class="status-badge status-${apt.status}">${apt.status.replace(/_/g, ' ')}</span>
                    </td>
                    <td>
                        <button class="btn primary-btn small-btn" 
                                data-appointment-id="${apt._id}" 
                                data-client-name="${apt.user.username}"
                                ${canJoin ? '' : 'disabled'}>
                            Join Chat
                        </button>
                    </td>
                </tr>
            `;
        }).join('');

        // Now that the buttons exist in the HTML, let's make them clickable.
        appointmentsTableBody.querySelectorAll('button[data-appointment-id]').forEach(button => {
            button.addEventListener('click', (event) => {
                const { appointmentId, clientName } = event.currentTarget.dataset;
                joinLiveChat(appointmentId, clientName);
            });
        });
    }

    /**
     * @param {object} profile - The counselor profile object fetched during auth.
     */
    function populateProfileData(profile) {
        try {
            counselorSpecialtyEl.textContent = profile.specialty;
            counselorBioEl.textContent = profile.bio || 'Not set.';

            // Reset all form fields before populating
            availabilityContainer.querySelectorAll('input[type="checkbox"]').forEach(cb => cb.checked = false);
            availabilityContainer.querySelectorAll('input[type="time"]').forEach(input => input.disabled = true);

            // Populate the form with the counselor's current availability
            profile.availability.forEach(slot => {
                const dayCheckbox = document.getElementById(`day-${slot.dayOfWeek}`);
                if (dayCheckbox) {
                    dayCheckbox.checked = true;
                    const startTimeInput = document.getElementById(`start-${slot.dayOfWeek}`);
                    const endTimeInput = document.getElementById(`end-${slot.dayOfWeek}`);
                    startTimeInput.value = slot.startTime;
                    endTimeInput.value = slot.endTime;
                    startTimeInput.disabled = false;
                    endTimeInput.disabled = false;
                }
            });
        } catch (error) {
            console.error("Could not populate counselor profile:", error);
            counselorSpecialtyEl.textContent = 'Error loading data.';
        }
    }

    /**
     * Builds the initial structure of the 7-day availability form.
     */
    function buildAvailabilityForm() {
        const daysOfWeek = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
        availabilityContainer.innerHTML = daysOfWeek.map((day, index) => `
            <div class="availability-day">
                <label>
                    <input type="checkbox" id="day-${index}" data-day="${index}">
                    ${day}
                </label>
                <input type="time" id="start-${index}" disabled>
                <span>-</span>
                <input type="time" id="end-${index}" disabled>
            </div>
        `).join('');

        // Add event listeners to enable/disable time inputs when a day is checked
        availabilityContainer.addEventListener('change', (e) => {
            if (e.target.type === 'checkbox') {
                const dayIndex = e.target.dataset.day;
                const startTimeInput = document.getElementById(`start-${dayIndex}`);
                const endTimeInput = document.getElementById(`end-${dayIndex}`);
                startTimeInput.disabled = !e.target.checked;
                endTimeInput.disabled = !e.target.checked;
            }
        });
    }

    /**
     * Handles the submission of the availability form.
     */
    async function handleAvailabilityUpdate(e) {
        e.preventDefault();
        const saveBtn = availabilityForm.querySelector('button[type="submit"]');
        saveBtn.disabled = true;
        saveBtn.textContent = 'Saving...';

        try {
            const newAvailability = [];
            const dayCheckboxes = availabilityContainer.querySelectorAll('input[type="checkbox"]');

            dayCheckboxes.forEach(checkbox => {
                if (checkbox.checked) {
                    const dayIndex = checkbox.dataset.day;
                    const startTime = document.getElementById(`start-${dayIndex}`).value;
                    const endTime = document.getElementById(`end-${dayIndex}`).value;
                    
                    if (startTime && endTime) {
                        newAvailability.push({
                            dayOfWeek: parseInt(dayIndex),
                            startTime: startTime,
                            endTime: endTime
                        });
                    }
                }
            });

            const token = localStorage.getItem('token');
            const response = await fetch('/api/counselors/availability', {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
                body: JSON.stringify({ availability: newAvailability })
            });
            const result = await response.json();
            if (!result.success) throw new Error(result.error);

            alert('Availability updated successfully!');
        } catch (error) {
            alert(`Error saving changes: ${error.message}`);
        } finally {
            saveBtn.disabled = false;
            saveBtn.textContent = 'Save Changes';
        }
    }

    /**
     * Kicks off the live chat session when a counselor clicks a "Join Chat" button.
     * @param {string} appointmentId - The unique ID of the appointment.
     * @param {string} clientName - The name of the client to display in the chat header.
     */
    function joinLiveChat(appointmentId, clientName) {
        currentAppointmentId = appointmentId;
        liveChatHeader.textContent = `Live Session with ${clientName}`;
        liveChatMessages.innerHTML = '<p class="system-message">Connecting to session...</p>';
        liveChatModal.classList.remove('hidden');

        // This is where we establish the real-time connection, passing our token for authentication.
        socket = io({ auth: { token: localStorage.getItem('token') } });

        // --- Setting up listeners for real-time events ---

        socket.on('connect', () => {
            liveChatMessages.innerHTML = '<p class="system-message">Connected! You have joined the session.</p>';
            // Tell the server which appointment's "room" we want to listen to.
            socket.emit('joinSession', { appointmentId: currentAppointmentId });
        });

        socket.on('loadHistory', (history) => {
            liveChatMessages.innerHTML = ''; // Clear any "Connecting..." message
            if (history && history.length > 0) {
                history.forEach(msg => {
                    const isMe = msg.sender._id === currentUser._id;
                    const messageData = {
                        message: msg.message, // Message is already decrypted
                        senderUsername: msg.sender.username
                    };
                    addMessageToChat(messageData, isMe);
                });
            } else {
                liveChatMessages.innerHTML = '<p class="system-message">You have joined the session. Please wait for your client.</p>';
            }
        });

        socket.on('receiveMessage', (messageData) => {
            // A new message has arrived from the client.
            addMessageToChat(messageData, false); // `false` means it's not from us.
        });

        socket.on('connect_error', (err) => {
            liveChatMessages.innerHTML = `<p class="error-text">Connection failed: ${err.message}. Please try again.</p>`;
        });

        socket.on('disconnect', () => {
            liveChatMessages.innerHTML += '<p class="system-message">You have been disconnected from the session.</p>';
        });
    }

    /**
     * Handles sending a message from the counselor to the client.
     */
    function handleLiveChatMessageSend(event) {
        event.preventDefault();
        const messageText = liveChatMessageInput.value.trim();
        if (!messageText || !socket || !currentAppointmentId) return;

        // We'll create the message object on our end to display it immediately.
        const messageData = {
            senderId: currentUser._id,
            senderUsername: currentUser.username,
            message: messageText,
            timestamp: new Date().toISOString()
        };

        // Send the message to the server to be broadcast to the client.
        socket.emit('sendMessage', {
            appointmentId: currentAppointmentId,
            message: messageText
        });

        // Add our own message to our chat window right away for a snappy feel.
        addMessageToChat(messageData, true); // `true` means it's our own message.
        liveChatMessageInput.value = ''; // Clear the input box.
    }

    /**
     * A handy helper to add a new message bubble to the chat window.
     * @param {object} data - The message data, containing the message text and sender info.
     * @param {boolean} isFromMe - A flag to determine if the message should be styled as "sent" or "received".
     */
    function addMessageToChat(data, isFromMe) {
        const messageDiv = document.createElement('div');
        // We use CSS classes to style our messages differently based on who sent them.
        messageDiv.className = `exercise-message ${isFromMe ? 'user-message' : 'bot-message'}`;
        messageDiv.innerHTML = `<p>${data.message}</p>`; // Basic sanitization happens on the backend/in message rendering.
        
        liveChatMessages.appendChild(messageDiv);
        // Automatically scroll to the bottom to see the newest message.
        liveChatMessages.scrollTop = liveChatMessages.scrollHeight;
    }
});