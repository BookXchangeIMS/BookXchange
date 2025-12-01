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
            'access-token': accessToken,
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
    localStorage.setItem('access-token', accessToken);
    localStorage.setItem('refresh_token', refreshToken);
}

function getAccessToken() {
    return localStorage.getItem('access-token');
}

function getRefreshToken() {
    return localStorage.getItem('refresh_token');
}

function clearTokens() {
    localStorage.removeItem('access-token');
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
 * Get another user's profile (public information)
 */
async function getUserProfile(userId, accessToken) {
    const response = await fetch(`${API_BASE_URL}/api/get_profile?userid=${userId}`, {
        headers: {
            'access-token': accessToken
        }
    });

    if (!response.ok) {
        const errorText = await response.text();
        console.error('Get user profile API error:', response.status, errorText);
        throw new Error(`Failed to fetch user profile: ${response.status}`);
    }

    return await response.json();
}

/**
 * Get a user's listings
 */
async function getUserListings(userId, accessToken) {
    const response = await fetch(`${API_BASE_URL}/api/get_users_listings?user_id=${userId}`, {
        headers: {
            'access-token': accessToken
        }
    });

    if (!response.ok) {
        const errorText = await response.text();
        console.error('Get user listings API error:', response.status, errorText);
        throw new Error(`Failed to fetch user listings: ${response.status}`);
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

/**
 * Get user's favorite listings
 */
async function getMyFavorites(accessToken) {
    const response = await fetch(`${API_BASE_URL}/api/get_my_favorites`, {
        headers: {
            'access-token': accessToken
        }
    });

    if (!response.ok) {
        const errorText = await response.text();
        console.error('Get favorites API error:', response.status, errorText);
        throw new Error(`Failed to fetch favorites: ${response.status}`);
    }

    return await response.json();
}

/**
 * Get all available listings (for home page)
 */
async function getAllListings(accessToken) {
    const response = await fetch(`${API_BASE_URL}/api/get_all_listings`, {
        headers: {
            'access-token': accessToken
        }
    });

    if (!response.ok) {
        const errorText = await response.text();
        console.error('Get all listings API error:', response.status, errorText);
        throw new Error(`Failed to fetch listings: ${response.status}`);
    }

    return await response.json();
}

/**
 * Get a specific listing by ID
 */
async function getListingById(listingId, accessToken) {
    const response = await fetch(`${API_BASE_URL}/api/get_listing_by_ListingID?listing_id=${listingId}`, {
        headers: {
            'access-token': accessToken
        }
    });

    if (!response.ok) {
        const errorText = await response.text();
        console.error('Get listing API error:', response.status, errorText);
        throw new Error(`Failed to fetch listing: ${response.status}`);
    }

    return await response.json();
}

/**
 * Add a listing to favorites
 */
async function addFavorite(listingId, accessToken) {
    const response = await fetch(`${API_BASE_URL}/api/post_favorite?listing_id=${listingId}`, {
        method: 'POST',
        headers: {
            'access-token': accessToken
        }
    });

    if (!response.ok) {
        const errorText = await response.text();
        console.error('Add favorite API error:', response.status, errorText);
        throw new Error(`Failed to add favorite: ${response.status}`);
    }

    return await response.json();
}

/**
 * Remove a listing from favorites
 */
async function removeFavorite(listingId, accessToken) {
    const response = await fetch(`${API_BASE_URL}/api/delete_favorite?listing_id=${listingId}`, {
        method: 'DELETE',
        headers: {
            'access-token': accessToken
        }
    });

    if (!response.ok) {
        const errorText = await response.text();
        console.error('Remove favorite API error:', response.status, errorText);
        throw new Error(`Failed to remove favorite: ${response.status}`);
    }

    // DELETE returns 204 No Content, so no JSON to parse
    return { success: true };
}

// ============================================
// UTILITY FUNCTIONS
// ============================================

/**
 * Transform API listing data to UI-friendly format
 * This function is used across multiple pages (home, favourites, announcements)
 */
function transformListingData(listing) {
    // Format price
    const price = listing.Price ? `€${listing.Price.toFixed(2)}` : 'Free';

    // Format date
    const creationDate = new Date(listing.CreationDate);
    const now = new Date();
    const diffTime = Math.abs(now - creationDate);
    const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));

    let dateText;
    if (diffDays === 0) {
        dateText = 'Posted today';
    } else if (diffDays === 1) {
        dateText = 'Posted 1 day ago';
    } else if (diffDays < 7) {
        dateText = `Posted ${diffDays} days ago`;
    } else if (diffDays < 30) {
        const weeks = Math.floor(diffDays / 7);
        dateText = weeks === 1 ? 'Posted 1 week ago' : `Posted ${weeks} weeks ago`;
    } else {
        const months = Math.floor(diffDays / 30);
        dateText = months === 1 ? 'Posted 1 month ago' : `Posted ${months} months ago`;
    }

    // Get first author if multiple
    const author = Array.isArray(listing.Book.Author) && listing.Book.Author.length > 0
        ? listing.Book.Author[0]
        : listing.Book.Author || 'Unknown Author';

    // Image path - use listing image endpoint with access token
    const accessToken = getAccessToken();
    const imagePath = `${API_BASE_URL}/api/get_listing_primary_image?listingid=${listing.ListingID}&access_token=${accessToken}`;

    return {
        id: listing.ListingID,
        title: listing.Book.Title || 'Untitled',
        author: author,
        price: price,
        location: listing.Location.Address || 'Location not specified',
        date: dateText,
        isFavorite: listing.IsFavorite || false,
        imagePath: imagePath,
        description: listing.Description,
        condition: listing.BookCondition,
        status: listing.Status,
        sellerId: listing.User.UserID,
        sellerName: listing.User.Name
    };
}


// ============================================
// MESSAGES
// ============================================

/**
 * Get all dialogues (threads) for the current user.
 * Each item has: UserID (other user), ListingID, LastMessage{...}.
 */
async function getDialogues(accessToken) {
    const response = await fetch(`${API_BASE_URL}/api/get_dialogues`, {
        headers: {
            'access-token': accessToken
        }
    });

    if (!response.ok) {
        const errorText = await response.text();
        console.error('GetDialogues API error:', response.status, errorText);
        throw new Error(`Failed to fetch dialogues: ${response.status}`);
    }

    return await response.json();
}

/**
 * Get full dialogue with a specific user about a specific listing.
 */
async function getDialogue(otherUserId, listingId, accessToken) {
    const url = `${API_BASE_URL}/api/get_dialogue?userid=${otherUserId}&listingid=${listingId}`;
    const response = await fetch(url, {
        headers: {
            'access-token': accessToken
        }
    });

    if (!response.ok) {
        const errorText = await response.text();
        console.error('GetDialogue API error:', response.status, errorText);
        throw new Error(`Failed to fetch dialogue: ${response.status}`);
    }

    return await response.json(); // shape: { Messages: [ { MessageID, Content, SentDate, SenderID, ReceiverID, ListingID } ] }
}

/**
 * Send a new message to another user about a listing.
 */
async function sendMessageApi(receiverId, listingId, content, accessToken) {
    const params = new URLSearchParams({
        receiverid: String(receiverId),
        listingid: String(listingId),
        content: content
    });

    const response = await fetch(`${API_BASE_URL}/api/post_message?${params.toString()}`, {
        method: 'POST',
        headers: {
            'access-token': accessToken
        }
    });

    if (!response.ok) {
        const errorText = await response.text();
        console.error('PostMessage API error:', response.status, errorText);
        throw new Error(`Failed to send message: ${response.status} - ${errorText}`);
    }

    return await response.json(); // whatever post_new_message returns
}
