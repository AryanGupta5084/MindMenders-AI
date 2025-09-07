/**
 * public/script.js
 * * This is the main engine for the Sahara web application. It handles everything the user sees and does, including:
 * - User authentication (login, registration, guest access).
 * - Managing the visibility of different UI elements (like modals and dropdowns).
 * - Sending and receiving chat messages with the AI backend.
 * - Powering all interactive features like the journal, guided exercises, forum, and appointment booking.
 * - Handling real-time communication for live chat sessions with counselors.
 * - Rendering dynamic data, from chat history to wellness progress charts.
 */

// This is the main entry point for our script. The code inside won't run until the entire
// HTML page has been loaded and is ready to be manipulated.
document.addEventListener('DOMContentLoaded', () => {
    
    // ===================================================================================
    // --- 1. DOM ELEMENT REFERENCES ---
    // We start by grabbing all the HTML elements we'll need to work with.
    // This makes the code cleaner and faster since we don't have to search the DOM every time.
    // ===================================================================================

    // --- Core UI & Auth ---
    const userButton = document.getElementById('userButton');
    const dropdownMenu = document.getElementById('dropdownMenu');
    const loginBtn = document.getElementById('loginBtn');
    const registerBtn = document.getElementById('registerBtn');
    const logoutBtn = document.getElementById('logoutBtn');
    const clearHistoryBtn = document.getElementById('clearHistoryBtn');
    const usernameElement = document.getElementById('username');
    const authContainer = document.getElementById('authContainer');
    const closeAuthBtn = document.getElementById('closeAuthBtn');
    const loginForm = document.getElementById('loginForm');
    const registerForm = document.getElementById('registerForm');
    const showLoginFormLink = document.getElementById('showLoginForm');
    const showRegisterFormLink = document.getElementById('showRegisterForm');
    const notification = document.getElementById('notification');
    const adminPanelBtn = document.getElementById('adminPanelBtn');
    const guestBtn = document.getElementById('guestBtn');
    const languageSelector = document.getElementById('languageSelector');
    const sessionHistoryContainer = document.getElementById('sessionHistoryContainer');
    const sessionHistoryDivider = document.getElementById('sessionHistoryDivider');
    
    // --- Chat Interface ---
    const messageForm = document.getElementById('messageForm');
    const messageInput = document.getElementById('messageInput');
    const chatMessages = document.getElementById('chatMessages');

    // --- Feature Modals & Buttons ---
    const resourcesBtn = document.getElementById('resourcesBtn');
    const resourcesModal = document.getElementById('resourcesModal');
    const closeResourcesModalBtn = document.getElementById('closeResourcesModalBtn');
    const resourcesContainer = document.getElementById('resourcesContainer');
    const resourceTagInput = document.getElementById('resourceTagInput');
    const progressBtn = document.getElementById('progressBtn');
    const progressModal = document.getElementById('progressModal');
    const closeProgressModalBtn = document.getElementById('closeProgressModalBtn');

    // --- Accessibility ---
    const micBtn = document.getElementById('micBtn');
    const ttsBtn = document.getElementById('ttsBtn');

    // --- Live Chat (Counselor Session) ---
    const liveChatModal = document.getElementById('liveChatModal');
    const closeLiveChatModalBtn = document.getElementById('closeLiveChatModalBtn');
    const liveChatMessages = document.getElementById('liveChatMessages');
    const liveChatForm = document.getElementById('liveChatForm');
    const liveChatMessageInput = document.getElementById('liveChatMessageInput');
    const liveChatHeader = document.getElementById('liveChatHeader');

    // --- Appointment Booking ---
    const bookAppointmentBtn = document.getElementById('bookAppointmentBtn');
    const myAppointmentsBtn = document.getElementById('myAppointmentsBtn');
    const userActionsDivider = document.getElementById('userActionsDivider');
    const bookingModal = document.getElementById('bookingModal');
    const closeBookingModalBtn = document.getElementById('closeBookingModalBtn');
    const bookingStep1 = document.getElementById('booking-step-1');
    const bookingStep2 = document.getElementById('booking-step-2');
    const bookingStep3 = document.getElementById('booking-step-3');
    const counselorSelectionContainer = document.getElementById('counselor-selection-container');
    const slotDatePicker = document.getElementById('slot-date-picker');
    const slotSelectionContainer = document.getElementById('slot-selection-container');
    const selectedCounselorName = document.getElementById('selected-counselor-name');
    const bookingBackBtn = document.getElementById('bookingBackBtn');
    const bookingConfirmationDetails = document.getElementById('booking-confirmation-details');
    const confirmBookingBtn = document.getElementById('confirmBookingBtn');
    const myAppointmentsModal = document.getElementById('myAppointmentsModal');
    const closeMyAppointmentsModalBtn = document.getElementById('closeMyAppointmentsModalBtn');
    const myAppointmentsContainer = document.getElementById('myAppointmentsContainer');

    // --- Community Forum ---
    const forumBtn = document.getElementById('forumBtn');
    const forumModal = document.getElementById('forumModal');
    const closeForumModalBtn = document.getElementById('closeForumModalBtn');
    const forumListView = document.getElementById('forum-list-view');
    const forumDetailView = document.getElementById('forum-detail-view');
    const forumCreateView = document.getElementById('forum-create-view');
    const createNewPostBtn = document.getElementById('createNewPostBtn');
    const backToPostsBtn = document.getElementById('backToPostsBtn');
    const backFromCreateBtn = document.getElementById('backFromCreateBtn');
    const forumPostsContainer = document.getElementById('forum-posts-container');
    const singlePostContainer = document.getElementById('forum-single-post-container');
    const commentsContainer = document.getElementById('forum-comments-container');
    const createPostForm = document.getElementById('createPostForm');
    const commentForm = document.getElementById('commentForm');

    // --- Daily Journal ---
    const journalBtn = document.getElementById('journalBtn');
    const journalModal = document.getElementById('journalModal');
    const closeJournalModalBtn = document.getElementById('closeJournalModalBtn');
    const journalForm = document.getElementById('journalForm');
    const moodSelector = document.querySelector('.mood-selector');
    const selectedMoodInput = document.getElementById('selectedMood');
    const journalContent = document.getElementById('journalContent');
    const journalTodayMessage = document.getElementById('journal-today-message');
    const moodCalendar = document.getElementById('moodCalendar');
    const currentMonthYear = document.getElementById('currentMonthYear');
    const prevMonthBtn = document.getElementById('prevMonthBtn');
    const nextMonthBtn = document.getElementById('nextMonthBtn');
    const streakIndicator = document.getElementById('streak-indicator');
    const journalViewMode = document.getElementById('journal-view-mode');
    const journalViewDate = document.getElementById('journalViewDate');
    const journalViewContent = document.getElementById('journalViewContent');
    const deleteJournalEntryBtn = document.getElementById('deleteJournalEntryBtn');
    const backToJournalFormBtn = document.getElementById('backToJournalFormBtn');

    // --- Guided Exercises ---
    const exerciseBtn = document.getElementById('exerciseBtn');
    const exerciseModal = document.getElementById('exerciseModal');
    const closeExerciseModalBtn = document.getElementById('closeExerciseModalBtn');
    const exerciseListView = document.getElementById('exercise-list-view');
    const exerciseSessionView = document.getElementById('exercise-session-view');
    const exerciseListContainer = document.getElementById('exercise-list-container');
    const backToExerciseListBtn = document.getElementById('backToExerciseListBtn');
    const exerciseSessionTitle = document.getElementById('exercise-session-title');
    const exerciseMessages = document.getElementById('exercise-messages');
    const exerciseResponseForm = document.getElementById('exerciseResponseForm');
    const exerciseResponseInput = document.getElementById('exerciseResponseInput');
    const exerciseCompleteMessage = document.getElementById('exercise-complete-message');

    // --- Screening Test Refs ---
    const screeningBtn = document.getElementById('screeningBtn');
    const screeningModal = document.getElementById('screeningModal');
    const closeScreeningModalBtn = document.getElementById('closeScreeningModalBtn');
    const screeningListView = document.getElementById('screening-list-view');
    const screeningTestView = document.getElementById('screening-test-view');
    const screeningResultsView = document.getElementById('screening-results-view');
    const screeningListContainer = document.getElementById('screening-list-container');
    const backToScreeningListBtn = document.getElementById('backToScreeningListBtn');
    const screeningTestTitle = document.getElementById('screening-test-title');
    const screeningTestDescription = document.getElementById('screening-test-description');
    const screeningTestForm = document.getElementById('screeningTestForm');
    const screeningQuestionsContainer = document.getElementById('screening-questions-container');
    const screeningResultScore = document.getElementById('screening-result-score');
    const screeningResultInterpretation = document.getElementById('screening-result-interpretation');
    const screeningResultRecommendation = document.getElementById('screening-result-recommendation');
    const screeningResultEscalation = document.getElementById('screening-result-escalation');
    const closeScreeningResultsBtn = document.getElementById('closeScreeningResultsBtn');

    // --- Legal Modal Refs ---
    const legalModal = document.getElementById('legalModal');
    const closeLegalModalBtn = document.getElementById('closeLegalModalBtn');
    const legalModalTitle = document.getElementById('legalModalTitle');
    const legalModalBody = document.getElementById('legalModalBody');
    const registerTermsCheckbox = document.getElementById('registerTerms'); // The checkbox itself

    // ===================================================================================
    // --- 2. STATE MANAGEMENT ---
    // These variables hold the application's state. They track things like who is logged in,
    // what exercise is active, and the state of the current appointment booking process.
    // ===================================================================================

    let exerciseState = {
        activeExerciseId: null,
        currentStep: 0,
        isComplete: false
    };
    let isTextToSpeechEnabled = false;
    let isAuthenticated = false;
    let currentUser = null;
    let isAuthCheckComplete = false;
    let activeSessionId = null;
    let bookingState = {
        counselor: null,
        date: null,
        startTime: null
    };
    let socket; // This will hold our WebSocket connection for live chat.
    let liveChatState = {
        appointmentId: null
    };
    let journalState = { entries: [], currentDate: new Date() };

    // ===================================================================================
    // --- 3. INITIALIZATION & EVENT LISTENERS ---
    // This is where we set up the initial state of the app and attach functions
    // to all the interactive elements like buttons and forms.
    // ===================================================================================
    
    // --- PWA Service Worker Registration ---
    if ('serviceWorker' in navigator) {
        window.addEventListener('load', () => {
            navigator.serviceWorker.register('/service-worker.js')
                .then(registration => {
                    console.log('✅ Service Worker Registered. Scope:', registration.scope);
                })
                .catch(err => {
                    console.error('❌ Service Worker registration failed:', err);
                });
        });
    }

    // As a safety measure, we disable the chat input until we know who the user is.
    messageInput.disabled = true;
    messageInput.placeholder = 'Authenticating...';
    document.getElementById('sendButton').disabled = true;
    
    // The very first thing we do is check the user's authentication status.
    checkAuthStatus();

    // --- Attach all our event handler functions ---
    userButton.addEventListener('click', toggleDropdown);
    loginBtn.addEventListener('click', showLoginDialog);
    registerBtn.addEventListener('click', showRegisterDialog);
    logoutBtn.addEventListener('click', handleLogout);
    clearHistoryBtn.addEventListener('click', handleClearHistory);
    guestBtn.addEventListener('click', handleGuestLogin);
    closeAuthBtn.addEventListener('click', closeAuthDialog);
    showLoginFormLink.addEventListener('click', switchToLoginForm);
    showRegisterFormLink.addEventListener('click', switchToRegisterForm);
    loginForm.addEventListener('submit', handleLogin);
    registerForm.addEventListener('submit', handleRegister);
    messageForm.addEventListener('submit', sendMessage);
    
    // Direct the admin to the admin panel if they click the button.
    if (adminPanelBtn) {
        adminPanelBtn.addEventListener('click', () => {
            window.location.href = '/admin.html';
        });
    }

    // --- Resources Modal ---
    resourcesBtn.addEventListener('click', openResourcesModal);
    closeResourcesModalBtn.addEventListener('click', () => resourcesModal.classList.add('hidden'));
    // We re-fetch resources whenever the language is changed.
    languageSelector.addEventListener('change', () => {
        if (!resourcesModal.classList.contains('hidden')) {
            fetchAndRenderResources();
        }
    });
    // Use our debounce utility to prevent firing the API on every single keystroke in the tag filter.
    resourceTagInput.addEventListener('input', debounce(() => {
        if (!resourcesModal.classList.contains('hidden')) {
            fetchAndRenderResources();
        }
    }, 300));

    // --- Forum Listeners ---
    forumBtn.addEventListener('click', openForumModal);
    closeForumModalBtn.addEventListener('click', () => forumModal.classList.add('hidden'));
    createNewPostBtn.addEventListener('click', () => showForumView('create'));
    backToPostsBtn.addEventListener('click', () => openForumModal());
    backFromCreateBtn.addEventListener('click', () => showForumView('list'));
    createPostForm.addEventListener('submit', handleCreatePost);
    commentForm.addEventListener('submit', handleAddComment);
    
    // --- Journal Listeners ---
    journalBtn.addEventListener('click', openJournalModal);
    closeJournalModalBtn.addEventListener('click', () => journalModal.classList.add('hidden'));
    journalForm.addEventListener('submit', handleJournalSubmit);
    prevMonthBtn.addEventListener('click', () => changeMonth(-1));
    nextMonthBtn.addEventListener('click', () => changeMonth(1));
    // Handle the visual selection of mood emojis.
    moodSelector.addEventListener('click', e => {
        if (e.target.classList.contains('mood-option')) {
            document.querySelectorAll('.mood-option').forEach(opt => opt.classList.remove('selected'));
            e.target.classList.add('selected');
            selectedMoodInput.value = e.target.dataset.mood;
        }
    });
    moodCalendar.addEventListener('click', (e) => {
        // When a day with an entry is clicked, show the view mode for it.
        if (e.target.dataset.entry) {
            const entry = JSON.parse(e.target.dataset.entry);
            showJournalViewMode(entry);
        }
    });
    backToJournalFormBtn.addEventListener('click', openJournalModal);

    // --- Guided Exercise Listeners ---
    exerciseBtn.addEventListener('click', openExerciseModal);
    closeExerciseModalBtn.addEventListener('click', () => exerciseModal.classList.add('hidden'));
    backToExerciseListBtn.addEventListener('click', openExerciseModal);
    exerciseResponseForm.addEventListener('submit', handleExerciseResponse);

    // --- Progress Analytics Listeners ---
    progressBtn.addEventListener('click', openProgressModal);
    closeProgressModalBtn.addEventListener('click', () => progressModal.classList.add('hidden'));

    // --- Accessibility Listeners ---
    micBtn.addEventListener('click', handleVoiceInput);
    ttsBtn.addEventListener('click', toggleTextToSpeech);

    // --- Live Chat Listeners ---
    closeLiveChatModalBtn.addEventListener('click', () => {
        liveChatModal.classList.add('hidden');
        // It's important to disconnect the socket when the modal is closed to save resources.
        if (socket) {
            socket.disconnect(); 
        }
    });
    liveChatForm.addEventListener('submit', handleLiveChatMessageSend);

    // --- Booking & Appointment Listeners ---
    bookAppointmentBtn.addEventListener('click', openBookingModal);
    closeBookingModalBtn.addEventListener('click', () => bookingModal.classList.add('hidden'));
    bookingBackBtn.addEventListener('click', () => showBookingStep(1));
    slotDatePicker.addEventListener('change', () => {
        bookingState.date = slotDatePicker.value;
        fetchAndRenderSlots();
    });
    confirmBookingBtn.addEventListener('click', handleBookingConfirmation);
    myAppointmentsBtn.addEventListener('click', openMyAppointmentsModal);
    closeMyAppointmentsModalBtn.addEventListener('click', () => myAppointmentsModal.classList.add('hidden'));

    // --- Screening Test Listeners ---
    screeningBtn.addEventListener('click', openScreeningModal);
    closeScreeningModalBtn.addEventListener('click', () => screeningModal.classList.add('hidden'));
    backToScreeningListBtn.addEventListener('click', () => showScreeningView('list'));
    screeningTestForm.addEventListener('submit', handleScreeningSubmit);
    closeScreeningResultsBtn.addEventListener('click', () => showScreeningView('list')); // Go back to list after seeing results

    // --- Legal Modal Listeners ---
    closeLegalModalBtn.addEventListener('click', () => legalModal.classList.add('hidden'));

    // We use a delegated listener on the main auth container to catch clicks on the new legal links
    authContainer.addEventListener('click', (e) => {
        if (e.target.classList.contains('legal-link')) {
            e.preventDefault(); // Stop the link from navigating
            showLegalText(e.target.dataset.type);
        }
    });

    // ===================================================================================
    // --- 4. AUTHENTICATION & UI LOGIC ---
    // These functions control the user's authentication state and update the UI accordingly.
    // They are central to providing the correct experience for guests vs. logged-in users.
    // ===================================================================================

    /**
     * The single source of truth for updating the UI based on authentication status.
     * This function shows/hides all the relevant buttons and user info.
     * @param {boolean} auth - Is the user authenticated?
     * @param {object} user - The user object from the database.
     */
    function updateAuthState(auth, user) {
        isAuthenticated = auth;
        currentUser = user;

        if (auth && user) {
            // User is authenticated
            if (user.isGuest || user.guest) {
                // --- GUEST USER UI ---
                usernameElement.textContent = user.username || 'Guest';
                loginBtn.style.display = 'none';
                registerBtn.style.display = 'none';
                guestBtn.style.display = 'none';
                logoutBtn.textContent = 'Exit Guest';
                logoutBtn.style.display = 'block';
                clearHistoryBtn.style.display = 'none';
                if (adminPanelBtn) adminPanelBtn.style.display = 'none';

                // Guests can't access features that require a persistent account.
                userActionsDivider.style.display = 'none';
                bookAppointmentBtn.style.display = 'none';
                myAppointmentsBtn.style.display = 'none';
                forumBtn.style.display = 'none';
                journalBtn.style.display = 'none';
                exerciseBtn.style.display = 'none';
                progressBtn.style.display = 'none';
                screeningBtn.style.display = 'none';
                streakIndicator.style.display = 'none';

            } else {
                // --- LOGGED-IN USER UI ---
                usernameElement.textContent = user.username;
                loginBtn.style.display = 'none';
                registerBtn.style.display = 'none';
                guestBtn.style.display = 'none';
                logoutBtn.textContent = 'Logout';
                logoutBtn.style.display = 'block';
                clearHistoryBtn.style.display = 'block';
                if (adminPanelBtn) {
                    // Only show the admin panel button if the user is an admin.
                    adminPanelBtn.style.display = user.isAdmin ? 'block' : 'none';
                }

                // Show all the feature buttons for registered users.
                userActionsDivider.style.display = 'block';
                bookAppointmentBtn.style.display = 'block';
                myAppointmentsBtn.style.display = 'block';
                forumBtn.style.display = 'block';
                journalBtn.style.display = 'block';
                exerciseBtn.style.display = 'block';
                progressBtn.style.display = 'block';
                screeningBtn.style.display = 'block';
            }
        } else {
            // --- LOGGED-OUT UI ---
            usernameElement.textContent = 'Guest';
            loginBtn.style.display = 'block';
            registerBtn.style.display = 'block';
            guestBtn.style.display = 'block';
            logoutBtn.style.display = 'none';
            clearHistoryBtn.style.display = 'none';
            if (adminPanelBtn) adminPanelBtn.style.display = 'none';
            sessionHistoryContainer.innerHTML = '';
            sessionHistoryDivider.style.display = 'none';
            
            // Hide all feature buttons when logged out.
            userActionsDivider.style.display = 'none';
            bookAppointmentBtn.style.display = 'none';
            myAppointmentsBtn.style.display = 'none';
            forumBtn.style.display = 'none';
            journalBtn.style.display = 'none';
            exerciseBtn.style.display = 'none';
            progressBtn.style.display = 'none';
            screeningBtn.style.display = 'none';
            streakIndicator.style.display = 'none';
        }
    }

    // This makes the message input box grow as the user types.
    messageInput.addEventListener('input', function() {
        this.style.height = 'auto';
        this.style.height = (this.scrollHeight) + 'px';
        if (this.value === '') this.style.height = 'auto'; // Shrink back if empty
        
        // A simple client-side check to limit message length.
        const wordCount = this.value.trim().split(/\s+/).length;
        if (wordCount > 100) {
            this.value = this.value.trim().split(/\s+/).slice(0, 100).join(' ');
            showNotification('Message limited to 100 words', 'warning');
        }
    });

    // Allows the user to send a message by pressing Enter instead of clicking the button.
    messageInput.addEventListener('keydown', function(e) {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault(); // Prevents a new line from being added
            messageForm.dispatchEvent(new Event('submit'));
        }
    });
    
    /**
     * A helper function to decode the JWT token on the client-side.
     * This is useful for quickly accessing data like the session ID without another API call.
     * @param {string} token - The JWT token.
     * @returns {object|null} The decoded payload of the token, or null if it fails.
     */
    function parseJwt(token) {
        try {
            // The payload is the middle part of the token, base64 encoded.
            return JSON.parse(atob(token.split('.')[1]));
        } catch (e) {
            return null; // Return null if the token is malformed
        }
    }

    /**
     * Checks for a token in local storage and verifies it with the backend.
     * This is the master function that determines the user's state when the page loads.
     */
    async function checkAuthStatus() {
        try {
            const token = getToken();
            if (!token) {
                // No token means the user is not logged in.
                updateAuthState(false, null);
                return;
            }
            // We have a token, so let's ask the server if it's valid.
            const response = await fetch('/api/users/me', {
                headers: { 'Authorization': `Bearer ${token}` }
            });

            if (response.ok) {
                const result = await response.json();
                if (result.success) {
                    // The token is valid! Update the UI with the user's data.
                    updateAuthState(true, result.data);
                    updateStreakIndicator(result.data);
                    const tokenData = parseJwt(token);
                    if (tokenData) {
                        activeSessionId = tokenData.sessionId;
                    }
                    loadChatHistory(); // Load the chat for the current session.
                    loadAndRenderSessions(); // Load the list of past sessions.
                } else {
                    // The server said the token is invalid.
                    updateAuthState(false, null);
                }
            } else {
                // The request failed (e.g., server down, 401 Unauthorized).
                updateAuthState(false, null);
            }
        } catch (error) {
            console.error('Auth status check failed:', error);
            updateAuthState(false, null);
        } finally {
            // No matter what happens, we re-enable the chat input after the check is complete.
            isAuthCheckComplete = true;
            messageInput.disabled = false;
            messageInput.placeholder = 'Type your message here...';
            document.getElementById('sendButton').disabled = false;
        }
    }

    // --- Simple UI toggle functions ---
    function toggleDropdown() { dropdownMenu.classList.toggle('active'); }
    function showLoginDialog() { authContainer.classList.remove('hidden'); loginForm.classList.remove('hidden'); registerForm.classList.add('hidden'); dropdownMenu.classList.remove('active'); }
    function showRegisterDialog() { authContainer.classList.remove('hidden'); registerForm.classList.remove('hidden'); loginForm.classList.add('hidden'); dropdownMenu.classList.remove('active'); }
    function closeAuthDialog() { authContainer.classList.add('hidden'); }
    function switchToLoginForm(e) { e.preventDefault(); loginForm.classList.remove('hidden'); registerForm.classList.add('hidden'); }
    function switchToRegisterForm(e) { e.preventDefault(); registerForm.classList.remove('hidden'); loginForm.classList.add('hidden'); }
    
    // --- API Handlers for Authentication ---

    async function handleLogin(e) {
        e.preventDefault();
        const email = document.getElementById('loginEmail').value.trim();
        const password = document.getElementById('loginPassword').value.trim();

        if (!email || !password) { showNotification('Please fill in all fields', 'error'); return; }

        try {
            const response = await fetch('/api/users/login', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email, password })
            });
            const result = await response.json();
            if (result.success) {
                // Success! Store the token and refresh the auth state.
                localStorage.setItem('token', result.data.token);
                await checkAuthStatus();
                closeAuthDialog();
                showNotification('Login successful!', 'success');
                loginForm.reset();
            } else {
                showNotification(result.error || 'Login failed', 'error');
            }
        } catch (error) {
            console.error('Login error:', error);
            showNotification('Login failed. Please try again later.', 'error');
        }
    }

    async function handleRegister(e) {
        e.preventDefault();
        const username = document.getElementById('registerUsername').value.trim();
        const email = document.getElementById('registerEmail').value.trim();
        const password = document.getElementById('registerPassword').value;
        const confirmPassword = document.getElementById('confirmPassword').value;
        const hasAgreed = registerTermsCheckbox.checked;

        // Simple client-side validation.
        if (!username || !email || !password || !confirmPassword) { 
            return showNotification('Please fill in all fields', 'error'); 
        }
        if (password !== confirmPassword) { 
            return showNotification('Passwords do not match', 'error'); 
        }
        if (password.length < 6) { 
            return showNotification('Password must be at least 6 characters', 'error'); 
        }
        if (!hasAgreed) {
            return showNotification('You must agree to the Terms & Conditions and Privacy Policy to register.', 'error');
        }

        try {
            const response = await fetch('/api/users/register', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ username, email, password, hasAgreed })
            });
            const result = await response.json();
            if (result.success) {
                // Automatically log the user in after successful registration.
                localStorage.setItem('token', result.data.token);
                await checkAuthStatus();
                closeAuthDialog();
                showNotification('Registration successful!', 'success');
                registerForm.reset();
            } else {
                showNotification(result.error || 'Registration failed', 'error');
            }
        } catch (error) {
            console.error('Registration error:', error);
            showNotification('Registration failed. Please try again later.', 'error');
        }
    }

    async function handleLogout() {
        // This function calls the backend endpoint 
        // to invalidate the session on the server before clearing it locally.
        
        // Determine which logout endpoint to call.
        const isGuest = currentUser && currentUser.isGuest;
        const url = isGuest ? '/api/users/guest-logout' : '/api/users/logout';
        const token = getToken();

        try {
            // Make the server-side logout call to invalidate the token.
            // This is a protected route, so we must send our current token.
            if (token) {
                 await fetch(url, {
                    method: 'POST', // Use POST for both as it's a state-changing action
                    headers: { 
                        'Authorization': `Bearer ${token}`,
                        'Content-Type': 'application/json'
                    }
                });
            }
        } catch (error) {
            // Log the error but proceed with client-side logout regardless.
            // The user wants to be logged out, so we must fulfill that.
            console.error('Server-side logout call failed:', error);
        } finally {
            // This is the most important part: always clear the local token.
            localStorage.removeItem('token');
            updateAuthState(false, null); // Update the UI to the logged-out state.
            
            const notificationMessage = isGuest ? 'Exited guest session.' : 'Logged out successfully';
            showNotification(notificationMessage, 'success');
            dropdownMenu.classList.remove('active');
            
            // Reset the chat window to the welcome message.
            chatMessages.innerHTML = `<div class="message bot-message"><div class="message-content"><p>Hi there! I'm Sahara, your supportive mental health companion. How are you feeling today?</p></div><div class="message-time">Now</div></div>`;
            activeSessionId = null; 
            sessionHistoryContainer.innerHTML = '';
            sessionHistoryDivider.style.display = 'none';
        }
    }
    
    async function handleGuestLogin() {
        try {
            const response = await fetch('/api/users/guest', { method: 'POST' });
            const result = await response.json();
            if (result.success) {
                // The server creates a temporary guest user and gives us a token for them.
                localStorage.setItem('token', result.data.token);
                updateAuthState(true, result.data.user);
                const tokenData = parseJwt(result.data.token);
                if(tokenData) activeSessionId = tokenData.sessionId;
                showNotification('You are now chatting as a guest.', 'success');
                dropdownMenu.classList.remove('active');
                chatMessages.innerHTML = `<div class="message bot-message"><div class="message-content"><p>Hi there! I'm Sahara. How are you feeling today?</p></div><div class="message-time">Now</div></div>`;
                loadAndRenderSessions();
            } else {
                showNotification(result.error || 'Guest login failed.', 'error');
            }
        } catch (error) {
            console.error('Guest login error:', error);
            showNotification('Error connecting to the server.', 'error');
        }
    }

    // A nice little UX feature to close the dropdown if the user clicks anywhere else on the page.
    document.addEventListener('click', function(e) {
        if (!userButton.contains(e.target) && !dropdownMenu.contains(e.target)) {
            dropdownMenu.classList.remove('active');
        }
    });

    // ===================================================================================
    // --- 5. CHAT FUNCTIONALITY ---
    // These functions handle the core chat experience: sending messages, receiving responses,
    // managing history, and rendering the conversation.
    // ===================================================================================
    
    async function handleClearHistory() {
        if (!isAuthenticated) { showNotification('Please login to clear chat history', 'warning'); return; }
        if (!confirm('Are you sure you want to clear your chat history? This action cannot be undone.')) return;

        try {
            const response = await fetch('/api/chat/history', {
                method: 'DELETE',
                headers: { 'Authorization': `Bearer ${getToken()}` }
            });
            const result = await response.json();
            if (result.success) {
                showNotification('Chat history cleared successfully', 'success');
                chatMessages.innerHTML = `<div class="message bot-message"><div class="message-content"><p>Hi there! I'm Sahara, your supportive mental health companion. How are you feeling today?</p></div><div class="message-time">Now</div></div>`;
                dropdownMenu.classList.remove('active');
                loadAndRenderSessions(); // The session list will now be empty.
            } else {
                showNotification(result.error || 'Failed to clear chat history', 'error');
            }
        } catch (error) {
            console.error('Clear history error:', error);
            showNotification('Failed to clear chat history. Please try again later.', 'error');
        }
    }
    
    /**
     * Fetches the list of a user's past chat sessions and renders them as buttons in the dropdown menu.
     */
    async function loadAndRenderSessions() {
        // Guests don't have saved sessions.
        if (!isAuthenticated || (currentUser && currentUser.isGuest)) {
            sessionHistoryContainer.innerHTML = '';
            sessionHistoryDivider.style.display = 'none';
            return;
        };

        try {
            const response = await fetch('/api/chat/sessions', {
                headers: { 'Authorization': `Bearer ${getToken()}` }
            });
            const result = await response.json();
            sessionHistoryContainer.innerHTML = ''; // Clear previous list

            if (result.success && result.data.length > 0) {
                const title = document.createElement('h6');
                title.textContent = 'Past Sessions';
                sessionHistoryContainer.appendChild(title);

                // Add a button to easily return to the current chat.
                const currentSessionBtn = document.createElement('button');
                currentSessionBtn.textContent = 'Back to Current Chat';
                currentSessionBtn.onclick = () => loadChatHistory(activeSessionId);
                sessionHistoryContainer.appendChild(currentSessionBtn);

                // Create a button for each past session.
                result.data.forEach(session => {
                    const sessionButton = document.createElement('button');
                    const sessionDate = new Date(session.firstMessageDate).toLocaleDateString([], {
                        year: 'numeric', month: 'short', day: 'numeric'
                    });
                    sessionButton.textContent = `Session from ${sessionDate}`;
                    sessionButton.onclick = () => {
                        loadChatHistory(session.sessionId);
                        dropdownMenu.classList.remove('active');
                    };
                    sessionHistoryContainer.appendChild(sessionButton);
                });
                sessionHistoryDivider.style.display = 'block';
            } else {
                sessionHistoryDivider.style.display = 'none';
            }
        } catch (error) {
            console.error('Failed to load sessions:', error);
        }
    }
    
    /**
     * Fetches the full conversation for a given session ID and renders it in the chat window.
     * @param {string|null} sessionId - The ID of the session to load. If null, loads the active session.
     */
    async function loadChatHistory(sessionId = null) {
        if (!isAuthenticated) return;
        const targetSessionId = sessionId || activeSessionId;
        if (!targetSessionId) return;

        // When viewing a past session, we disable the input to make it read-only.
        messageInput.disabled = (sessionId !== null && sessionId !== activeSessionId);
        document.getElementById('sendButton').disabled = (sessionId !== null && sessionId !== activeSessionId);
        messageInput.placeholder = messageInput.disabled ? 'Viewing past session...' : 'Type your message here...';

        try {
            const response = await fetch(`/api/chat/history?sessionId=${targetSessionId}`, {
                headers: { 'Authorization': `Bearer ${getToken()}` }
            });
            const result = await response.json();
            chatMessages.innerHTML = ''; // Clear the current view

            if (result.success && result.data.length > 0) {
                result.data.forEach(chat => {
                    addMessageToChat(chat.message, 'user', formatTimestamp(chat.timestamp));
                    addMessageToChat(chat.response, 'bot', formatTimestamp(chat.timestamp), chat.needs_immediate_help, chat.sentiment);
                });
            } else {
                // If there's no history, show the default welcome message.
                chatMessages.innerHTML = `<div class="message bot-message"><div class="message-content"><p>Hi there! I'm Sahara, your supportive mental health companion. How are you feeling today?</p></div><div class="message-time">Now</div></div>`;
            }
            scrollToBottom();
        } catch (error) {
            console.error('Load chat history error:', error);
        }
    }

    /**
     * Handles the submission of the message form.
     * It sends the user's message to the backend and displays the AI's response.
     */
    async function sendMessage(e) {
        e.preventDefault();
        if (!isAuthCheckComplete || messageInput.disabled) return;
        
        const message = messageInput.value.trim();
        
        if (message.split(/\s+/).filter(Boolean).length > 100) { 
            showNotification('Message cannot exceed 100 words.', 'warning'); 
            return; 
        }
        if (!message) return;

        // Optimistically add the user's message to the UI.
        messageInput.value = '';
        messageInput.style.height = 'auto'; // Reset height
        addMessageToChat(message, 'user');
        
        // Show a loading indicator so the user knows the bot is "thinking".
        const loadingMessageId = 'loading-' + Date.now();
        addLoadingMessage(loadingMessageId);
        scrollToBottom();

        try {
            const headers = { 'Content-Type': 'application/json' };
            const token = getToken();
            if (token) headers['Authorization'] = `Bearer ${token}`;

            const body = { message, locale: languageSelector.value || 'en' };
            
            const response = await fetch('/api/chat/message', {
                method: 'POST',
                headers,
                body: JSON.stringify(body)
            });

            // Remove the loading indicator.
            document.getElementById(loadingMessageId)?.remove();

            if (response.status === 401) {
                // Handle cases where the JWT has expired mid-session.
                showNotification('Session expired. Please log in again.', 'error');
                localStorage.removeItem('token');
                updateAuthState(false, null);
                messageInput.value = message; // Put the user's message back in the input box
                return;
            }

            const result = await response.json();
            if (result.success) {
                // CRITICAL: Check if the server sent a new token due to a topic reset.
                if (result.data.newToken) {
                    localStorage.setItem('token', result.data.newToken); // Update the token
                    // The new token contains the new session ID, so we must update our active ID
                    const tokenData = parseJwt(result.data.newToken);
                    if (tokenData) {
                        activeSessionId = tokenData.sessionId;
                    }
                    // Refresh the session list to show the new "forked" session
                    loadAndRenderSessions(); 
                }
                // Add the bot's successful response to the chat.
                addMessageToChat(result.data.response, 'bot', formatTimestamp(result.data.timestamp), result.data.needs_immediate_help, result.data.sentiment);
                // If this is one of the first messages, refresh the session list in case it's a new session.
                if(chatMessages.children.length <= 3) {
                    loadAndRenderSessions();
                }
            } else {
                // Handle API errors gracefully.
                messageInput.value = message;
                addMessageToChat(result.error || "I'm having trouble responding right now.", 'bot');
            }
            scrollToBottom();
        } catch (error) {
            console.error('Send message error:', error);
            document.getElementById(loadingMessageId)?.remove();
            messageInput.value = message;
            addMessageToChat("I'm sorry, there was a connection error. Please try again.", 'bot');
            scrollToBottom();
        }
    }

    /**
     * A versatile function to add any message to the chat window.
     * @param {string} message - The text content of the message.
     * @param {string} sender - 'user' or 'bot'.
     * @param {string} timestamp - A formatted string like "5m ago".
     * @param {boolean} flagged - Should the message have a special urgent style?
     * @param {string|null} sentiment - The detected sentiment for additional styling.
     */
    function addMessageToChat(message, sender, timestamp = 'Now', flagged = false, sentiment = null) {
        const safeMessage = (typeof message === 'string' && message.trim()) ? message : 'Sorry, I could not process the message.';

        // 1. Create the <p> tag for the message content
        const messageP = createElement('p', { 
            textContent: safeMessage,
            style: { whiteSpace: 'pre-wrap' } 
        });

        // 2. Create the wrapper elements
        const messageContentDiv = createElement('div', { 
            className: 'message-content', 
            children: [messageP] 
        });
        
        const messageTimeDiv = createElement('div', { 
            className: 'message-time', 
            textContent: timestamp 
        });

        const messageElement = createElement('div', {
            className: `message ${sender}-message`,
            children: [messageContentDiv, messageTimeDiv]
        });

        // 3. Add classes for sentiments/flags
        if (flagged) messageElement.classList.add('urgent');
        if (sentiment && ['anxiety', 'depression', 'stress'].includes(sentiment)) {
            messageElement.classList.add(sentiment);
        }

        // 4. Add to the DOM
        chatMessages.appendChild(messageElement);

        // 5. Speak if TTS is on
        if (sender === 'bot' && isTextToSpeechEnabled) {
            speakText(safeMessage);
        }
    }

    /**
     * Adds a "Thinking..." message to the UI while waiting for an API response.
     * @param {string} id - A unique ID for the loading message element.
     */
    function addLoadingMessage(id) {
        const loadingElement = document.createElement('div');
        loadingElement.id = id;
        loadingElement.className = 'message bot-message';
        loadingElement.innerHTML = `<div class="message-content"><p><span class="loading-indicator"></span> Thinking...</p></div>`;
        chatMessages.appendChild(loadingElement);
    }
    
    /**
     * Formats message text to handle links and newlines.
     * @param {string} text - The raw text to format.
     * @returns {string} The HTML-formatted text.
     */
    function formatMessage(text) {
        if (typeof text !== 'string') return '';
        // Sanitize basic HTML characters.
        text = text.replace(/</g, "&lt;").replace(/>/g, "&gt;");
        // Find URLs and wrap them in anchor tags.
        const urlRegex = /(https?:\/\/[^\s]+)/g;
        return text.replace(urlRegex, url => `<a href="${url}" target="_blank" rel="noopener noreferrer">${url}</a>`).replace(/\n/g, '<br>');
    }

    /**
     * Converts a full timestamp into a user-friendly relative time (e.g., "5m ago").
     * @param {string} timestamp - The ISO 8601 timestamp string.
     * @returns {string} The formatted time string.
     */
    function formatTimestamp(timestamp) {
        if (!timestamp) return 'Now';
        const date = new Date(timestamp);
        const now = new Date();
        const diffMs = now - date;
        const diffSec = Math.round(diffMs / 1000);
        if (diffSec < 5) return 'Now';
        if (diffSec < 60) return `${diffSec}s ago`;
        const diffMin = Math.round(diffSec / 60);
        if (diffMin < 60) return `${diffMin}m ago`;
        const diffHour = Math.round(diffMin / 60);
        if (diffHour < 24) return `${diffHour}h ago`;
        const diffDay = Math.round(diffHour / 24);
        if (diffDay < 7) return `${diffDay}d ago`;
        return date.toLocaleDateString();
    }

    // A simple helper to keep the chat window scrolled to the latest message.
    function scrollToBottom() { chatMessages.scrollTop = chatMessages.scrollHeight; }
    
    // ===================================================================================
    // --- 6. FEATURE-SPECIFIC FUNCTIONS ---
    // This large section contains all the logic for the app's various features,
    // like Resources, Booking, Forum, Journal, Exercises, and Progress tracking.
    // ===================================================================================

    // --- Resources ---

    function openResourcesModal() {
        resourcesModal.classList.remove('hidden');
        fetchAndRenderResources();
    }

    async function fetchAndRenderResources() {
        resourcesContainer.innerHTML = '<p>Loading resources...</p>';
        const selectedLanguage = languageSelector.value || 'en';
        const selectedTag = resourceTagInput.value.trim();

        let apiUrl = `/api/resources?language=${selectedLanguage}`;
        if (selectedTag) {
            apiUrl += `&tag=${encodeURIComponent(selectedTag)}`;
        }
        try {
            const response = await fetch(apiUrl);
            if (!response.ok) throw new Error('Failed to fetch resources.');
            const result = await response.json();
            if (!result.success || !Array.isArray(result.data)) throw new Error(result.error || 'Invalid data received.');
            
            if (result.data.length === 0) {
                resourcesContainer.innerHTML = `<p>No resources found for the selected criteria. Please check back later!</p>`;
                return;
            }
            resourcesContainer.innerHTML = '';
            result.data.forEach(resource => {
                const card = createResourceCard(resource);
                resourcesContainer.appendChild(card);
            });
        } catch (error) {
            resourcesContainer.innerHTML = `<p style="color: var(--error);">Could not load resources. Please try again later.</p>`;
            console.error('Error fetching resources:', error);
        }
    }

    function createResourceCard(resource) {
        let iconClass = 'fa-solid fa-file-lines';
        if (resource.type === 'video') iconClass = 'fa-solid fa-video';
        if (resource.type === 'audio') iconClass = 'fa-solid fa-headphones';

        const card = createElement('a', {
            className: 'resource-card',
            children: [
                createElement('div', {
                    className: 'resource-card-header',
                    children: [
                        createElement('i', { className: `${iconClass} resource-card-icon` }),
                        createElement('h3', { className: 'resource-card-title', textContent: resource.title })
                    ]
                }),
                createElement('div', {
                    className: 'resource-card-body',
                    children: [
                        createElement('p', { className: 'resource-card-description', textContent: resource.description })
                    ]
                }),
                resource.tags.length > 0 ? createElement('div', {
                    className: 'resource-card-footer',
                    children: resource.tags.map(tag => 
                        createElement('span', { className: 'resource-tag', textContent: tag }) // SAFE
                    )
                }) : null
            ]
        });

        card.href = resource.url;
        card.target = '_blank';
        card.rel = 'noopener noreferrer';
        
        return card;
    }

    // --- Booking Flow ---

    function showBookingStep(step) {
        [bookingStep1, bookingStep2, bookingStep3].forEach(el => el.classList.add('hidden'));
        if (step === 1) bookingStep1.classList.remove('hidden');
        if (step === 2) bookingStep2.classList.remove('hidden');
        if (step === 3) bookingStep3.classList.remove('hidden');
    }

    function resetBookingState() {
        bookingState = { counselor: null, date: null, startTime: null };
    }

    async function openBookingModal() {
        resetBookingState();
        bookingModal.classList.remove('hidden');
        dropdownMenu.classList.remove('active');
        
        try {
            const serverDateResponse = await fetch('/api/users/server-date');
            if (!serverDateResponse.ok) throw new Error('Could not sync server time.');
            
            const serverDateResult = await serverDateResponse.json();
            // Store the server's UTC date string in our booking state.
            bookingState.serverToday = serverDateResult.data.today; 

            showBookingStep(1);
            renderCounselorSelectionStep();

        } catch (error) {
            showNotification(error.message, 'error');
            bookingModal.classList.add('hidden');
        }
    }

    async function renderCounselorSelectionStep() {
        counselorSelectionContainer.innerHTML = '<p>Loading counselors...</p>';
        try {
            const response = await fetch('/api/booking/counselors');
            const result = await response.json();
            if (!result.success) throw new Error('Failed to load counselors');
            
            counselorSelectionContainer.innerHTML = '';
            result.data.forEach(counselor => {
                const card = document.createElement('div');
                card.className = 'counselor-card';
                card.innerHTML = `
                    <h3>${counselor.user.username}</h3>
                    <p class="specialty">${counselor.specialty}</p>
                    <p class="bio">${counselor.bio || ''}</p>
                    <button class="btn primary-btn">Select</button>
                `;
                card.querySelector('button').onclick = () => {
                    bookingState.counselor = counselor;
                    renderSlotSelectionStep();
                };
                counselorSelectionContainer.appendChild(card);
            });
        } catch (error) {
            counselorSelectionContainer.innerHTML = `<p class="error-text">Could not load counselors.</p>`;
        }
    }

    function renderSlotSelectionStep() {
        selectedCounselorName.textContent = bookingState.counselor.user.username;
        
        // Create our date from the server's UTC date string we fetched earlier.
        const serverToday = new Date(bookingState.serverToday); 
        
        // Calculate "tomorrow" based on the server's date
        const tomorrow = new Date(serverToday.getTime()); // Clone the server date
        tomorrow.setUTCDate(tomorrow.getUTCDate() + 1); // Advance it by one UTC day

        // Extract YYYY-MM-DD parts from the server's "tomorrow" date
        const yyyy = tomorrow.getUTCFullYear();
        const mm = String(tomorrow.getUTCMonth() + 1).padStart(2, '0');
        const dd = String(tomorrow.getUTCDate()).padStart(2, '0');
        
        const tomorrowString = `${yyyy}-${mm}-${dd}`;
        
        slotDatePicker.value = tomorrowString;
        slotDatePicker.min = tomorrowString;
        bookingState.date = tomorrowString;
        
        fetchAndRenderSlots();
        showBookingStep(2);
    }

    async function fetchAndRenderSlots() {
        slotSelectionContainer.innerHTML = '<p>Loading slots...</p>';
        if (!bookingState.counselor || !bookingState.date) return;
        try {
            const response = await fetch(`/api/booking/slots/${bookingState.counselor._id}?date=${bookingState.date}`);
            const result = await response.json();
            if (!result.success) throw new Error('Failed to load slots');

            if (result.data.length === 0) {
                slotSelectionContainer.innerHTML = '<p>No available slots on this date.</p>';
                return;
            }

            slotSelectionContainer.innerHTML = '';
            result.data.forEach(slotTime => {
                const slot = new Date(slotTime);
                const button = document.createElement('button');
                button.className = 'slot-btn';
                button.textContent = slot.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
                button.onclick = () => {
                    bookingState.startTime = slot;
                    renderConfirmationStep();
                };
                slotSelectionContainer.appendChild(button);
            });
        } catch (error) {
            slotSelectionContainer.innerHTML = '<p class="error-text">Could not load slots.</p>';
        }
    }

    function renderConfirmationStep() {
        const { counselor, date, startTime } = bookingState;
        bookingConfirmationDetails.innerHTML = `
            <p>You are booking an appointment with:</p>
            <p><strong>${counselor.user.username}</strong></p>
            <p>On: <strong>${new Date(date).toDateString()}</strong></p>
            <p>At: <strong>${startTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</strong></p>
        `;
        showBookingStep(3);
    }

    async function handleBookingConfirmation() {
        // Disable button immediately to prevent double-clicks
        confirmBookingBtn.disabled = true;
        confirmBookingBtn.textContent = 'Booking...';
        try {
            const response = await fetch('/api/booking/appointments', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${getToken()}` },
                body: JSON.stringify({
                    counselorId: bookingState.counselor._id,
                    startTime: bookingState.startTime.toISOString()
                })
            });
            const result = await response.json();
            if (!result.success) throw new Error(result.error);
            
            bookingModal.classList.add('hidden');
            showNotification('Appointment booked successfully!', 'success');
        } catch (error) {
            showNotification(error.message, 'error');
        } finally {
            // Always re-enable the button and restore text, even if an error occurred
            confirmBookingBtn.disabled = false;
            confirmBookingBtn.textContent = 'Confirm Booking';
        }
    }

    // --- My Appointments ---

    async function openMyAppointmentsModal() {
        // Get references to the new containers
        const upcomingContainer = document.getElementById('upcomingAppointmentsContainer');
        const pastContainer = document.getElementById('pastAppointmentsContainer');
        
        upcomingContainer.innerHTML = '<p>Loading your appointments...</p>';
        pastContainer.innerHTML = ''; // Clear the past container initially
        myAppointmentsModal.classList.remove('hidden');
        dropdownMenu.classList.remove('active');

        try {
            const response = await fetch('/api/booking/my-appointments', {
                headers: { 'Authorization': `Bearer ${getToken()}` }
            });
            const result = await response.json();
            if (!result.success) throw new Error('Failed to load appointments');
            
            if (result.data.length === 0) {
                upcomingContainer.innerHTML = '<p>You have no upcoming appointments.</p>';
                pastContainer.innerHTML = '<p>You have no past appointments.</p>';
                return;
            }

            const now = new Date();
            const allAppointments = result.data;

            // Partition the appointments into two lists: upcoming and past.
            const upcomingAppointments = allAppointments.filter(apt => new Date(apt.endTime) > now);
            const pastAppointments = allAppointments.filter(apt => new Date(apt.endTime) <= now);
            
            // Render the upcoming appointments
            if (upcomingAppointments.length > 0) {
                upcomingContainer.innerHTML = '';
                upcomingAppointments.forEach(apt => {
                    const item = createAppointmentItem(apt, true); // isUpcoming = true
                    upcomingContainer.appendChild(item);
                });
            } else {
                upcomingContainer.innerHTML = '<p>You have no upcoming appointments.</p>';
            }
            
            // Render the past appointments
            if (pastAppointments.length > 0) {
                pastContainer.innerHTML = '';
                // Sort past appointments to show the most recent first
                pastAppointments.sort((a, b) => new Date(b.startTime) - new Date(a.startTime));
                pastAppointments.forEach(apt => {
                    const item = createAppointmentItem(apt, false); // isUpcoming = false
                    pastContainer.appendChild(item);
                });
            } else {
                pastContainer.innerHTML = '<p>You have no past appointments.</p>';
            }

        } catch(error) {
            upcomingContainer.innerHTML = `<p class="error-text">Could not load appointments.</p>`;
            pastContainer.innerHTML = '';
        }
    }
    
    /**
     * Helper function to create the HTML for a single appointment item.
     * @param {object} apt - The appointment object.
     * @param {boolean} isUpcoming - Determines if action buttons should be shown.
     * @returns {HTMLElement} The created div element for the appointment.
     */
    function createAppointmentItem(apt, isUpcoming) {
        const startTime = new Date(apt.startTime);
        const endTime = new Date(apt.endTime);
        const now = new Date();

        const canJoin = isUpcoming && apt.status === 'confirmed' && now >= startTime && now <= endTime;
        const canCancel = isUpcoming && apt.status === 'booked' || apt.status === 'confirmed'; // Allow canceling confirmed appointments

        const actionsChildren = []; // Start with an empty actions list

        if (canCancel) {
            actionsChildren.push(createElement('button', {
                className: 'btn danger-btn small-btn',
                textContent: 'Cancel',
                dataset: { id: apt._id },
                onclick: (e) => cancelMyAppointment(e.currentTarget.dataset.id)
            }));
        }

        if (isUpcoming) {
            const joinBtn = createElement('button', {
                className: 'btn primary-btn small-btn',
                textContent: 'Join Live Chat',
                dataset: { id: apt._id },
                onclick: () => joinLiveChat(apt._id, apt.counselor.user.username)
            });
            if (!canJoin) joinBtn.disabled = true; // Disable if not joinable
            actionsChildren.push(joinBtn);
        }
        
        // Create the main appointment item element using our secure helpers
        const item = createElement('div', {
            className: 'appointment-item',
            children: [
                createElement('p', {
                    children: [
                        document.createTextNode('With: '),
                        createElement('strong', { textContent: apt.counselor.user.username })
                    ]
                }),
                createElement('p', {
                    children: [
                        document.createTextNode('On: '),
                        createElement('strong', { textContent: startTime.toLocaleString() })
                    ]
                }),
                createElement('p', {
                    children: [
                        document.createTextNode('Status: '),
                        createElement('span', {
                            className: `status-badge status-${apt.status}`,
                            textContent: apt.status.replace(/_/g, ' ')
                        })
                    ]
                }),
                createElement('div', {
                    className: 'appointment-item-actions',
                    children: actionsChildren
                })
            ]
        });
        
        return item;
    }

    async function cancelMyAppointment(appointmentId) {
        if (!confirm('Are you sure you want to cancel this appointment?')) return;
        try {
            const response = await fetch(`/api/booking/appointments/${appointmentId}/cancel`, {
                method: 'PUT',
                headers: { 'Authorization': `Bearer ${getToken()}` }
            });
            const result = await response.json();
            if (!result.success) throw new Error(result.error);
            showNotification('Appointment cancelled.', 'success');
            await openMyAppointmentsModal(); // Refresh the list
        } catch (error) {
            showNotification(error.message, 'error');
        }
    }

    // --- Forum Flow ---

    function showForumView(viewName) {
        [forumListView, forumDetailView, forumCreateView].forEach(view => view.classList.add('hidden'));
        if (viewName === 'list') forumListView.classList.remove('hidden');
        if (viewName === 'detail') forumDetailView.classList.remove('hidden');
        if (viewName === 'create') forumCreateView.classList.remove('hidden');
    }

    async function openForumModal() {
        forumModal.classList.remove('hidden');
        dropdownMenu.classList.remove('active');
        showForumView('list');
        forumPostsContainer.innerHTML = '<p>Loading posts...</p>';
        try {
            const response = await fetch('/api/forum/posts');
            const result = await response.json();
            if (!result.success) throw new Error(result.error);
            renderPostList(result.data);
        } catch (error) {
            forumPostsContainer.innerHTML = `<p class="error-text">Could not load posts.</p>`;
        }
    }

    function renderPostList(posts) {
        // Clear the container safely
        forumPostsContainer.innerHTML = ''; 

        if (posts.length === 0) {
            forumPostsContainer.appendChild(createElement('p', { 
                textContent: 'No posts yet. Be the first to start a conversation!' 
            }));
            return;
        }

        // Loop through each post and create elements programmatically
        posts.forEach(post => {
            const postCard = createElement('div', {
                className: 'post-item',
                onclick: () => viewPostDetail(post._id),
                children: [
                    // Any malicious HTML in post.title will be rendered as plain text.
                    createElement('h4', { textContent: post.title }),
                    createElement('p', {
                        children: [
                            document.createTextNode('By '),
                            // Usernames are also safely rendered as text.
                            createElement('strong', { textContent: post.user.username }),
                            document.createTextNode(` on ${new Date(post.createdAt).toLocaleDateString()}`)
                        ]
                    })
                ]
            });
            forumPostsContainer.appendChild(postCard);
        });
    }

    window.viewPostDetail = async function(postId) {
        showForumView('detail');
        singlePostContainer.innerHTML = '<p>Loading post...</p>'; // Clear with a loading message
        commentsContainer.innerHTML = '';
        document.getElementById('commentPostId').value = postId;

        try {
            const response = await fetch(`/api/forum/posts/${postId}`);
            const result = await response.json();
            if (!result.success) throw new Error(result.error);

            const { post, comments } = result.data;
            
            // 1. Clear the container
            singlePostContainer.innerHTML = ''; 

            // 2. Build Post Actions safely
            const actionsContainer = document.createElement('div');
            actionsContainer.className = 'post-actions';
            actionsContainer.style.display = 'flex';
            actionsContainer.style.alignItems = 'center';
            actionsContainer.style.gap = '0.5rem';
            actionsContainer.innerHTML = `
                <button class="btn-report" onclick="reportPost('${post._id}')">
                    <i class="fa-solid fa-flag"></i> Report
                </button>
            `;

            if (currentUser && currentUser._id === post.user._id) {
                actionsContainer.innerHTML += `
                    <button class="btn danger-btn small-btn" onclick="handleDeleteMyPost('${post._id}')" style="margin-left: 1rem;">
                        Delete Post
                    </button>
                `;
            }

            // 3. Build the rest of the post content securely
            singlePostContainer.appendChild(
                createElement('div', {
                    className: 'post-header',
                    children: [
                        createElement('h3', { textContent: post.title }),
                        actionsContainer
                    ]
                })
            );
            
            singlePostContainer.appendChild(
                createElement('p', {
                    className: 'post-meta',
                    children: [
                        document.createTextNode('By '),
                        createElement('strong', { textContent: post.user.username }),
                        document.createTextNode(` on ${new Date(post.createdAt).toLocaleString()}`)
                    ]
                })
            );

            // For the post content, we create a div and set its textContent.
            // We also add a style to respect newlines
            const postContentDiv = createElement('div', {
                className: 'post-content',
                textContent: post.content 
            });
            postContentDiv.style.whiteSpace = 'pre-wrap'; // This makes \n render as line breaks
            singlePostContainer.appendChild(postContentDiv);

            if (comments.length > 0) {
                commentsContainer.innerHTML = ''; // Clear container
                commentsContainer.appendChild(createElement('h3', { textContent: 'Comments' }));

                comments.forEach(comment => {
                    // Build comment actions HTML
                    const commentActions = document.createElement('div');
                    commentActions.className = 'comment-actions';
                    commentActions.style.display = 'flex';
                    commentActions.style.alignItems = 'center';
                    commentActions.style.gap = '0.5rem';
                    commentActions.innerHTML = `
                        <button class="btn-report" onclick="reportComment('${comment._id}', '${postId}')">
                            <i class="fa-solid fa-flag"></i> Report
                        </button>
                    `;
                    if (currentUser && currentUser._id === comment.user._id) {
                        commentActions.innerHTML += `
                            <button class="btn danger-btn small-btn" onclick="handleDeleteMyComment('${comment._id}', '${postId}')" style="margin-left: 0.5rem;">
                                Delete
                            </button>
                        `;
                    }

                    // Create the comment item securely
                    const commentItem = createElement('div', {
                        className: 'comment-item',
                        children: [
                            createElement('p', { 
                                textContent: comment.content,
                                children: null 
                            }),
                            createElement('div', {
                                className: 'comment-footer',
                                children: [
                                    createElement('p', {
                                        className: 'comment-meta',
                                        children: [
                                            document.createTextNode('By '),
                                            createElement('strong', { textContent: comment.user.username }),
                                            document.createTextNode(` on ${new Date(comment.createdAt).toLocaleString()}`)
                                        ]
                                    }),
                                    commentActions
                                ]
                            })
                        ]
                    });
                    // Apply the pre-wrap style to the comment content <p> tag
                    commentItem.querySelector('p').style.whiteSpace = 'pre-wrap';
                    commentsContainer.appendChild(commentItem);
                });
            } else {
                commentsContainer.innerHTML = '<h3>No comments yet.</h3>';
            }
        } catch (error) {
            singlePostContainer.innerHTML = `<p class="error-text">Could not load post details.</p>`;
        }
    }

    async function handleCreatePost(e) {
        e.preventDefault();
        const title = document.getElementById('postTitle').value;
        const content = document.getElementById('postContent').value;
        const isAnonymous = document.getElementById('postIsAnonymous').checked;

        const submitBtn = createPostForm.querySelector('button[type="submit"]');
        submitBtn.disabled = true;
        submitBtn.textContent = 'Posting...';
        try {
            const response = await fetch('/api/forum/posts', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${getToken()}` },
                body: JSON.stringify({ title, content, isAnonymous })
            });
            const result = await response.json();
            if (!result.success) throw new Error(result.error);
            
            showNotification('Post created successfully!', 'success');
            createPostForm.reset();
            await openForumModal(); // Go back to the list view and refresh
        } catch (error) {
            showNotification(error.message, 'error');
        } finally {
            submitBtn.disabled = false;
            submitBtn.textContent = 'Create Post';
        }
    }

    async function handleAddComment(e) {
        e.preventDefault();
        const postId = document.getElementById('commentPostId').value;
        const content = document.getElementById('commentContent').value;
        const isAnonymous = document.getElementById('commentIsAnonymous').checked;

        const submitBtn = commentForm.querySelector('button[type="submit"]');
        submitBtn.disabled = true;
        submitBtn.textContent = 'Submitting...';
        try {
            const response = await fetch(`/api/forum/posts/${postId}/comments`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${getToken()}` },
                body: JSON.stringify({ content, isAnonymous })
            });
            const result = await response.json();
            if (!result.success) throw new Error(result.error);
            
            showNotification('Comment added!', 'success');
            commentForm.reset();
            await viewPostDetail(postId); // Refresh the detail view
        } catch (error) {
            showNotification(error.message, 'error');
        } finally {
            submitBtn.disabled = false;
            submitBtn.textContent = 'Submit Comment';
        }
    }

    window.handleDeleteMyPost = async function(postId) {
        // Ask for confirmation before deleting.
        if (!confirm('Are you sure you want to permanently delete this post and all its comments?')) {
            return;
        }

        try {
            const response = await fetch(`/api/forum/posts/${postId}`, {
                method: 'DELETE',
                headers: { 'Authorization': `Bearer ${getToken()}` }
            });

            const result = await response.json();
            if (!result.success) {
                throw new Error(result.error);
            }

            showNotification('Post deleted successfully', 'success');
            await openForumModal(); // Refresh the forum list view

        } catch (error) {
            showNotification(error.message, 'error');
        }
    }

    window.handleDeleteMyComment = async function(commentId, postId) {
        if (!confirm('Are you sure you want to delete this comment?')) return;

        try {
            const response = await fetch(`/api/forum/comments/${commentId}`, {
                method: 'DELETE',
                headers: { 'Authorization': `Bearer ${getToken()}` }
            });
            const result = await response.json();
            if (!result.success) throw new Error(result.error);
            
            showNotification('Comment deleted', 'success');
            await viewPostDetail(postId); // Refresh the post to show the comment is gone.
        } catch (error) {
            showNotification(error.message, 'error');
        }
    }

    // --- FUNCTION TO REPORT A POST ---
    window.reportPost = async function(postId) {
        if (!confirm('Are you sure you want to report this post to the moderators?')) return;

        try {
            const response = await fetch(`/api/forum/posts/${postId}/report`, {
                method: 'POST',
                headers: { 'Authorization': `Bearer ${getToken()}` }
            });
            const result = await response.json();
            if (!result.success) throw new Error(result.error);

            showNotification('Post reported. A moderator will review it shortly.', 'success');
            // Disable the button to prevent re-reporting
            event.target.disabled = true;
            event.target.textContent = 'Reported';
        } catch (error) {
            showNotification(error.message, 'error');
        }
    }

    // --- FUNCTION TO REPORT A COMMENT ---
    window.reportComment = async function(commentId, postId) {
        if (!confirm('Are you sure you want to report this comment to the moderators?')) return;

        try {
            const response = await fetch(`/api/forum/comments/${commentId}/report`, {
                method: 'POST',
                headers: { 'Authorization': `Bearer ${getToken()}` }
            });
            const result = await response.json();
            if (!result.success) throw new Error(result.error);

            showNotification('Comment reported. A moderator will review it shortly.', 'success');
            // Disable the button to prevent re-reporting
            event.target.disabled = true;
            event.target.textContent = 'Reported';
        } catch (error) {
            showNotification(error.message, 'error');
        }
    }

    // --- Journal & Mood Tracking ---

    async function openJournalModal() {
        journalModal.classList.remove('hidden');
        journalForm.classList.add('hidden'); // Hide form by default
        journalTodayMessage.textContent = 'Loading...'; // Show loading state
        journalTodayMessage.classList.remove('hidden');
        
        try {
            const token = getToken();
            // First, get the official date from the server
            const serverDateResponse = await fetch('/api/users/server-date');
            const serverDateResult = await serverDateResponse.json();
            const serverToday = new Date(serverDateResult.data.today).getTime();
            // Then, get the user's journal entries
            const entriesResponse = await fetch('/api/journal', {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            const entriesResult = await entriesResponse.json();
            if (!entriesResult.success) throw new Error(entriesResult.error);
            
            journalState.entries = entriesResult.data;
            
            // Check for today's entry using the SERVER's date
            const hasTodaysEntry = journalState.entries.some(entry => {
                const entryDate = new Date(entry.entryDate);
                entryDate.setHours(0, 0, 0, 0);
                return entryDate.getTime() === serverToday;
            });

            if (hasTodaysEntry) {
                journalForm.classList.add('hidden');
                journalTodayMessage.textContent = "You've already saved your entry for today. Great job on staying consistent! Come back tomorrow to add a new one.";
                journalTodayMessage.classList.remove('hidden');
            } else {
                journalForm.classList.remove('hidden');
                journalTodayMessage.classList.add('hidden');
                journalForm.reset();
                document.querySelectorAll('.mood-option').forEach(opt => opt.classList.remove('selected'));
            }

            renderMoodCalendar();

        } catch (error) {
            showNotification(error.message, 'error');
        }
    }

    async function handleJournalSubmit(e) {
        e.preventDefault();
        const mood = selectedMoodInput.value;
        const content = journalContent.value;
        
        if (!mood) {
            return showNotification('Please select a mood.', 'error');
        }

        const submitBtn = journalForm.querySelector('button[type="submit"]');
        submitBtn.disabled = true;
        submitBtn.textContent = 'Saving...';

        try {
            const token = getToken();
            const response = await fetch('/api/journal', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
                // The server determines the date, so we no longer send it from the client.
                body: JSON.stringify({ mood, content })
            });
            const result = await response.json();
            if (!result.success) throw new Error(result.error);

            const { streak, unlockedAchievements } = result.data.user; // Assuming backend returns user data
            if (unlockedAchievements && unlockedAchievements.length > 0) {
                const latestAchievement = unlockedAchievements[unlockedAchievements.length - 1];
                showNotification(`Achievement Unlocked: ${latestAchievement}!`, 'success');
            } else {
                showNotification(`Journal entry saved! Your streak is now ${streak} days!`, 'success');
            }
            updateStreakIndicator({ journalStreak: streak });
            await openJournalModal(); // Refresh the modal

        } catch (error) {
            showNotification(error.message, 'error');
        } finally {
            submitBtn.disabled = false;
            submitBtn.textContent = "Save Today's Entry";
        }
    }

    /**
     * Shows the journal's "view mode" for a specific past entry.
     * @param {object} entry - The full journal entry object.
     */
    function showJournalViewMode(entry) {
        journalForm.classList.add('hidden');
        journalTodayMessage.classList.add('hidden');
        journalViewMode.classList.remove('hidden');

        journalViewDate.textContent = new Date(entry.entryDate).toLocaleDateString();
        journalViewContent.textContent = entry.content; // Content is already decrypted from the API
        
        // Set up the delete button to call the handler with the correct ID.
        deleteJournalEntryBtn.onclick = () => handleDeleteMyJournalEntry(entry._id);
    }

    /**
     * Handles the deletion of a specific journal entry.
     * @param {string} entryId - The ID of the journal entry to delete.
     */
    async function handleDeleteMyJournalEntry(entryId) {
        if (!confirm('Are you sure you want to permanently delete this journal entry?')) return;
        
        try {
            const response = await fetch(`/api/journal/${entryId}`, {
                method: 'DELETE',
                headers: { 'Authorization': `Bearer ${getToken()}` }
            });
            const result = await response.json();
            if (!result.success) throw new Error(result.error);
            
            showNotification('Journal entry deleted.', 'success');
            await openJournalModal(); // Refresh the entire journal view.
        } catch (error) {
            showNotification(error.message, 'error');
        }
    }

    function updateStreakIndicator(user) {
        if (user && user.journalStreak > 0) {
            streakIndicator.style.display = 'flex';
            streakIndicator.querySelector('.streak-count').textContent = `🔥 ${user.journalStreak}`;
        } else {
            streakIndicator.style.display = 'none';
        }
    }

    function changeMonth(direction) {
        journalState.currentDate.setMonth(journalState.currentDate.getMonth() + direction);
        renderMoodCalendar();
    }

    function renderMoodCalendar() {
        const date = journalState.currentDate;
        const year = date.getFullYear();
        const month = date.getMonth();

        currentMonthYear.textContent = date.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
        
        const firstDay = new Date(year, month, 1).getDay(); // 0=Sun, 1=Mon...
        const daysInMonth = new Date(year, month + 1, 0).getDate();
        
        moodCalendar.innerHTML = '';
        
        // Add day headers (S, M, T, W, T, F, S)
        const daysOfWeek = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];
        daysOfWeek.forEach(day => {
            const dayEl = document.createElement('div');
            dayEl.className = 'calendar-day-header';
            dayEl.textContent = day;
            moodCalendar.appendChild(dayEl);
        });

        // Create a Map for efficient lookups of moods by date.
        const entriesMap = new Map(journalState.entries.map(entry => {
            const entryDate = new Date(entry.entryDate).toISOString().split('T')[0];
            return [entryDate, entry];
        }));

        // Add empty cells for the days before the 1st of the month.
        for (let i = 0; i < firstDay; i++) {
            moodCalendar.appendChild(document.createElement('div'));
        }

        // Add a cell for each day of the month.
        for (let i = 1; i <= daysInMonth; i++) {
            const dayEl = document.createElement('div');
            dayEl.className = 'calendar-day';
            dayEl.textContent = i;
            
            const currentDateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(i).padStart(2, '0')}`;
            if (entriesMap.has(currentDateStr)) {
                const entry = entriesMap.get(currentDateStr);
                dayEl.classList.add(`mood-${entry.mood}`);
                dayEl.style.cursor = 'pointer'; // Make it look clickable
                // Store the full entry object as a JSON string in a data attribute.
                dayEl.dataset.entry = JSON.stringify(entry);
            }
            moodCalendar.appendChild(dayEl);
        }
    }

    // --- Guided Exercises ---

    function showExerciseView(viewName) {
        exerciseListView.classList.toggle('hidden', viewName !== 'list');
        exerciseSessionView.classList.toggle('hidden', viewName !== 'session');
    }

    async function openExerciseModal() {
        exerciseModal.classList.remove('hidden');
        showExerciseView('list');
        exerciseListContainer.innerHTML = '<p>Loading exercises...</p>';
        try {
            const response = await fetch('/api/exercises', {
                headers: { 'Authorization': `Bearer ${getToken()}` }
            });
            const result = await response.json();
            if (!result.success) throw new Error(result.error);
            renderExerciseList(result.data);
        } catch (error) {
            exerciseListContainer.innerHTML = `<p class="error-text">Could not load exercises.</p>`;
        }
    }

    function renderExerciseList(exercises) {
        if (exercises.length === 0) {
            exerciseListContainer.innerHTML = '<p>No exercises available yet. Please check back later.</p>';
            return;
        }
        exerciseListContainer.innerHTML = exercises.map(ex => `
            <div class="exercise-card" onclick="startExercise('${ex._id}', '${ex.title}')">
                <h4>${ex.title}</h4>
                <p>${ex.description}</p>
                <span class="category-tag">${ex.category}</span>
            </div>
        `).join('');
    }

    window.startExercise = async function(exerciseId, title) {
        showExerciseView('session');
        exerciseMessages.innerHTML = '';
        exerciseResponseForm.classList.remove('hidden');
        exerciseCompleteMessage.classList.add('hidden');
        exerciseResponseInput.value = '';
        exerciseResponseInput.focus();

        exerciseState = { activeExerciseId: exerciseId, currentStep: 0, isComplete: false };
        exerciseSessionTitle.textContent = title;
        addExerciseMessage('Starting session...', 'system');

        try {
            // This first call gets the very first step of the exercise.
            const response = await fetch('/api/exercises/start', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${getToken()}` },
                body: JSON.stringify({ exerciseId: exerciseState.activeExerciseId })
            });
            const result = await response.json();
            if (!result.success) throw new Error(result.error);
            
            exerciseState.currentStep = result.data.nextStep;
            addExerciseMessage(result.data.nextPrompt, 'bot');
        } catch (error) {
            addExerciseMessage('Sorry, I couldn\'t start the exercise. Please try again.', 'bot', 'error');
        }
    }

    async function handleExerciseResponse(e) {
        e.preventDefault();
        if (exerciseState.isComplete) return;

        const userResponse = exerciseResponseInput.value.trim();
        if (!userResponse) return;
        
        addExerciseMessage(userResponse, 'user');
        exerciseResponseInput.value = '';
        exerciseResponseInput.disabled = true;
        addExerciseMessage('<span class="loading-indicator"></span>', 'bot');

        try {
            // Subsequent calls include the user's response and current step.
            const response = await fetch('/api/exercises/start', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${getToken()}` },
                body: JSON.stringify({
                    exerciseId: exerciseState.activeExerciseId,
                    currentStep: exerciseState.currentStep,
                    userResponse: userResponse
                })
            });
            const result = await response.json();
            if (!result.success) throw new Error(result.error);
            
            exerciseMessages.removeChild(exerciseMessages.lastChild); // Remove loading indicator

            addExerciseMessage(result.data.nextPrompt, 'bot');
            exerciseState.currentStep = result.data.nextStep;
            exerciseState.isComplete = result.data.isComplete;

            if (exerciseState.isComplete) {
                // Hide the input form when the exercise is finished.
                exerciseResponseForm.classList.add('hidden');
                exerciseCompleteMessage.classList.remove('hidden');
            }

        } catch (error) {
            exerciseMessages.removeChild(exerciseMessages.lastChild);
            addExerciseMessage('There was an error processing your response. Please try again.', 'bot', 'error');
        } finally {
            exerciseResponseInput.disabled = false;
            exerciseResponseInput.focus();
        }
    }

    function addExerciseMessage(text, sender, type = '') {
        const messageDiv = document.createElement('div');
        messageDiv.className = `exercise-message ${sender}-message ${type}`;
        messageDiv.innerHTML = `<p>${text}</p>`;
        exerciseMessages.appendChild(messageDiv);
        exerciseMessages.scrollTop = exerciseMessages.scrollHeight;
    }

    // --- Personal Analytics Dashboard ---

    async function openProgressModal() {
        progressModal.classList.remove('hidden');
        dropdownMenu.classList.remove('active');
        
        try {
            const token = getToken();
            const response = await fetch('/api/journal/stats', {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            const result = await response.json();
            if (!result.success) throw new Error(result.error);
            
            renderAnalyticsCharts(result.data);

        } catch (error) {
            showNotification(error.message, 'error');
            document.getElementById('progress-container').innerHTML = `<p class="error-text">Could not load your progress data.</p>`;
        }
    }
    
    // We need to store chart instances so we can destroy them before re-rendering.
    let moodTrendChart, moodDistributionChart, sentimentDistributionChart;

    function renderAnalyticsCharts(stats) {
        // This is crucial to prevent Chart.js from drawing new charts over old ones.
        if (moodTrendChart) moodTrendChart.destroy();
        if (moodDistributionChart) moodDistributionChart.destroy();
        if (sentimentDistributionChart) sentimentDistributionChart.destroy();

        // 1. Mood Trend Chart (Line)
        const trendCtx = document.getElementById('moodTrendChart').getContext('2d');
        moodTrendChart = new Chart(trendCtx, {
            type: 'line',
            data: {
                labels: stats.moodTrend.map(d => d.date),
                datasets: [{
                    label: 'Mood Score (1=Awful, 5=Great)',
                    data: stats.moodTrend.map(d => d.moodValue),
                    borderColor: 'rgba(99, 102, 241, 1)',
                    backgroundColor: 'rgba(99, 102, 241, 0.2)',
                    fill: true,
                    tension: 0.3
                }]
            },
            options: { responsive: true }
        });

        // 2. Mood Distribution Chart (Doughnut)
        const moodCtx = document.getElementById('moodDistributionChart').getContext('2d');
        moodDistributionChart = new Chart(moodCtx, {
            type: 'doughnut',
            data: {
                labels: stats.moodDistribution.map(d => d.mood),
                datasets: [{
                    label: 'Moods',
                    data: stats.moodDistribution.map(d => d.count),
                    backgroundColor: ['#EF4444', '#F59E0B', '#6B7280', '#10B981', '#6366F1'],
                }]
            },
            options: { responsive: true }
        });

        // 3. Sentiment Distribution Chart (Pie)
        const sentimentCtx = document.getElementById('sentimentDistributionChart').getContext('2d');
        sentimentDistributionChart = new Chart(sentimentCtx, {
            type: 'pie',
            data: {
                labels: stats.sentimentDistribution.map(d => d.sentiment),
                datasets: [{
                    label: 'Sentiments',
                    data: stats.sentimentDistribution.map(d => d.count),
                    backgroundColor: ['#FBBF24', '#F87171', '#9CA3AF', '#F97316', '#DC2626'],
                }]
            },
            options: { responsive: true }
        });
    }

    // --- Voice Accessibility ---
    
    // Use the browser's built-in Web Speech API.
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    let recognition;

    if (SpeechRecognition) {
        recognition = new SpeechRecognition();
        recognition.continuous = false; // We only want to capture one phrase at a time.
        recognition.lang = 'en-IN'; // Default to Indian English, can be changed.
        recognition.interimResults = false;
        recognition.maxAlternatives = 1;

        recognition.onresult = (event) => {
            const transcript = event.results[0][0].transcript;
            messageInput.value = transcript;
            micBtn.classList.remove('active');
            micBtn.title = 'Speak Message';
        };

        recognition.onerror = (event) => {
            showNotification(`Speech recognition error: ${event.error}`, 'error');
            micBtn.classList.remove('active');
            micBtn.title = 'Speak Message';
        };
        
        recognition.onstart = () => {
            micBtn.classList.add('active');
            micBtn.title = 'Listening...';
        };

        recognition.onend = () => {
            micBtn.classList.remove('active');
            micBtn.title = 'Speak Message';
        };
    }

    function handleVoiceInput() {
        if (!SpeechRecognition) {
            return showNotification('Sorry, your browser does not support voice recognition.', 'error');
        }
        try {
            // Match the speech recognition language to the selected app language.
            const selectedLang = languageSelector.value || 'en';
            recognition.lang = `${selectedLang}-IN`; 

            recognition.start();
        } catch (error) {
            console.error("Could not start recognition:", error);
            micBtn.classList.remove('active');
        }
    }

    function toggleTextToSpeech() {
        isTextToSpeechEnabled = !isTextToSpeechEnabled;
        ttsBtn.classList.toggle('active', isTextToSpeechEnabled);
        if (isTextToSpeechEnabled) {
            ttsBtn.innerHTML = '<i class="fa-solid fa-volume-high"></i>';
            ttsBtn.title = 'Disable reading responses';
            showNotification('Text-to-speech enabled.', 'success');
        } else {
            ttsBtn.innerHTML = '<i class="fa-solid fa-volume-off"></i>';
            ttsBtn.title = 'Read responses aloud';
            window.speechSynthesis.cancel(); // Stop any speech that's currently playing.
        }
    }

    function speakText(text) {
        if (!('speechSynthesis' in window)) {
            isTextToSpeechEnabled = false; // Disable if the browser doesn't support it.
            return showNotification('Sorry, your browser does not support text-to-speech.', 'error');
        }
        const utterance = new SpeechSynthesisUtterance(text);
        const selectedLang = languageSelector.value || 'en';
        utterance.lang = `${selectedLang}-IN`; // Try to match the voice to the language.
        utterance.rate = 1.0;
        window.speechSynthesis.speak(utterance);
    }

    // --- Live Chat (Socket.IO) ---

    function joinLiveChat(appointmentId, counselorName) {
        liveChatModal.classList.remove('hidden');
        myAppointmentsModal.classList.add('hidden');
        liveChatMessages.innerHTML = '<p class="system-message">Connecting to live session...</p>';
        liveChatHeader.textContent = `Live Session with ${counselorName}`;
        
        // Store the appointmentId so we know which "room" to send messages to.
        liveChatState.appointmentId = appointmentId;

        // Establish the WebSocket connection, passing our JWT for server-side authentication.
        socket = io({ auth: { token: getToken() } });

        // Set up listeners for different socket events.
        socket.on('connect', () => {
            console.log('Connected to real-time server!');
            // Tell the server which appointment's chat room we want to join.
            socket.emit('joinSession', { appointmentId: liveChatState.appointmentId });
            liveChatMessages.innerHTML = '<p class="system-message">You have joined the session. Please wait for your counselor.</p>';
        });

        socket.on('loadHistory', (history) => {
            liveChatMessages.innerHTML = ''; // Clear any "Connecting..." message
            if (history && history.length > 0) {
                history.forEach(msg => {
                    const isMe = msg.sender._id === currentUser._id;
                    const messageData = {
                        message: msg.message, // Message is already decrypted by the model's getter
                        senderUsername: msg.sender.username
                    };
                    addMessageToChat(messageData, isMe);
                });
            } else {
                 liveChatMessages.innerHTML = '<p class="system-message">You have joined the session. You can start the conversation.</p>';
            }
        });

        socket.on('receiveMessage', (data) => {
            const isMe = data.senderId === currentUser._id;
            const messageDiv = document.createElement('div');
            // We can reuse the same styles as the exercise chat for consistency.
            messageDiv.className = `exercise-message ${isMe ? 'user-message' : 'bot-message'}`;
            messageDiv.innerHTML = `<p>${data.message}</p>`;
            liveChatMessages.appendChild(messageDiv);
            liveChatMessages.scrollTop = liveChatMessages.scrollHeight;
        });

        socket.on('connect_error', (err) => {
            liveChatMessages.innerHTML = `<p class="error-text">Connection failed: ${err.message}. Please try again.</p>`;
        });

        socket.on('disconnect', () => {
            liveChatMessages.innerHTML += '<p class="system-message">You have been disconnected.</p>';
        });
    }

    function handleLiveChatMessageSend(e) {
        e.preventDefault();
        const message = liveChatMessageInput.value.trim();
        if (!message || !socket || !liveChatState.appointmentId) return;
        
        // Emit a 'sendMessage' event to the server with the necessary data.
        socket.emit('sendMessage', { 
            appointmentId: liveChatState.appointmentId, 
            message: message 
        });

        // Optimistically display the sent message in our own chat window immediately.
        const messageDiv = document.createElement('div');
        messageDiv.className = 'exercise-message user-message';
        messageDiv.innerHTML = `<p>${message}</p>`;
        liveChatMessages.appendChild(messageDiv);
        liveChatMessages.scrollTop = liveChatMessages.scrollHeight;

        liveChatMessageInput.value = '';
    }

    // --- SCREENING TEST FUNCTIONS ---
    /**
     * Helper to manage the three views within the screening modal.
     */
    function showScreeningView(viewName) {
        screeningListView.classList.toggle('hidden', viewName !== 'list');
        screeningTestView.classList.toggle('hidden', viewName !== 'test');
        screeningResultsView.classList.toggle('hidden', viewName !== 'results');
    }

    /**
     * Opens the modal and fetches the list of available tests.
     */
    async function openScreeningModal() {
        screeningModal.classList.remove('hidden');
        dropdownMenu.classList.remove('active');
        showScreeningView('list');
        await loadAvailableTests();
    }

    /**
     * Fetches the list of available tests from the new API endpoint.
     */
    async function loadAvailableTests() {
        screeningListContainer.innerHTML = '<p>Loading available tests...</p>';
        try {
            const response = await fetch('/api/screening', {
                headers: { 'Authorization': `Bearer ${getToken()}` }
            });
            const result = await response.json();
            if (!result.success) throw new Error(result.error);
            
            if (result.data.length === 0) {
                screeningListContainer.innerHTML = '<p>No screening tests are available at this time.</p>';
                return;
            }

            // Render the tests using the same style as the exercise cards
            screeningListContainer.innerHTML = result.data.map(test => `
                <div class="exercise-card" onclick="startScreeningTest('${test.testKey}')">
                    <h4>${test.fullName} (${test.testKey.toUpperCase()})</h4>
                    <p>${test.description}</p>
                    <span class="category-tag">Screening Tool</span>
                </div>
            `).join('');

        } catch (error) {
            screeningListContainer.innerHTML = `<p class="error-text">Could not load screening tests. ${error.message}</p>`;
        }
    }

    /**
     * Fetches the full data for one test (questions, options) and renders the form.
     */
    window.startScreeningTest = async function(testKey) {
        showScreeningView('test');
        screeningQuestionsContainer.innerHTML = '<p>Loading questionnaire...</p>';
        
        try {
            const response = await fetch(`/api/screening/${testKey}`, {
                headers: { 'Authorization': `Bearer ${getToken()}` }
            });
            const result = await response.json();
            if (!result.success) throw new Error(result.error);
            
            renderScreeningTest(result.data);

        } catch (error) {
            screeningQuestionsContainer.innerHTML = `<p class="error-text">Could not load test. ${error.message}</p>`;
        }
    }

    /**
     * Helper function to dynamically build the HTML for the questionnaire form.
     */
    function renderScreeningTest(test) {
        screeningTestTitle.textContent = test.fullName;
        screeningTestDescription.textContent = test.description;
        screeningTestForm.dataset.testKey = test.testKey; // Store the key on the form
        screeningQuestionsContainer.innerHTML = ''; // Clear loading message

        // Loop through each question
        test.questions.forEach(q => {
            const questionItem = document.createElement('div');
            questionItem.className = 'questionnaire-item';
            
            let optionsHtml = test.options.map(opt => `
                <label>
                    <input type="radio" name="question-${q.questionNumber}" value="${opt.value}" required>
                    ${opt.text}
                </label>
            `).join('');

            questionItem.innerHTML = `
                <p>${q.questionNumber}. ${q.text}</p>
                <div class="questionnaire-options">
                    ${optionsHtml}
                </div>
            `;
            screeningQuestionsContainer.appendChild(questionItem);
        });
    }

    /**
     * Handles the submission of the completed test form.
     */
    async function handleScreeningSubmit(e) {
        e.preventDefault();
        const testKey = screeningTestForm.dataset.testKey;
        const answers = [];
        
        // Find how many questions there are
        const questionCount = screeningQuestionsContainer.querySelectorAll('.questionnaire-item').length;
        
        // Validate and collect answers
        for (let i = 1; i <= questionCount; i++) {
            const selectedOption = document.querySelector(`input[name="question-${i}"]:checked`);
            if (!selectedOption) {
                return showNotification('Please answer all questions before submitting.', 'error');
            }
            answers.push(parseInt(selectedOption.value, 10));
        }

        const submitBtn = screeningTestForm.querySelector('button[type="submit"]');
        submitBtn.disabled = true;
        submitBtn.textContent = 'Calculating...';

        try {
            const response = await fetch(`/api/screening/${testKey}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${getToken()}` },
                body: JSON.stringify({ answers })
            });
            const result = await response.json();
            if (!result.success) throw new Error(result.error);

            renderScreeningResults(result.data);

        } catch (error) {
            showNotification(error.message, 'error');
        } finally {
            submitBtn.disabled = false;
            submitBtn.textContent = 'Submit & View Score';
        }
    }

    /**
     * Displays the final results view with the score and interpretation.
     */
    function renderScreeningResults(result) {
        screeningResultScore.textContent = result.totalScore;
        screeningResultInterpretation.textContent = result.interpretation;
        screeningResultRecommendation.textContent = result.recommendation;
        
        // Show the high-risk warning if escalated
        screeningResultEscalation.classList.toggle('hidden', !result.isEscalated);

        showScreeningView('results');
    }

    // Placeholder legal text. In a real production app, you would fetch this from static files or an API.
    const legalContent = {
        terms: `
            <h3>Terms & Conditions</h3>
            <p>Welcome to Sahara. By creating an account, you agree to these terms...</p>
            <p><strong>1. Service Description:</strong> Sahara provides an AI-powered companion and wellness tools for informational purposes. It is not a replacement for professional medical advice, diagnosis, or treatment.</p>
            <p><strong>2. Emergency Situations:</strong> This service is NOT for crises. If you are experiencing a medical emergency or feel you are a danger to yourself or others, please contact your local emergency services (112 in India) or a crisis helpline immediately.</p>
            <p><strong>3. User Accounts:</strong> You are responsible for maintaining the confidentiality of your account and password. You agree to create only one (1) account and provide accurate information.</p>
            <p><strong>4. Anonymous Forum:</strong> You agree that any content you post in the Community Forum (anonymously or otherwise) is your own responsibility. You agree not to post content that is hateful, illegal, threatening, or otherwise inappropriate. We reserve the right to moderate and remove any content for any reason.</p>
            <p><strong>5. Termination:</strong> We reserve the right to suspend or terminate your account at any time for violations of these terms.</p>
        `,
        privacy: `
            <h3>Privacy Policy</h3>
            <p>Your privacy is our highest priority.</p>
            <p><strong>1. Data Collection:</strong> We collect only the data necessary to provide our service, including your email (for registered users), mood entries, journal content, and chat logs.</p>
            <p><strong>2. Data Encryption:</strong> All sensitive personal data, including all your Journal Entries, AI Chat Logs, and Live Counselor Chat Logs, is encrypted at rest in our database using strong AES-256-GCM encryption. Not even our engineers can read your private content.</p>
            <p><strong>3. Guest Data Policy (Data Minimization):</strong> If you use the service as a Guest, a temporary account is created. This account and ALL associated data (including all your chat messages) are automatically and permanently deleted from our servers 7 days after your session is created. This is enforced by a database-level TTL Index.</p>
            <p><strong>4. Anonymized Analytics:</strong> We may analyze *anonymized, aggregated* data (e.g., "30% of all users reported 'anxiety' this week") to monitor the community's well-being and improve our service. This data is fully anonymous and can never be linked back to you personally.</p>
            <p><strong>5. Data Sharing:</strong> We will never sell, rent, or share your personal data with any third parties, except where required by law.</p>
        `
    };

    /**
     * Shows the legal modal and populates it with the correct text.
     * @param {string} type - Either 'terms' or 'privacy'.
     */
    function showLegalText(type) {
        if (type === 'terms') {
            legalModalTitle.textContent = 'Terms & Conditions';
            legalModalBody.innerHTML = legalContent.terms;
        } else if (type === 'privacy') {
            legalModalTitle.textContent = 'Privacy Policy';
            legalModalBody.innerHTML = legalContent.privacy;
        }
        legalModal.classList.remove('hidden');
    }
});

// ===================================================================================
// --- 7. UTILITY FUNCTIONS ---
// These are helper functions used in various places throughout the script.
// ===================================================================================

/**
 * Securely creates an HTML element and sets its properties.
 * This is the safe alternative to using innerHTML with template literals.
 * Any text passed to 'textContent' is rendered as plain text, not HTML.
 * @param {string} tag - The HTML tag to create (e.g., 'div', 'h4', 'p').
 * @param {object} options - An object containing properties to set.
 * @param {string} [options.className] - The CSS class(es) to add.
 * @param {string} [options.textContent] - The text content to safely add
 * @param {Array<HTMLElement>} [options.children] - An array of child elements to append.
 * @param {Object<string, string>} [options.dataset] - An object of data attributes to set.
 * @param {Function} [options.onclick] - An event handler to attach.
 * @param {object} [options.style] - An object of CSS styles to apply.
 * @returns {HTMLElement} The newly created and secured element.
 */
function createElement(tag, { className, textContent, children, dataset, onclick, style }) {
    const el = document.createElement(tag);
    if (className) el.className = className;
    
    if (textContent) el.textContent = textContent; 
    
    if (onclick) el.onclick = onclick;
    
    if (dataset) {
        for (const key in dataset) {
            el.dataset[key] = dataset[key];
        }
    }
    
    if (style) {
        for (const key in style) {
            el.style[key] = style[key];
        }
    }

    if (children && Array.isArray(children)) {
        children.forEach(child => child && el.appendChild(child));
    }
    
    return el;
}

/**
 * Utility function to limit how often a function can run.
 * This is perfect for search inputs to prevent firing an API call on every single keystroke.
 * @param {Function} func - The function to debounce.
 * @param {number} wait - The delay in milliseconds.
 */
function debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout);
            func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
}

/**
 * A simple utility to show a temporary notification banner at the top of the screen.
 * @param {string} message - The message to display.
 * @param {string} type - 'success', 'error', or 'warning' for different colors.
 */
function showNotification(message, type = 'success') {
    const notification = document.getElementById('notification');
    notification.textContent = message;
    notification.className = `notification ${type}`; // The class controls the color
    notification.classList.remove('hidden');
    // The notification automatically disappears after 3 seconds.
    setTimeout(() => {
        notification.classList.add('hidden');
    }, 3000);
}

/**
 * A shorthand function to get the JWT token from local storage.
 * @returns {string|null} The token, or null if it doesn't exist.
 */
function getToken() { return localStorage.getItem('token'); }