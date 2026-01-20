// Google OAuth JavaScript Handler

/**
 * Handles Google OAuth sign-in button click
 * Redirects to backend Google OAuth login endpoint
 */
function handleGoogleLogin() {
    window.location.href = `${API_BASE_URL}/auth/google/login`;
}

/**
 * Check URL parameters for OAuth callback data
 * Called on page load to handle OAuth redirects from backend
 */
function checkOAuthCallback() {
    const urlParams = new URLSearchParams(window.location.search);
    const accessToken = urlParams.get('access_token');
    const refreshToken = urlParams.get('refresh_token');
    const error = urlParams.get('error');

    if (error) {
        // Show error message on login page
        const errorMessages = {
            'access_denied': 'Google sign-in was cancelled',
            'missing_code': 'Authentication failed - missing code',
            'oauth_failed': 'Google authentication failed. Please try again.'
        };
        alert(errorMessages[error] || `Error: ${error}`);
        // Clean URL
        window.history.replaceState({}, document.title, window.location.pathname);
        return;
    }

    if (accessToken && refreshToken) {
        // Existing user - store tokens and redirect to home
        localStorage.setItem('access_token', accessToken);
        localStorage.setItem('refresh_token', refreshToken);

        // Clean URL and redirect to home page (if not already there)
        if (window.location.pathname.includes('home.html')) {
            // Already on home page, just clean the URL
            window.history.replaceState({}, document.title, window.location.pathname);
        } else {
            // Redirect to home page
            window.location.href = './home.html';
        }
        return;
    }
}

/**
 * Initialize complete profile page
 * Reads session token and user info from URL params
 */
function initCompleteProfilePage() {
    const urlParams = new URLSearchParams(window.location.search);
    const sessionToken = urlParams.get('session_token');
    const email = urlParams.get('email');
    const name = urlParams.get('name');

    if (!sessionToken || !email) {
        alert('Invalid session. Please try signing in again.');
        window.location.href = '/login';
        return;
    }

    // Fill in the form
    document.getElementById('sessionToken').value = sessionToken;
    document.getElementById('email').value = decodeURIComponent(email);
    document.getElementById('name').value = decodeURIComponent(name || '');
}

/**
 * Handle complete profile form submission
 * @param {Event} event - Form submit event
 */
async function handleCompleteProfile(event) {
    event.preventDefault();

    const sessionToken = document.getElementById('sessionToken').value;
    const dob = document.getElementById('dob').value;
    const location = document.getElementById('location').value;
    const errorEl = document.getElementById('errorMessage');

    // Validate age (frontend check)
    const birthDate = new Date(dob);
    const today = new Date();
    const age = Math.floor((today - birthDate) / (365.25 * 24 * 60 * 60 * 1000));

    if (age < 18) {
        errorEl.textContent = 'You must be at least 18 years old to register.';
        errorEl.style.display = 'block';
        return;
    }

    // Hide previous errors
    errorEl.style.display = 'none';

    try {
        // Create form data
        const formData = new FormData();
        formData.append('session_token', sessionToken);
        formData.append('name', document.getElementById('name').value);
        formData.append('date_of_birth', dob);
        formData.append('location_address', location);

        const response = await fetch(`${API_BASE_URL}/auth/google/complete-profile`, {
            method: 'POST',
            body: formData
        });

        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.detail || 'Registration failed');
        }

        const data = await response.json();

        // Store tokens
        localStorage.setItem('access_token', data.access_token);
        localStorage.setItem('refresh_token', data.refresh_token);

        // Redirect to home
        window.location.href = './home.html';

    } catch (error) {
        errorEl.textContent = error.message || 'An error occurred. Please try again.';
        errorEl.style.display = 'block';
    }
}

// Initialize on page load if on complete profile page
if (window.location.pathname.includes('complete-google-profile')) {
    document.addEventListener('DOMContentLoaded', initCompleteProfilePage);
}

// Check for OAuth callback on login page or home page (for cross-origin redirects)
if (window.location.pathname.includes('Login.html') ||
    window.location.pathname.includes('home.html') ||
    window.location.pathname === '/') {
    document.addEventListener('DOMContentLoaded', checkOAuthCallback);
}
