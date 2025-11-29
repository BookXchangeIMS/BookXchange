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
    try {
        const response = await fetch(`${API_BASE_URL}/api/logout`, {
            method: 'DELETE',
            headers: {
                'access_token': accessToken,
                'refresh_token': refreshToken
            }
        });

        if (!response.ok) {
            throw new Error(`Logout failed with status: ${response.status}`);
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
    try {
        localStorage.setItem('access_token', accessToken);
        localStorage.setItem('refresh_token', refreshToken);
    } catch (error) {
        console.error('Error saving tokens:', error);
        throw error;
    }
}

function getAccessToken() {
    try {
        return localStorage.getItem('access_token');
    } catch (error) {
        console.error('Error getting access token:', error);
        return null;
    }
}

function getRefreshToken() {
    try {
        return localStorage.getItem('refresh_token');
    } catch (error) {
        console.error('Error getting refresh token:', error);
        return null;
    }
}

function clearTokens() {
    try {
        localStorage.removeItem('access_token');
        localStorage.removeItem('refresh_token');
    } catch (error) {
        console.error('Error clearing tokens:', error);
    }
}

function isLoggedIn() {
    const token = getAccessToken();
    return !!token && token.length > 0;
}

// Optional: Add token refresh functionality
async function refreshToken() {
    try {
        const refreshToken = getRefreshToken();
        if (!refreshToken) {
            throw new Error('No refresh token available');
        }

        const response = await fetch(`${API_BASE_URL}/api/refresh`, {
            method: 'POST',
            headers: {
                'refresh_token': refreshToken
            }
        });

        if (!response.ok) {
            throw new Error('Token refresh failed');
        }

        const data = await response.json();
        saveTokens(data.access_token, refreshToken);
        return data.access_token;
    } catch (error) {
        console.error('Token refresh error:', error);
        clearTokens();
        window.location.href = 'Login.html';
        throw error;
    }
}

// ============================================
// REGISTRATION
// ============================================

/**
 * Check if user email already exists
 */
async function doesUserExist(email) {
    const response = await fetch(`${API_BASE_URL}/api/does_user_exist?email=${encodeURIComponent(email)}`);

    if (!response.ok) {
        throw new Error('Failed to check email');
    }

    const data = await response.json();
    return data.exists || false;
}

/**
 * Sign up a new user
 */
async function signUp(userData) {
    const formData = new FormData();
    formData.append('Name', userData.name);
    formData.append('Email', userData.email);
    formData.append('PasswordHash', userData.password);
    formData.append('DateOfBirth', userData.dob);  // Backend expects DateOfBirth, not DOB
    formData.append('LocationAddress', userData.location);

    const response = await fetch(`${API_BASE_URL}/api/sign_up`, {
        method: 'POST',
        body: formData
    });

    if (!response.ok) {
        const error = await response.json();
        console.error('SignUp API Error:', error);
        throw new Error(JSON.stringify(error.detail || error));
    }

    return await response.json();
}

/**
 * Save user preferences (genres)
 */
async function savePreferences(genres, accessToken) {
    const response = await fetch(`${API_BASE_URL}/api/post_preferences`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'access-token': accessToken
        },
        body: JSON.stringify(genres)  // Send array directly, not wrapped in object
    });

    if (!response.ok) {
        const error = await response.json();
        console.error('SavePreferences API Error:', error);
        throw new Error(JSON.stringify(error.detail || error));
    }

    return await response.json();
}

/**
 * Delete user account
 */
async function deleteAccount(accessToken, refreshToken) {
    const response = await fetch(`${API_BASE_URL}/api/delete_profile`, {
        method: 'DELETE',
        headers: {
            'access-token': accessToken,
            'refresh-token': refreshToken
        }
    });

    if (!response.ok) {
        const error = await response.json();
        console.error('DeleteAccount API Error:', error);
        throw new Error(JSON.stringify(error.detail || error));
    }

    return { success: true };
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
 * Update user profile
 */
async function updateProfile(profileData, accessToken) {
    const response = await fetch(`${API_BASE_URL}/api/update_profile`, {
        method: 'PUT',
        headers: {
            'Content-Type': 'application/json',
            'access-token': accessToken
        },
        body: JSON.stringify(profileData)  // Send as JSON, not FormData
    });

    if (!response.ok) {
        const error = await response.json();
        console.error('UpdateProfile API Error:', error);
        throw new Error(JSON.stringify(error.detail || error));
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
