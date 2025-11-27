// API Client for Login/Logout - BookXchange
const API_BASE_URL = 'http://localhost:8000';

// ============================================
// LOGIN
// ============================================
async function signIn(email, password) {
    try {
        const formData = new FormData();
        formData.append('Email', email);
        formData.append('PasswordHash', password);

        const response = await fetch(`${API_BASE_URL}/api/sign_in`, {
            method: 'POST',
            body: formData
        });

        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.detail || `Login failed with status: ${response.status}`);
        }

        return await response.json();
    } catch (error) {
        console.error('Login error:', error);
        throw error;
    }
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

        clearTokens();
        return true;
    } catch (error) {
        console.error('Logout error:', error);
        clearTokens();
        throw error;
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

// Optional: refresh token
async function refreshToken() {
    try {
        const refreshToken = getRefreshToken();
        if (!refreshToken) {
            throw new Error('No refresh token available');
        }

        const response = await fetch(`${API_BASE_URL}/api/refresh_access_token`, {
            method: 'GET',
            headers: {
                'token': refreshToken
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
// GET BOOKS
// ============================================
async function getBooks() {
    try {
        const accessToken = getAccessToken();
        const response = await fetch(`${API_BASE_URL}/api/get_books`, {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json',
                ...(accessToken && { 'access_token': accessToken })
            }
        });

        if (!response.ok) {
            throw new Error(`Failed to fetch books, status: ${response.status}`);
        }

        return await response.json();
    } catch (error) {
        console.error('Error fetching books:', error);
        throw error;
    }
}

// Expose for console testing if needed
window.getBooks = getBooks;