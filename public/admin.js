/**
 * public/admin.js
 *
 * This is the JavaScript engine for the entire Admin Panel. It's a Single Page Application (SPA)
 * that manages all admin duties by showing/hiding different sections and modals.
 *
 * Key features of this file:
 * 1.  **Secure:** Runs a strict authentication check on load to verify the user is a logged-in Admin.
 * 2.  **Scalable:** All data sections (Users, Chats, Resources) use SERVER-SIDE pagination and search.
 * We *never* pull entire database tables into the browser, ensuring the panel stays fast
 * even with millions of records.
 * 3.  **Stateful:** It maintains a central `state` object to track the current page and search query
 * for *each data section independently*.
 * 4.  **Modal-Driven:** All "Create" and "Update" actions happen within pop-up modals.
 */

// --- 1. DOM Element References ---
// We grab all the interactive elements from admin.html once on load for fast access.
const adminUsername = document.getElementById('adminUsername');
const logoutBtn = document.getElementById('logoutBtn');
const navLinks = document.querySelectorAll('.admin-sidebar a');
const adminSections = document.querySelectorAll('.admin-section');

// Search and Refresh Buttons
const resourceSearchInput = document.getElementById('resourceSearchInput');
const counselorSearchInput = document.getElementById('counselorSearchInput');
const appointmentSearchInput = document.getElementById('appointmentSearchInput');
const forumSearchInput = document.getElementById('forumSearchInput');
const refreshResourcesBtn = document.getElementById('refreshResourcesBtn');
const refreshCounselorsBtn = document.getElementById('refreshCounselorsBtn');
const refreshAppointmentsBtn = document.getElementById('refreshAppointmentsBtn');
const refreshForumBtn = document.getElementById('refreshForumBtn');

// User Management Elements
const usersTableBody = document.getElementById('usersTableBody');
const refreshUsersBtn = document.getElementById('refreshUsersBtn');
const userSearchInput = document.getElementById('userSearchInput');
const userEditModal = document.getElementById('userEditModal');
const closeUserModalBtn = document.getElementById('closeUserModalBtn');
const userEditForm = document.getElementById('userEditForm');
const editUserId = document.getElementById('editUserId');
const editUsername = document.getElementById('editUsername');
const editEmail = document.getElementById('editEmail');
const editIsAdmin = document.getElementById('editIsAdmin');

// Chat Management Elements
const chatsTableBody = document.getElementById('chatsTableBody');
const refreshChatsBtn = document.getElementById('refreshChatsBtn');
const chatSearchInput = document.getElementById('chatSearchInput');
const chatDetailModal = document.getElementById('chatDetailModal');
const closeChatModalBtn = document.getElementById('closeChatModalBtn');
const saveChatDetailsBtn = document.getElementById('saveChatDetailsBtn');

// Resource Management Elements
const resourcesTableBody = document.getElementById('resourcesTableBody');
const createNewResourceBtn = document.getElementById('createNewResourceBtn');
const resourceEditModal = document.getElementById('resourceEditModal');
const closeResourceModalBtn = document.getElementById('closeResourceModalBtn');
const resourceEditForm = document.getElementById('resourceEditForm');
const resourceModalTitle = document.getElementById('resourceModalTitle');

// Counselor and Appointment Elements
const counselorsTableBody = document.getElementById('counselorsTableBody');
const createNewCounselorBtn = document.getElementById('createNewCounselorBtn');
const counselorEditModal = document.getElementById('counselorEditModal');
const closeCounselorModalBtn = document.getElementById('closeCounselorModalBtn');
const counselorEditForm = document.getElementById('counselorEditForm');
const appointmentsTableBody = document.getElementById('appointmentsTableBody');

// Forum Moderation Elements
const forumPostsTableBody = document.getElementById('forumPostsTableBody');

// --- 2. Global & State Management ---
let currentSection = 'dashboard'; // Tracks the currently visible section
let currentChatId = null; // Stores the ID of the chat being viewed/edited in the modal
let currentAdminUser = null; // Stores the logged-in admin's user object
let globalMoodChart = null;
let globalSentimentChart = null;

/**
 * This is the central state object for our admin panel.
 * It tracks the pagination and search state for *each section independently*,
 * allowing the admin to search in "Users" and then switch to "Resources"
 * without losing their user search or what page they were on.
 */
let state = {
    users: { currentPage: 1, totalPages: 1, search: '' },
    chats: { currentPage: 1, totalPages: 1, search: '' },
    resources: { currentPage: 1, totalPages: 1, search: '' },
    counselors: { currentPage: 1, totalPages: 1, search: '' },
    appointments: { currentPage: 1, totalPages: 1, search: '' },
    forum: { currentPage: 1, totalPages: 1, search: '' }
};

/**
 * Writes the current application state (active section, page, and search)
 * into the browser's URL query string without reloading the page.
 */
function updateURLFromState() {
    // Get the state for the currently active section
    const sectionState = state[currentSection]; 
    const params = new URLSearchParams();
    
    params.set('section', currentSection);

    // Only add page and search params if they are not the default
    if (sectionState && sectionState.currentPage > 1) {
        params.set('page', sectionState.currentPage);
    }
    if (sectionState && sectionState.search) {
        params.set('search', sectionState.search);
    }

    const newUrl = `${window.location.pathname}?${params.toString()}`;
    // Use pushState to update the URL in the browser bar without a page reload
    window.history.pushState({ path: newUrl }, '', newUrl);
}

/**
 * Reads the state from the URL query string on page load.
 * Sets the initial state, updates search inputs, and activates the correct sidebar link.
 * @returns {string} The name of the section to load (e.g., "dashboard", "users").
 */
function loadStateFromURL() {
    const params = new URLSearchParams(window.location.search);
    
    const section = params.get('section') || 'dashboard'; // Default to dashboard
    const page = parseInt(params.get('page'), 10) || 1;
    const search = params.get('search') || '';

    currentSection = section;

    // Update the global state object with values from the URL
    if (state[section]) {
        state[section].currentPage = page;
        state[section].search = search;
    }

    // Visually update the UI to match the loaded state
    try {
        // Set the sidebar "active" class correctly
        navLinks.forEach(link => {
            link.classList.toggle('active', link.dataset.section === section);
        });
        
        // Show the correct section panel
        adminSections.forEach(sec => {
            sec.classList.toggle('active', sec.id === section);
        });

        // Fill the search bar for that section with the loaded search term
        const searchInput = document.getElementById(`${section}SearchInput`);
        if (searchInput) {
            searchInput.value = search;
        }
    } catch (e) {
        console.error("Error applying state to UI", e);
        // Fallback to dashboard if something goes wrong
        document.getElementById('dashboard').classList.add('active');
        document.querySelector('.admin-sidebar a[data-section="dashboard"]').classList.add('active');
        return 'dashboard';
    }
    
    // Return the section name so the app knows what data to load
    return section;
}


// --- 3. App Initialization ---
// This listener waits for the entire HTML page to be loaded before running any JS.
document.addEventListener('DOMContentLoaded', () => {
    // 1. First, and most importantly: run our auth check.
    checkAuthStatus();

    // 2. Hook up all our main event listeners.
    logoutBtn.addEventListener('click', handleLogout);
    navLinks.forEach(link => link.addEventListener('click', switchSection));
    
    // Refresh buttons
    refreshUsersBtn.addEventListener('click', () => loadUsers(state.users.currentPage));
    refreshChatsBtn.addEventListener('click', () => loadChats(state.chats.currentPage));
    refreshResourcesBtn.addEventListener('click', () => loadResources(state.resources.currentPage));
    refreshCounselorsBtn.addEventListener('click', () => loadCounselors(state.counselors.currentPage));
    refreshAppointmentsBtn.addEventListener('click', () => loadAppointments(state.appointments.currentPage));
    refreshForumBtn.addEventListener('click', () => loadForumPostsAdmin(state.forum.currentPage));
    
    // Appointment status form
    const appointmentStatusForm = document.getElementById('appointmentStatusForm');
    appointmentStatusForm?.addEventListener('submit', handleAppointmentStatusUpdate);
    
    // --- Server-Side Search Input Listeners ---
    // We "debounce" all search inputs. This is a crucial performance optimization.
    // It waits 300ms *after* the user stops typing before firing the search.
    // This prevents sending an API request on every single keystroke.
    userSearchInput.addEventListener('input', debounce(() => {
        state.users.search = userSearchInput.value; // Update the state
        loadUsers(1); // Trigger a new search, resetting to page 1
    }, 300));

    chatSearchInput.addEventListener('input', debounce(() => {
        state.chats.search = chatSearchInput.value;
        loadChats(1);
    }, 300));

    resourceSearchInput.addEventListener('input', debounce(() => {
        state.resources.search = resourceSearchInput.value;
        loadResources(1);
    }, 300));

    counselorSearchInput.addEventListener('input', debounce(() => {
        state.counselors.search = counselorSearchInput.value;
        loadCounselors(1);
    }, 300));

    appointmentSearchInput.addEventListener('input', debounce(() => {
        state.appointments.search = appointmentSearchInput.value;
        loadAppointments(1);
    }, 300));

    forumSearchInput.addEventListener('input', debounce(() => {
        state.forum.search = forumSearchInput.value;
        loadForumPostsAdmin(1);
    }, 300));

    // --- Modal Listeners ---
    // Hook up all the close buttons and form submissions for our pop-up modals.
    closeUserModalBtn?.addEventListener('click', () => userEditModal.classList.add('hidden'));
    closeChatModalBtn?.addEventListener('click', () => chatDetailModal.classList.add('hidden'));
    closeResourceModalBtn?.addEventListener('click', () => resourceEditModal.classList.add('hidden'));
    closeCounselorModalBtn?.addEventListener('click', () => counselorEditModal.classList.add('hidden'));
    
    createNewResourceBtn.addEventListener('click', () => openResourceModal()); // Pass no ID to signal "create"
    resourceEditForm.addEventListener('submit', handleResourceFormSubmit);
    
    saveChatDetailsBtn?.addEventListener('click', (e) => {
        e.preventDefault();
        if (currentChatId) {
            const flag = document.getElementById('chatDetailFlag').value;
            saveChatChanges(currentChatId, flag);
        }
    });

    createNewCounselorBtn.addEventListener('click', () => openCounselorModal()); // Pass no ID
    counselorEditForm?.addEventListener('submit', handleCounselorFormSubmit);
});


// --- 4. Core Authentication ---

/**
 * Our "gatekeeper" function. Runs on page load to verify the user.
 * 1. Checks for a token in localStorage.
 * 2. Sends it to the server to validate.
 * 3. CRITICAL: Checks that the returned user has the `isAdmin: true` flag.
 * 4. If any check fails, boot the user back to the homepage.
 */
async function checkAuthStatus() {
    try {
        const token = localStorage.getItem('token');
        if (!token) {
            window.location.href = '/'; // No token, redirect to login
            return;
        }

        const response = await fetch('/api/users/me', {
            headers: { 'Authorization': `Bearer ${token}` }
        });

        if (!response.ok) throw new Error('Authentication failed');

        const data = await response.json();
        // This is the key check: are they a user AND are they an admin?
        if (!data.success || !data.data.isAdmin) throw new Error('Admin access required');

        // Success! Store the admin user.
        currentAdminUser = data.data;
        adminUsername.textContent = data.data.username;

        // Load the initial state (section, page, search) from the URL bar
        const initialSection = loadStateFromURL();

        // Now, load the specific section the URL asked for, using the page/search from the state
        switch (initialSection) {
            case 'dashboard': 
                loadDashboardStats(); 
                break;
            case 'users': 
                loadUsers(state.users.currentPage); 
                break;
            case 'chats': 
                loadChats(state.chats.currentPage); 
                break;
            case 'resources': 
                loadResources(state.resources.currentPage); 
                break;
            case 'counselors': 
                loadCounselors(state.counselors.currentPage); 
                break;
            case 'appointments': 
                loadAppointments(state.appointments.currentPage); 
                break;
            case 'forum': 
                loadForumPostsAdmin(state.forum.currentPage); 
                break;
            default: // Fallback if URL is manipulated to an unknown section
                document.getElementById('dashboard').classList.add('active'); // Show dashboard
                document.querySelector('.admin-sidebar a[data-section="dashboard"]').classList.add('active'); // Fix sidebar
                loadDashboardStats();
        }

    } catch (error) {
        showNotification(error.message, 'error');
        localStorage.removeItem('token'); // Clear the bad token
        setTimeout(() => { window.location.href = '/'; }, 2000);
    }
}

/**
 * Clears the auth token from storage and sends the user back to the homepage.
 */
async function handleLogout() {
    localStorage.removeItem('token');
    window.location.href = '/';
}


// --- 5. SPA Navigation ---

/**
 * This is the core logic for the Single Page App (SPA).
 * Instead of reloading the page, it just:
 * 1. Hides all sections.
 * 2. Shows the one the user clicked on.
 * 3. Loads the data for that newly visible section, always starting on page 1.
 */
function switchSection(e) {
    e.preventDefault();
    const targetSection = e.target.getAttribute('data-section');
    if (targetSection === currentSection) return; // Don't reload the same section

    // Update the visual "active" state on the sidebar nav
    navLinks.forEach(link => link.classList.remove('active'));
    e.target.classList.add('active');

    // Show the target section and hide all others
    adminSections.forEach(section => section.classList.remove('active'));
    document.getElementById(targetSection).classList.add('active');

    currentSection = targetSection;

    updateURLFromState(); // Update the URL to reflect the new section

    // Load (or re-load) the data for this section. 
    // This will respect the page/search already in the state (if any).
    switch (targetSection) {
        case 'dashboard': loadDashboardStats(); break;
        case 'users': loadUsers(state.users.currentPage); break; 
        case 'chats': loadChats(state.chats.currentPage); break; 
        case 'resources': loadResources(state.resources.currentPage); break;
        case 'counselors': loadCounselors(state.counselors.currentPage); break;
        case 'appointments': loadAppointments(state.appointments.currentPage); break;
        case 'forum': loadForumPostsAdmin(state.forum.currentPage); break;
    }
}


// --- 6. Data Loading & Rendering Functions (The Scalable Pattern) ---

/**
 * Fetches the simple stat cards for the dashboard.
 */
async function loadDashboardStats() {
    const token = localStorage.getItem('token');
    try {
        // 1. Fetch the simple stat cards (existing logic)
        const statsResponse = await fetch('/api/admin/stats', {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        if (!statsResponse.ok) throw new Error('Failed to load dashboard stats');
        const statsData = await statsResponse.json();
        if (!statsData.success) throw new Error(statsData.error);

        document.getElementById('totalUsers').textContent = statsData.data.totalUsers;
        document.getElementById('totalChats').textContent = statsData.data.totalChats;
        document.getElementById('newUsers').textContent = statsData.data.newUsers;
        document.getElementById('newChats').textContent = statsData.data.newChats;

        // 2. Fetch the global analytics chart data
        const analyticsResponse = await fetch('/api/admin/analytics', {
             headers: { 'Authorization': `Bearer ${token}` }
        });
        if (!analyticsResponse.ok) throw new Error('Failed to load analytics data');
        const analyticsData = await analyticsResponse.json();
        if (!analyticsData.success) throw new Error(analyticsData.error);

        // 3. Render the charts with the new data
        renderGlobalAnalytics(analyticsData.data);

    } catch (error) {
        showNotification(error.message, 'error');
        document.getElementById('dashboard').innerHTML = '<p class="error-text">Failed to load dashboard data.</p>';
    }
}

/**
 * Renders the global analytics charts on the admin dashboard.
 */
function renderGlobalAnalytics(stats) {
    // This is crucial: Destroy any existing charts before drawing new ones to prevent errors.
    if (globalMoodChart) globalMoodChart.destroy();
    if (globalSentimentChart) globalSentimentChart.destroy();

    // 1. Global Mood Distribution Chart (Doughnut)
    const moodCtx = document.getElementById('adminMoodChart').getContext('2d');
    globalMoodChart = new Chart(moodCtx, {
        type: 'doughnut',
        data: {
            labels: stats.moodDistribution.map(d => d.mood),
            datasets: [{
                label: 'Moods',
                data: stats.moodDistribution.map(d => d.count),
                backgroundColor: ['#EF4444', '#F59E0B', '#6B7280', '#10B981', '#6366F1'],
            }]
        },
        options: { responsive: true, maintainAspectRatio: false }
    });

    // 2. Global Sentiment Distribution Chart (Pie)
    const sentimentCtx = document.getElementById('adminSentimentChart').getContext('2d');
    globalSentimentChart = new Chart(sentimentCtx, {
        type: 'pie',
        data: {
            labels: stats.sentimentDistribution.map(d => d.sentiment),
            datasets: [{
                label: 'Sentiments',
                data: stats.sentimentDistribution.map(d => d.count),
                backgroundColor: ['#FBBF24', '#F87171', '#9CA3AF', '#F97316', '#DC2626'],
            }]
        },
        options: { responsive: true, maintainAspectRatio: false }
    });
}

// --- User Management ---

/**
 * This function follows our main scalable pattern:
 * 1. Get the current page and search term from the global `state` object.
 * 2. Build a URL with query parameters (e.g., /api/admin/users?page=2&search=test).
 * 3. Fetch just that single page of data from the server.
 * 4. Pass the returned `items` array to the render function.
 * 5. Update the global state with the new total page count.
 * 6. Re-render the pagination controls.
 */
async function loadUsers(page = 1) {
    try {
        showLoading('Loading users...');
        const token = localStorage.getItem('token');
        const searchTerm = state.users.search;
        const url = `/api/admin/users?page=${page}&limit=10&search=${encodeURIComponent(searchTerm)}`;
        
        const response = await fetch(url, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        if (!response.ok) throw new Error('Failed to load users');

        const data = await response.json();
        if (!data.success) throw new Error(data.error);

        const resultData = data.data;
        renderUsersTable(Array.isArray(resultData.items) ? resultData.items : []);
        
        // Update state and render pagination
        state.users = { ...state.users, totalPages: resultData.pages || 1, currentPage: resultData.currentPage || 1 };
        renderPagination('users', state.users);
        updateURLFromState(); // Update the URL to reflect current state
    } catch (error) {
        showNotification(error.message, 'error');
        usersTableBody.innerHTML = '<tr><td colspan="5" class="loading-row">Error loading users.</td></tr>';
    } finally {
        hideLoading();
    }
}

function renderUsersTable(users) {
    usersTableBody.innerHTML = ''; // Clear the table body
    if (!users || users.length === 0) {
        usersTableBody.innerHTML = '<tr><td colspan="5" class="loading-row">No users found</td></tr>';
        return;
    }

    users.forEach(user => {
        const tr = createElement('tr', {
            children: [
                createElement('td', { textContent: user.username || 'N/A' }),
                createElement('td', { textContent: user.email || 'N/A' }),
                createElement('td', { textContent: user.createdAt ? new Date(user.createdAt).toLocaleDateString() : 'N/A' }),
                createElement('td', { 
                    children: [ user.isAdmin ? createElement('i', { className: 'fa-solid fa-check admin-tick' }) : null ]
                }),
                createElement('td', {
                    className: 'cell-actions',
                    children: [
                        createElement('button', {
                            className: 'btn-icon edit',
                            title: 'Edit User',
                            onclick: () => editUser(user._id, user.username, user.email, user.isAdmin),
                            children: [ createElement('i', { className: 'fas fa-edit' }) ]
                        }),
                        createElement('button', {
                            className: 'btn-icon delete',
                            title: 'Delete User',
                            onclick: () => deleteUser(user._id),
                            children: [ createElement('i', { className: 'fas fa-trash' }) ]
                        })
                    ]
                })
            ]
        });
        usersTableBody.appendChild(tr);
    });
}

/**
 * Populates the User Edit modal with the data passed from the onclick handler.
 * This also contains the security logic to prevent an admin from removing their own privileges.
 */
window.editUser = function(userId, username, email, isAdmin) {
    editUserId.value = userId;
    editUsername.value = username;
    editEmail.value = email;
    editIsAdmin.checked = isAdmin;
    
    // Safety check: Is the admin editing themselves?
    if (currentAdminUser && currentAdminUser._id === userId) {
        // Yes. Disable the checkbox to prevent self-lockout.
        // The server also has a redundant check for this, which is good practice (defense-in-depth).
        editIsAdmin.disabled = true;
        editIsAdmin.parentElement.title = "You cannot remove your own admin privileges.";
    } else {
        editIsAdmin.disabled = false;
        editIsAdmin.parentElement.title = "";
    }
    userEditModal.classList.remove('hidden');
}

/**
 * Handles the "Save" button on the User Edit form.
 * It sends the data to the backend and refreshes the *current page* of the table.
 */
userEditForm.onsubmit = async function(e) {
    e.preventDefault(); 
    const userId = editUserId.value;
    const username = editUsername.value.trim();
    const email = editEmail.value.trim();
    const isAdmin = editIsAdmin.checked;

    if (!userId || !username || !email) return showNotification('All fields are required.', 'error');

    try {
        showLoading('Updating user...');
        const token = localStorage.getItem('token');
        const response = await fetch(`/api/admin/users/${userId}`, {
            method: 'PUT',
            headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
            body: JSON.stringify({ username, email, isAdmin })
        });

        const data = await response.json();
        if (!data.success) throw new Error(data.error || `Failed with status ${response.status}`);
        
        showNotification('User updated successfully', 'success');
        userEditModal.classList.add('hidden');
        await loadUsers(state.users.currentPage); // Refresh the CURRENT page, not page 1
    } catch (error) {
        showNotification(error.message, 'error');
    } finally {
        hideLoading();
    }
};

/**
 * Handles the "Delete" button click for a user.
 */
window.deleteUser = async function(userId) {
    // Always ask for confirmation before a destructive action!
    if (!confirm('Are you sure? This will also delete all their chats.')) return;
    try {
        showLoading('Deleting user...');
        const token = localStorage.getItem('token');
        const response = await fetch(`/api/admin/users/${userId}`, {
            method: 'DELETE',
            headers: { 'Authorization': `Bearer ${token}` }
        });
        if (!response.ok) throw new Error('Failed to delete user');
        const data = await response.json();
        if (!data.success) throw new Error(data.error);

        showNotification('User deleted successfully', 'success');
        loadUsers(state.users.currentPage); // Refresh the table
    } catch (error) {
        showNotification(error.message, 'error');
    } finally {
        hideLoading();
    }
}


// --- Chat Management ---
// (This section follows the same scalable pattern as Users)

async function loadChats(page = 1) {
    try {
        showLoading('Loading chats...');
        const token = localStorage.getItem('token');
        const searchTerm = state.chats.search;
        const url = `/api/admin/chats?page=${page}&limit=10&search=${encodeURIComponent(searchTerm)}`;
        const response = await fetch(url, {
            headers: { 'Authorization': `Bearer ${token}` }
        });

        if (!response.ok) throw new Error('Failed to load chats');
        const data = await response.json();
        if (!data.success) throw new Error(data.error);
        
        const resultData = data.data;
        renderChatsTable(Array.isArray(resultData.items) ? resultData.items : []);
        
        state.chats = { ...state.chats, totalPages: resultData.pages || 1, currentPage: resultData.currentPage || 1 };
        renderPagination('chats', state.chats);
        updateURLFromState(); // Update the URL to reflect current state
    } catch (error) {
        showNotification(error.message, 'error');
        chatsTableBody.innerHTML = '<tr><td colspan="5" class="loading-row">Error loading chats.</td></tr>';
    } finally {
        hideLoading();
    }
}

function renderChatsTable(chats) {
    chatsTableBody.innerHTML = ''; // Clear the table body
    if (!chats || chats.length === 0) {
        chatsTableBody.innerHTML = '<tr><td colspan="5" class="loading-row">No chats found</td></tr>';
        return;
    }
    
    chats.forEach(chat => {
        const tr = createElement('tr', {
            children: [

                createElement('td', { textContent: chat?.user?.username || 'Guest' }),
                createElement('td', { textContent: chat?.createdAt ? new Date(chat.createdAt).toLocaleString() : 'N/A' }),

                createElement('td', { className: 'cell-truncate', textContent: chat?.message || 'No message' }),
                createElement('td', { 
                    children: [
                        chat?.flag ? createElement('span', {
                            className: `cell-flagged flag-label flag-${chat.flag}`,
                            textContent: chat.flag
                        }) : document.createTextNode('-')
                    ]
                }),
                createElement('td', {
                    className: 'cell-actions',
                    children: [
                        createElement('button', {
                            className: 'btn-icon view',
                            title: 'View Details',
                            onclick: () => viewChatDetails(chat?._id),
                            children: [ createElement('i', { className: 'fas fa-eye' }) ]
                        }),
                        createElement('button', {
                            className: 'btn-icon delete',
                            title: 'Delete Chat',
                            onclick: () => deleteChat(chat?._id),
                            children: [ createElement('i', { className: 'fas fa-trash' }) ]
                        })
                    ]
                })
            ]
        });
        chatsTableBody.appendChild(tr);
    });
}

/**
 * Fetches the FULL data for a single chat log (since the message is truncated in the table)
 * and displays it in the detail modal.
 */
window.viewChatDetails = async function(chatId) {
    try {
        showLoading('Loading chat details...');
        const token = localStorage.getItem('token');
        const response = await fetch(`/api/admin/chats/${chatId}`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        if (!response.ok) throw new Error('Failed to load chat details');
        const data = await response.json();
        if (!data.success) throw new Error(data.error);

        const chat = data.data;
        currentChatId = chat._id; // Store the ID for the "Save" function
        
        // Populate the modal fields
        document.getElementById('chatDetailUsername').textContent = chat?.user?.username || 'Guest';
        document.getElementById('chatDetailDate').textContent = new Date(chat.createdAt).toLocaleString();
        document.getElementById('chatDetailUserMessage').textContent = chat.message; // This is the decrypted message
        document.getElementById('chatDetailBotResponse').textContent = chat.response || '';
        document.getElementById('chatDetailSentiment').textContent = chat.sentiment || 'N/A';
        document.getElementById('chatDetailConfidence').textContent = typeof chat.confidence === 'number' ? (chat.confidence * 100).toFixed(0) : 'N/A';
        document.getElementById('chatDetailFlag').value = chat.flag == null ? '' : chat.flag; // Set dropdown to current flag
        
        chatDetailModal.classList.remove('hidden');
    } catch (error) {
        showNotification(error.message, 'error');
    } finally {
        hideLoading();
    }
};

/**
 * Saves the admin's manual flag change from the chat detail modal.
 */
async function saveChatChanges(chatId, flag) {
    try {
        showLoading('Updating chat...');
        const token = localStorage.getItem('token');
        const response = await fetch(`/api/admin/chats/${chatId}`, {
            method: 'PUT',
            headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
            body: JSON.stringify({ flag: flag === '' ? null : flag }) // Send null if "(None)" is selected
        });
        if (!response.ok) throw new Error('Failed to update chat');
        const data = await response.json();
        if (!data.success) throw new Error(data.error);

        showNotification('Chat updated successfully', 'success');
        chatDetailModal.classList.add('hidden');
        await loadChats(state.chats.currentPage, state.chats.search); // Refresh the current chat page
    } catch (error) {
        showNotification(error.message, 'error');
    } finally {
        hideLoading();
    }
};

window.deleteChat = async function(chatId) {
    if (!confirm('Are you sure you want to delete this chat?')) return;
    try {
        showLoading('Deleting chat...');
        const token = localStorage.getItem('token');
        const response = await fetch(`/api/admin/chats/${chatId}`, {
            method: 'DELETE',
            headers: { 'Authorization': `Bearer ${token}` }
        });
        if (!response.ok) throw new Error('Failed to delete chat');
        const data = await response.json();
        if (!data.success) throw new Error(data.error);

        showNotification('Chat deleted successfully', 'success');
        loadChats(state.chats.currentPage, state.chats.search); // Refresh
    } catch (error) {
        showNotification(error.message, 'error');
    } finally {
        hideLoading();
    }
};


// --- Resource Management (Follows the same scalable pattern) ---
async function loadResources(page = 1) {
    try {
        showLoading('Loading resources...');
        const token = localStorage.getItem('token');
        const searchTerm = state.resources.search;
        const url = `/api/admin/resources?page=${page}&limit=10&search=${encodeURIComponent(searchTerm)}`;

        const response = await fetch(url, {
            headers: { 'Authorization': `Bearer ${token}` }
        });

        if (!response.ok) throw new Error('Failed to load resources');
        const data = await response.json();
        if (!data.success) throw new Error(data.error);
        
        const resultData = data.data;
        renderResourcesTable(Array.isArray(resultData.items) ? resultData.items : []);
        
        state.resources = { ...state.resources, totalPages: resultData.pages || 1, currentPage: resultData.currentPage || 1 };
        renderPagination('resources', state.resources);
        updateURLFromState(); // Update the URL to reflect current state
    } catch (error) {
        showNotification(error.message, 'error');
        resourcesTableBody.innerHTML = '<tr><td colspan="5" class="loading-row">Error loading resources.</td></tr>';
    } finally {
        hideLoading();
    }
}
 
function renderResourcesTable(resources) {
    resourcesTableBody.innerHTML = ''; // Clear table body
    if (!resources || resources.length === 0) {
        resourcesTableBody.innerHTML = '<tr><td colspan="5" class="loading-row">No resources found. Create one!</td></tr>';
        return;
    }
    
    resources.forEach(resource => {
        const tr = createElement('tr', {
            children: [
                createElement('td', { textContent: resource.title }),
                createElement('td', { 
                    children: [ 
                        createElement('span', { 
                            className: `type-badge type-${resource.type}`, 
                            textContent: resource.type // SAFE
                        }) 
                    ]
                }),
                createElement('td', { textContent: resource.language.toUpperCase() }),
                createElement('td', { textContent: resource.tags.join(', ') || '-' }),
                createElement('td', {
                    className: 'cell-actions',
                    children: [
                        createElement('button', {
                            className: 'btn-icon edit',
                            title: 'Edit Resource',
                            onclick: () => openResourceModal(resource._id),
                            children: [ createElement('i', { className: 'fas fa-edit' }) ]
                        }),
                        createElement('button', {
                            className: 'btn-icon delete',
                            title: 'Delete Resource',
                            onclick: () => deleteResource(resource._id),
                            children: [ createElement('i', { className: 'fas fa-trash' }) ]
                        })
                    ]
                })
            ]
        });
        resourcesTableBody.appendChild(tr);
    });
}
 
/**
 * Opens the Resource modal.
 * If an ID is provided, it's an "Edit" and we MUST fetch that resource's data from the server.
 * If no ID is provided, it's a "Create" and we just show a blank form.
 */
window.openResourceModal = async function(resourceId = null) {
    resourceEditForm.reset(); 
    document.getElementById('editResourceId').value = '';
    
    if (resourceId) {
        // This is an "Edit." We must fetch the item's data since we no longer have the client cache.
        resourceModalTitle.textContent = 'Edit Resource';
        try {
            showLoading('Loading resource data...');
            const token = localStorage.getItem('token');
            const response = await fetch(`/api/admin/resources/${resourceId}`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            const result = await response.json();
            if (!result.success) throw new Error(result.error);
            
            // Populate the form with the fetched data
            const resource = result.data;
            document.getElementById('editResourceId').value = resource._id;
            document.getElementById('editResourceTitle').value = resource.title;
            document.getElementById('editResourceDescription').value = resource.description;
            document.getElementById('editResourceUrl').value = resource.url;
            document.getElementById('editResourceType').value = resource.type;
            document.getElementById('editResourceLanguage').value = resource.language;
            document.getElementById('editResourceTags').value = resource.tags.join(', ');
            
            resourceEditModal.classList.remove('hidden');
        } catch (error) {
            showNotification(error.message, 'error');
        } finally {
            hideLoading();
        }
    } else {
        // This is a "Create." Just show the blank modal.
        resourceModalTitle.textContent = 'Create New Resource';
        resourceEditModal.classList.remove('hidden');
    }
}

/**
 * Handles the "Save" click for both creating and editing a resource.
 * It checks if an ID exists in the hidden form field to decide whether to POST (create) or PUT (update).
 */
async function handleResourceFormSubmit(e) {
    e.preventDefault();
    const resourceId = document.getElementById('editResourceId').value;
    const isEditing = !!resourceId; // If resourceId is not an empty string, this is true.

    const resourceData = {
        title: document.getElementById('editResourceTitle').value,
        description: document.getElementById('editResourceDescription').value,
        url: document.getElementById('editResourceUrl').value,
        type: document.getElementById('editResourceType').value,
        language: document.getElementById('editResourceLanguage').value,
        tags: document.getElementById('editResourceTags').value, // Server will handle splitting this string
    };
    
    // Set the correct URL and Method based on whether we are editing or creating
    const url = isEditing ? `/api/admin/resources/${resourceId}` : '/api/admin/resources';
    const method = isEditing ? 'PUT' : 'POST';

    try {
        showLoading(isEditing ? 'Updating resource...' : 'Creating resource...');
        const token = localStorage.getItem('token');
        const response = await fetch(url, {
            method,
            headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
            body: JSON.stringify(resourceData)
        });
        if (!response.ok) {
            const errData = await response.json();
            throw new Error(errData.error || 'Failed to save resource');
        }
        showNotification(`Resource ${isEditing ? 'updated' : 'created'} successfully`, 'success');
        resourceEditModal.classList.add('hidden');
        
        // If we were editing, refresh the page we were on. If we created a new one, go to page 1.
        await loadResources(isEditing ? state.resources.currentPage : 1);
    } catch (error) {
        showNotification(error.message, 'error');
    } finally {
        hideLoading();
    }
}

window.deleteResource = async function(resourceId) {
    if (!confirm('Are you sure you want to delete this resource?')) return;
    try {
        showLoading('Deleting resource...');
        const token = localStorage.getItem('token');
        const response = await fetch(`/api/admin/resources/${resourceId}`, {
            method: 'DELETE',
            headers: { 'Authorization': `Bearer ${token}` }
        });
        if (!response.ok) throw new Error('Failed to delete resource');
        showNotification('Resource deleted successfully', 'success');
        await loadResources(state.resources.currentPage); // Refresh the table.
    } catch (error) {
        showNotification(error.message, 'error');
    } finally {
        hideLoading();
    }
}


// --- Counselor Management (Follows the same scalable pattern) ---
async function loadCounselors(page = 1) {
    try {
        showLoading('Loading counselors...');
        const token = localStorage.getItem('token');
        const searchTerm = state.counselors.search;
        const url = `/api/admin/counselors?page=${page}&limit=10&search=${encodeURIComponent(searchTerm)}`;
        
        const response = await fetch(url, { headers: { 'Authorization': `Bearer ${token}` } });
        if (!response.ok) throw new Error('Failed to load counselors');
        
        const result = await response.json();
        if (!result.success) throw new Error(result.error);
        
        const resultData = result.data;
        renderCounselorsTable(Array.isArray(resultData.items) ? resultData.items : []);
        
        state.counselors = { ...state.counselors, totalPages: resultData.pages || 1, currentPage: resultData.currentPage || 1 };
        renderPagination('counselors', state.counselors);
        updateURLFromState(); // Update the URL to reflect current state
    } catch (error) {
        showNotification(error.message, 'error');
        counselorsTableBody.innerHTML = '<tr><td colspan="5" class="loading-row">Error loading counselors.</td></tr>';
    } finally {
        hideLoading();
    }
}

function renderCounselorsTable(counselors) {
    counselorsTableBody.innerHTML = ''; // Clear table body
    if (!counselors || counselors.length === 0) {
        counselorsTableBody.innerHTML = '<tr><td colspan="5" class="loading-row">No counselors found. Create one!</td></tr>';
        return;
    }
    
    counselors.forEach(c => {
        const tr = createElement('tr', {
            children: [
                createElement('td', { textContent: c.user.username }),
                createElement('td', { textContent: c.user.email }),
                createElement('td', { textContent: c.specialty }),
                createElement('td', {
                    children: [
                        createElement('span', {
                            style: { color: c.isActive ? 'var(--success)' : 'var(--error)' },
                            textContent: c.isActive ? 'Active' : 'Inactive'
                        })
                    ]
                }),
                createElement('td', {
                    className: 'cell-actions',
                    children: [
                        createElement('button', {
                            className: 'btn-icon edit',
                            title: 'Edit Counselor',
                            onclick: () => openCounselorModal(c._id),
                            children: [ createElement('i', { className: 'fas fa-edit' }) ]
                        }),
                        createElement('button', {
                            className: 'btn-icon delete',
                            title: 'Delete Counselor',
                            onclick: () => deleteCounselor(c._id),
                            children: [ createElement('i', { className: 'fas fa-trash' }) ]
                        })
                    ]
                })
            ]
        });
        counselorsTableBody.appendChild(tr);
    });
}

/**
 * Opens the Counselor modal. This is the most complex modal.
 * If editing, it fetches that one counselor.
 * If creating, it has to fetch *all users* AND *all counselors* to determine
 * which users are "available" (i.e., not already counselors).
 */
window.openCounselorModal = async function(counselorId = null) {
    counselorEditForm.reset();
    document.getElementById('editCounselorId').value = '';
    const userSelect = document.getElementById('editCounselorUser');
    userSelect.innerHTML = '';
    userSelect.disabled = false;
    
    try {
        const token = localStorage.getItem('token');
        if (counselorId) {
            // --- EDIT MODE ---
            // Fetch the single counselor we want to edit.
            counselorModalTitle.textContent = 'Edit Counselor';
            showLoading('Loading counselor data...');
            const response = await fetch(`/api/admin/counselors/${counselorId}`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            const result = await response.json();
            if (!result.success) throw new Error(result.error);
            const counselor = result.data;
            
            // Populate the form with this counselor's data
            document.getElementById('editCounselorId').value = counselor._id;
            // Create the single option for the user and disable the dropdown (can't change a counselor's user)
            userSelect.innerHTML = `<option value="${counselor.user._id}">${counselor.user.username} (${counselor.user.email})</option>`;
            userSelect.disabled = true;
            document.getElementById('editCounselorSpecialty').value = counselor.specialty;
            document.getElementById('editCounselorBio').value = counselor.bio;
            document.getElementById('editCounselorSlotDuration').value = counselor.slotDuration;
            document.getElementById('editCounselorIsActive').checked = counselor.isActive;

        } else {
            // --- CREATE MODE ---
            // We must find which users are NOT already counselors.
            counselorModalTitle.textContent = 'Create New Counselor';
            showLoading('Loading available users...');
            
            const response = await fetch('/api/admin/available-users', { headers: authHeader });
            const result = await response.json();
            if (!result.success) throw new Error(result.error);

            const availableUsers = result.data; // This data is already pre-filtered by the server.
            
            if (availableUsers.length === 0) {
                userSelect.innerHTML = '<option value="">No available users to assign</option>';
            } else {
                // Populate the dropdown with only the available users
                availableUsers.forEach(u => {
                    const option = document.createElement('option');
                    option.value = u._id;
                    option.textContent = `${u.username} (${u.email})`;
                    userSelect.appendChild(option);
                });
            }
        }
        counselorEditModal.classList.remove('hidden');
    } catch (error) {
        showNotification(error.message, 'error');
    } finally {
        hideLoading();
    }
}

/**
 * Handles the "Save" click for the Counselor modal (both create and edit).
 */
async function handleCounselorFormSubmit(e) {
    e.preventDefault();
    const counselorId = document.getElementById('editCounselorId').value;
    const isEditing = !!counselorId;
    
    // Create the data payload
    const counselorData = {
        userId: document.getElementById('editCounselorUser').value,
        specialty: document.getElementById('editCounselorSpecialty').value,
        bio: document.getElementById('editCounselorBio').value,
        slotDuration: document.getElementById('editCounselorSlotDuration').value,
        isActive: document.getElementById('editCounselorIsActive').checked,
    };
    
    // The backend API expects 'user' instead of 'userId' when editing, so we adjust the payload
    const payload = isEditing ? { ...counselorData, user: counselorData.userId } : counselorData;
    
    const url = isEditing ? `/api/admin/counselors/${counselorId}` : '/api/admin/counselors';
    const method = isEditing ? 'PUT' : 'POST';

    try {
        const token = localStorage.getItem('token');
        const response = await fetch(url, {
            method,
            headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
            body: JSON.stringify(payload)
        });
        const result = await response.json();
        if (!result.success) throw new Error(result.error);
        
        showNotification(`Counselor ${isEditing ? 'updated' : 'created'} successfully!`, 'success');
        counselorEditModal.classList.add('hidden');
        await loadCounselors(isEditing ? state.counselors.currentPage : 1); // Refresh
    } catch (error) {
        showNotification(error.message, 'error');
    }
}

window.deleteCounselor = async function(counselorId) {
    if (!confirm('Are you sure you want to delete this counselor profile? This action cannot be undone.')) return;
    try {
        const token = localStorage.getItem('token');
        const response = await fetch(`/api/admin/counselors/${counselorId}`, {
            method: 'DELETE',
            headers: { 'Authorization': `Bearer ${token}` }
        });
        const result = await response.json();
        if (!result.success) throw new Error(result.error);
        
        showNotification('Counselor deleted successfully.', 'success');
        loadCounselors(state.counselors.currentPage); // Refresh
    } catch (error) {
        showNotification(error.message, 'error');
    }
}


// --- Appointment Management (Follows the same scalable pattern) ---
async function loadAppointments(page = 1) {
    try {
        showLoading('Loading appointments...');
        const token = localStorage.getItem('token');
        const searchTerm = state.appointments.search;
        const url = `/api/admin/appointments?page=${page}&limit=10&search=${encodeURIComponent(searchTerm)}`;

        const response = await fetch(url, { headers: { 'Authorization': `Bearer ${token}` } });
        if (!response.ok) throw new Error('Failed to load appointments');
        const result = await response.json();
        if (!result.success) throw new Error(result.error);

        const resultData = result.data;
        renderAppointmentsTable(Array.isArray(resultData.items) ? resultData.items : []);
        
        state.appointments = { ...state.appointments, totalPages: resultData.pages || 1, currentPage: resultData.currentPage || 1 };
        renderPagination('appointments', state.appointments);
        updateURLFromState(); // Update the URL to reflect current state
    } catch (error) {
        showNotification(error.message, 'error');
        appointmentsTableBody.innerHTML = '<tr><td colspan="5" class="loading-row">Error loading appointments.</td></tr>';
    } finally {
        hideLoading();
    }
}

function renderAppointmentsTable(appointments) {
    appointmentsTableBody.innerHTML = ''; // Clear table body
    if (!appointments || appointments.length === 0) {
        appointmentsTableBody.innerHTML = '<tr><td colspan="5" class="loading-row">No appointments found.</td></tr>';
        return;
    }
    
    appointments.forEach(apt => {
        const tr = createElement('tr', {
            children: [
                createElement('td', { textContent: apt.user?.username || 'N/A' }),
                createElement('td', { textContent: apt.counselor?.user?.username || 'N/A' }),
                createElement('td', { textContent: new Date(apt.startTime).toLocaleString() }),
                createElement('td', { 
                    children: [ 
                        createElement('span', { 
                            className: `status-badge status-${apt.status}`, 
                            textContent: apt.status.replace(/_/g, ' ') 
                        }) 
                    ]
                }),
                createElement('td', {
                    className: 'cell-actions',
                    children: [
                        createElement('button', {
                            className: 'btn-icon edit',
                            title: 'Change Status',
                            onclick: () => openAppointmentStatusModal(apt._id, apt.status),
                            children: [ createElement('i', { className: 'fas fa-edit' }) ]
                        })
                    ]
                })
            ]
        });
        appointmentsTableBody.appendChild(tr);
    });
}

/**
 * Opens the simple modal just for changing an appointment's status.
 */
window.openAppointmentStatusModal = function(appointmentId, currentStatus) {
    document.getElementById('editAppointmentId').value = appointmentId;
    document.getElementById('editAppointmentStatus').value = currentStatus;
    document.getElementById('appointmentStatusModal').classList.remove('hidden');
};

/**
 * Handles saving the new status for an appointment.
 */
async function handleAppointmentStatusUpdate(e) {
    e.preventDefault();
    const appointmentId = document.getElementById('editAppointmentId').value;
    const newStatus = document.getElementById('editAppointmentStatus').value;
    try {
        const token = localStorage.getItem('token');
        const response = await fetch(`/api/admin/appointments/${appointmentId}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
            body: JSON.stringify({ status: newStatus })
        });
        const result = await response.json();
        if (!result.success) throw new Error(result.error);
        showNotification('Appointment status updated successfully!', 'success');
        document.getElementById('appointmentStatusModal').classList.add('hidden');
        await loadAppointments(state.appointments.currentPage); // Refresh
    } catch (error) {
        showNotification(error.message, 'error');
    }
};


// --- Forum Moderation (Follows the same scalable pattern) ---
async function loadForumPostsAdmin(page = 1) {
    try {
        showLoading('Loading forum posts...');
        const token = localStorage.getItem('token');
        const searchTerm = state.forum.search;
        const url = `/api/admin/forum/posts?page=${page}&limit=10&search=${encodeURIComponent(searchTerm)}`;

        const response = await fetch(url, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        if (!response.ok) throw new Error('Failed to load posts');
        const result = await response.json();
        if (!result.success) throw new Error(result.error);

        const resultData = result.data;
        renderForumPostsTable(Array.isArray(resultData.items) ? resultData.items : []);
        
        state.forum = { ...state.forum, totalPages: resultData.pages || 1, currentPage: resultData.currentPage || 1 };
        renderPagination('forum', state.forum);
        updateURLFromState(); // Update the URL to reflect current state
    } catch (error) {
        showNotification(error.message, 'error');
        forumPostsTableBody.innerHTML = '<tr><td colspan="5" class="loading-row">Error loading posts.</td></tr>';
    } finally {
        hideLoading();
    }
}

function renderForumPostsTable(posts) {
    forumPostsTableBody.innerHTML = ''; // Clear table body
    if (!posts || posts.length === 0) {
        forumPostsTableBody.innerHTML = '<tr><td colspan="6" class="loading-row">No forum posts found.</td></tr>';
        return;
    }
    
    posts.forEach(post => {
        const isFlagged = post.reportCount > 0;
        const flaggedClass = isFlagged ? 'flagged-row' : '';

        const tr = createElement('tr', {
            className: flaggedClass,
            children: [
                createElement('td', { textContent: post.title }),
                createElement('td', { textContent: post.user.username }),
                createElement('td', { textContent: new Date(post.createdAt).toLocaleString() }),
                createElement('td', { textContent: post.isAnonymous ? 'Yes' : 'No' }),
                createElement('td', { 
                    children: [ 
                        createElement(isFlagged ? 'strong' : 'span', { textContent: post.reportCount.toString() })
                    ] 
                }),
                createElement('td', {
                    className: 'cell-actions',
                    children: [
                        createElement('button', {
                            className: 'btn-icon delete',
                            title: 'Delete Post',
                            onclick: () => deletePostAdmin(post._id),
                            children: [ createElement('i', { className: 'fas fa-trash' }) ]
                        })
                    ]
                })
            ]
        });
        forumPostsTableBody.appendChild(tr);
    });
}


window.deletePostAdmin = async function(postId) {
    if (!confirm('Are you sure you want to delete this post and all its comments? This cannot be undone.')) return;
    try {
        showLoading('Deleting post...');
        const token = localStorage.getItem('token');
        const response = await fetch(`/api/admin/forum/posts/${postId}`, {
            method: 'DELETE',
            headers: { 'Authorization': `Bearer ${token}` }
        });
        const result = await response.json();
        if (!result.success) throw new Error(result.error);
        showNotification('Post deleted successfully.', 'success');
        await loadForumPostsAdmin(state.forum.currentPage); // Refresh
    } catch (error) {
        showNotification(error.message, 'error');
    } finally {
        hideLoading();
    }
}


// --- 7. Generic Pagination ---

/**
 * Renders pagination controls (buttons, page info) for any section.
 * It grabs the correct pagination container (e.g., "usersPagination") and fills it.
 * @param {string} sectionName - The name of the section (e.g., 'users', 'chats')
 * @param {object} paginationState - The state object { currentPage, totalPages }
 */
function renderPagination(sectionName, paginationState) {
    const { currentPage, totalPages } = paginationState;
    const container = document.getElementById(`${sectionName}Pagination`);
    if (!container) return; // Failsafe if the HTML container is missing

    container.innerHTML = `
        <button class="pagination-btn" ${currentPage <= 1 ? 'disabled' : ''} onclick="changePage('${sectionName}', ${currentPage - 1})">Previous</button>
        <span class="pagination-info">Page ${currentPage} of ${totalPages}</span>
        <button class="pagination-btn" ${currentPage >= totalPages ? 'disabled' : ''} onclick="changePage('${sectionName}', ${currentPage + 1})">Next</button>
    `;
}

/**
 * A single, generic function to handle all "Next" or "Previous" button clicks.
 * It uses the sectionName to call the correct data loading function for the new page.
 * @param {string} sectionName - The section to change the page for (e.g., 'users')
 * @param {number} page - The new page number to load
 */
window.changePage = function(sectionName, page) {
    // Prevent invalid page clicks
    const state = window.state[sectionName];
    if (page < 1 || page > state.totalPages) return;
    
    // Call the correct loader function for that section
    switch (sectionName) {
        case 'users':       loadUsers(page); break;
        case 'chats':       loadChats(page); break;
        case 'resources':   loadResources(page); break;
        case 'counselors':  loadCounselors(page); break;
        case 'appointments':loadAppointments(page); break;
        case 'forum':       loadForumPostsAdmin(page); break;
    }
}


// --- 8. Utility Functions ---

/**
 * Shows a full-screen loading spinner with a message.
 */
function showLoading(message = 'Loading...') {
    const existingOverlay = document.getElementById('loadingOverlay');
    if (existingOverlay) return; // Don't stack overlays
    const loadingDiv = document.createElement('div');
    loadingDiv.id = 'loadingOverlay';
    loadingDiv.className = 'loading-overlay';
    loadingDiv.innerHTML = `<div class="loading-spinner"></div><div class="loading-message">${message}</div>`;
    document.body.appendChild(loadingDiv);
}

/**
 * Removes the loading spinner.
 */
function hideLoading() {
    const loadingDiv = document.getElementById('loadingOverlay');
    if (loadingDiv) loadingDiv.remove();
}

/**
 * Shows a small, temporary notification banner at the bottom of the screen.
 * @param {string} message - The message to display.
 * @param {string} type - 'success', 'error', or 'warning' for styling.
 */
function showNotification(message, type = 'success') {
    const notification = document.createElement('div');
    notification.className = `notification ${type}`;
    notification.textContent = message;
    document.body.appendChild(notification);
    // Automatically fade out and remove after 3 seconds
    setTimeout(() => { notification.remove(); }, 3000);
}

/**
 * Debounce utility. This is a crucial performance helper for search bars.
 * It returns a new function that will only run *after* a set amount of time (wait)
 * has passed since the user *stopped* typing.
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