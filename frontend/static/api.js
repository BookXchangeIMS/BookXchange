// API Client for Login/Logout - BookXchange
const API_BASE_URL = 'http://localhost:8000';

// ============================================
// LOGIN
// ============================================
async function signIn(email, password) {
    const formData = new FormData();
    formData.append('Email', email);
    formData.append('PasswordHash', password);

    const response = await fetch(`${API_BASE_URL}/api/sign_in`, {
        method: 'POST',
        body: formData
    });

    if (!response.ok) {
        const error = await response.json();
        throw new Error(error.detail || 'Login failed');
    }

    return await response.json();
}

// ============================================
// LOGOUT
// ============================================
async function logout(accessToken, refreshToken) {
    const response = await fetch(`${API_BASE_URL}/api/logout`, {
        method: 'DELETE',
        headers: {
            'access_token': accessToken,
            'refresh_token': refreshToken
        }
    });

    if (!response.ok) {
        throw new Error('Logout failed');
    }
}

// ============================================
// TOKEN MANAGEMENT
// ============================================
function saveTokens(accessToken, refreshToken) {
    localStorage.setItem('access_token', accessToken);
    localStorage.setItem('refresh_token', refreshToken);
}

function getAccessToken() {
    return localStorage.getItem('access_token');
}

function getRefreshToken() {
    return localStorage.getItem('refresh_token');
}

function clearTokens() {
    localStorage.removeItem('access_token');
    localStorage.removeItem('refresh_token');
}

function isLoggedIn() {
    return !!getAccessToken();
}

// ============================================
// PROFILE
// ============================================

/**
 * Get current user's profile
 */
async function getMyProfile(accessToken) {
    const response = await fetch(`${API_BASE_URL}/api/get_your_profile`, {
        headers: {
            'access-token': accessToken
        }
    });

    if (!response.ok) {
        const errorText = await response.text();
        console.error('Profile API error:', response.status, errorText);
        throw new Error(`Failed to fetch profile: ${response.status} - ${errorText}`);
    }

    return await response.json();
}

/**
 * Get user preferences (genres)
 */
async function getPreferences(accessToken) {
    const response = await fetch(`${API_BASE_URL}/api/get_preferences`, {
        headers: {
            'access-token': accessToken
        }
    });

    if (!response.ok) {
        throw new Error('Failed to fetch preferences');
    }

    return await response.json();
}
