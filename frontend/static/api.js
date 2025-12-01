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


// ============================================
// TRANSACTIONS
// ============================================

/**
 * Get transaction history for authenticated user
 */
/**
 * Get transaction history for authenticated user
 */
/**
 * Get transaction history for authenticated user
 */
async function getTransactionHistory(accessToken) {
    const response = await fetch(`${API_BASE_URL}/api/get_transaction_history/`, {
        method: 'GET',
        headers: {
            'access-token': accessToken
        }
    });

    if (!response.ok) {
        // If 404, return empty array instead of throwing error
        if (response.status === 404) {
            return [];
        }
        
        const error = await response.json();
        console.error('Transaction History API Error:', error);
        throw new Error(JSON.stringify(error.detail || error));
    }

    return await response.json();
}

