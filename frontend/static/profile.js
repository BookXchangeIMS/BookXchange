// ============================================
// GLOBAL NAVIGATION FUNCTIONS
// ============================================

window.goBack = function () {
    window.location.href = 'home.html';
};

// ============================================
// PAGE INITIALIZATION
// ============================================

document.addEventListener('DOMContentLoaded', async function () {
    await loadUserProfile();
});

// ============================================
// LOAD USER PROFILE DATA
// ============================================

async function loadUserProfile() {
    const token = getAccessToken();

    console.log('Loading profile... Token:', token ? 'exists' : 'missing');
    console.log('Token value:', token); // Show actual token

    // Already checked by login protection at top of file
    if (!token) {
        console.error('No token found');
        return;
    }

    try {
        // Fetch user profile from API
        console.log('Fetching profile from API...');
        const profile = await getMyProfile(token);
        console.log('Profile loaded:', profile);

        // Update DOM elements
        const userNameElement = document.getElementById('userName');
        const userEmailElement = document.getElementById('userEmail');
        const aboutTextElement = document.getElementById('aboutText');
        const interestsTextElement = document.getElementById('interestsText');

        if (userNameElement) {
            userNameElement.textContent = `Hello, ${profile.Name}!`;
        }

        if (userEmailElement) {
            userEmailElement.textContent = profile.Email;
        }

        if (aboutTextElement) {
            aboutTextElement.textContent = profile.AboutMe || 'No information provided';
        }

        // Load profile image if exists
        if (profile.ProfileImagePath) {
            const avatarElement = document.querySelector('.avatar');
            if (avatarElement) {
                const imageUrl = `${API_BASE_URL}/api/get_users_profile_picture?userid=${profile.UserID}&access_token=${token}`;
                avatarElement.innerHTML = `<img src="${imageUrl}" alt="Profile Picture" style="width: 100%; height: 100%; object-fit: cover; border-radius: 50%;" onerror="this.parentElement.innerHTML='<i class=\\'fas fa-user\\'></i>'">`;
            }
        }

        // Fetch and display preferences
        try {
            console.log('Fetching preferences...');
            const preferences = await getPreferences(token);
            console.log('Preferences loaded:', preferences);
            if (interestsTextElement) {
                interestsTextElement.textContent = preferences.length > 0
                    ? preferences.join(', ')
                    : 'No interests selected';
            }
        } catch (error) {
            console.error('Error loading preferences:', error);
            if (interestsTextElement) {
                interestsTextElement.textContent = 'Unable to load interests';
            }
        }
    } catch (error) {
        console.error('Error loading profile:', error);
        console.error('Error details:', error.message);
        showToast('Failed to load profile: ' + error.message, 'error');

        // Commented out to debug
        // setTimeout(() => {
        //     clearTokens();
        //     window.location.href = '/login';
        // }, 2000);
    }
}

// ============================================
// PROFILE ACTIONS
// ============================================

function editProfile() {
    window.location.href = '/edit-profile';
}

function viewTransactionHistory() {
    // In a real app, this would navigate to transaction history page
    console.log('View Transaction History clicked');
    showToast('Transaction History feature coming soon!', 'info');
    // window.location.href = 'transaction-history.html';
}

// Add login check at page load
if (!isLoggedIn()) {
    window.location.href = '/login';
}

function handleLogout() {
    const modal = document.getElementById('logoutModal');
    if (modal) {
        modal.classList.add('active');
    }
}

function closeLogoutModal() {
    const modal = document.getElementById('logoutModal');
    if (modal) {
        modal.classList.remove('active');
    }
}

function confirmLogout() {
    const accessToken = getAccessToken();
    const refreshToken = getRefreshToken();

    // Always clear tokens and redirect, even if API call fails
    clearTokens();

        // Show toast and redirect
        showToast('Logged out successfully', 'success');
        setTimeout(() => {
            window.location.href = '/login';
        }, 1000);
    // Try to call logout API (don't wait for it)
    if (accessToken && refreshToken) {
        logout(accessToken, refreshToken).catch(err => {
            console.error('Logout API error:', err);
        });
    }

    // Show toast and redirect
    showToast('Logged out successfully', 'success');
    setTimeout(() => {
        window.location.href = 'Login.html';
    }, 1000);
}

// ============================================
// NAVIGATION FUNCTIONS
// ============================================

function goToHome() {
    window.location.href = '/';
}

function goToAnnouncements() {
    window.location.href = '/announcements';
}

function goToFavorites() {
    window.location.href = '/favourites';
}

function goToProfile() {
    window.location.href = '/profile';
}

function goToMessages() {
    window.location.href = '/messages';
}

// ============================================
// TOAST NOTIFICATION
// ============================================

function showToast(message, type = 'success') {
    const toast = document.createElement('div');
    toast.textContent = message;

    let backgroundColor;
    switch (type) {
        case 'success':
            backgroundColor = '#27ae60';
            break;
        case 'error':
            backgroundColor = '#c84c3d';
            break;
        case 'info':
            backgroundColor = '#3498db';
            break;
        default:
            backgroundColor = '#27ae60';
    }

    toast.style.cssText = `
        position: fixed;
        bottom: 30px;
        left: 50%;
        transform: translateX(-50%);
        background: ${backgroundColor};
        color: white;
        padding: 15px 25px;
        border-radius: 25px;
        font-weight: 600;
        z-index: 10000;
        animation: slideUp 0.3s ease;
        font-family: 'Segoe UI', sans-serif;
        box-shadow: 0 8px 20px rgba(0, 0, 0, 0.2);
    `;

    document.body.appendChild(toast);

    setTimeout(() => {
        toast.style.animation = 'slideDown 0.3s ease';
        setTimeout(() => toast.remove(), 300);
    }, 3000);
}

// Add CSS animations for toast
const style = document.createElement('style');
style.textContent = `
    @keyframes slideUp {
        from {
            transform: translate(-50%, 20px);
            opacity: 0;
        }
        to {
            transform: translate(-50%, 0);
            opacity: 1;
        }
    }
    
    @keyframes slideDown {
        from {
            transform: translate(-50%, 0);
            opacity: 1;
        }
        to {
            transform: translate(-50%, 20px);
            opacity: 0;
        }
    }
`;
document.head.appendChild(style);
