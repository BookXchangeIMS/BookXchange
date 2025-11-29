// API Configuration
const API_BASE_URL = 'http://127.0.0.1:8000';  // Changed from localhost to 127.0.0.1

const USE_MOCK_DATA = false; // Set to true for testing without backend
const MAX_IMAGES = 10;
const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB


// Token Management
function getAccessToken() {
    return localStorage.getItem('access_token');
}


function getRefreshToken() {
    return localStorage.getItem('refresh_token');
}


function setTokens(accessToken, refreshToken) {
    localStorage.setItem('access_token', accessToken);
    localStorage.setItem('refresh_token', refreshToken);
}


function clearTokens() {
    localStorage.removeItem('access_token');
    localStorage.removeItem('refresh_token');
}


// API Helper Functions
const api = {
    async post(endpoint, data) {
        if (USE_MOCK_DATA && window.mockAPI) {
            return await window.mockAPI.createBook(data);
        }

        try {
            const response = await fetch(`${API_BASE_URL}${endpoint}`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'access-token': getAccessToken() || ''
                },
                body: JSON.stringify(data)
            });

            if (response.status === 401) {
                await this.refreshAccessToken();
                return await this.post(endpoint, data);
            }

            if (!response.ok) {
                const errorData = await response.json();
                console.error('=== BACKEND ERROR ===');
                console.error('Status:', response.status);
                console.error('Error Data:', errorData);
                console.error('====================');

                // Format error message properly
                let errorMessage = 'Failed to create listing';
                if (errorData.detail) {
                    if (Array.isArray(errorData.detail)) {
                        errorMessage = errorData.detail.map(err => `${err.loc.join('.')}: ${err.msg}`).join(', ');
                    } else if (typeof errorData.detail === 'string') {
                        errorMessage = errorData.detail;
                    } else {
                        errorMessage = JSON.stringify(errorData.detail);
                    }
                }
                throw new Error(errorMessage);
            }
            return await response.json();
        } catch (error) {
            console.error('POST request failed:', error);
            throw error;
        }
    },

    // Post FormData (for file uploads) with retry logic
    async postFormData(endpoint, formData) {
        try {
            const response = await fetch(`${API_BASE_URL}${endpoint}`, {
                method: 'POST',
                headers: {
                    'access-token': getAccessToken() || ''
                },
                body: formData
            });

            if (response.status === 401) {
                await this.refreshAccessToken();
                // Retry with new token
                return await fetch(`${API_BASE_URL}${endpoint}`, {
                    method: 'POST',
                    headers: {
                        'access-token': getAccessToken() || ''
                    },
                    body: formData
                }).then(res => {
                    if (!res.ok) throw new Error('Request failed after token refresh');
                    return res.json();
                });
            }

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.detail || 'Request failed');
            }

            return await response.json();
        } catch (error) {
            console.error('FormData request failed:', error);
            throw error;
        }
    },

    // Upload multiple images
    async uploadImages(listingId, files) {
        if (USE_MOCK_DATA && window.mockAPI) {
            const uploadedUrls = [];
            for (const file of files) {
                const response = await window.mockAPI.uploadImage(file);
                uploadedUrls.push(response.imageUrl);
            }
            return { success: true, imageUrls: uploadedUrls };
        }

        try {
            // Upload images one by one using the existing endpoint
            const uploadPromises = files.map(file => {
                const formData = new FormData();
                formData.append('file', file);
                return fetch(`${API_BASE_URL}/api/post_listings_picture?listingid=${listingId}`, {
                    method: 'POST',
                    headers: {
                        'access-token': getAccessToken() || ''
                    },
                    body: formData
                });
            });

            const responses = await Promise.all(uploadPromises);

            // Check if all uploads succeeded
            for (const response of responses) {
                if (!response.ok) {
                    throw new Error('One or more image uploads failed');
                }
            }

            return { success: true };
        } catch (error) {
            console.error('Image upload failed:', error);
            throw error;
        }
    },

    // Refresh access token
    async refreshAccessToken() {
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
                clearTokens();
                window.location.href = '/login.html';
                throw new Error('Session expired. Please login again.');
            }

            const data = await response.json();
            setTokens(data.access_token, data.refresh_token);
            return data.access_token;
        } catch (error) {
            console.error('Token refresh failed:', error);
            clearTokens();
            window.location.href = '/login.html';
            throw error;
        }
    }
};


// State management
let newImages = []; // [{file, preview, tempId}]


// Initialize
document.addEventListener('DOMContentLoaded', async function () {
    // Check if user is authenticated
    if (!USE_MOCK_DATA && !getAccessToken()) {
        showToast('Please login to add a listing', 'error');
        setTimeout(() => window.location.href = '/login.html', 2000);
        return;
    }

    if (USE_MOCK_DATA) showMockModeIndicator();

    setupEventListeners();
    loadGenres(); // Load available genres
    loadUserLocation(); // Pre-fill user's location
});

// Load user's location from profile
async function loadUserLocation() {
    try {
        if (USE_MOCK_DATA) {
            // Mock location
            document.getElementById('bookLocation').value = 'Lisbon, Portugal';
            return;
        }

        const accessToken = getAccessToken();
        if (!accessToken) return;

        // Fetch user profile using get_your_profile endpoint
        const response = await fetch(`${API_BASE_URL}/api/get_your_profile`, {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json',
                'access-token': accessToken
            }
        });

        if (response.ok) {
            const userData = await response.json();
            if (userData.Location && userData.Location.Address) {
                document.getElementById('bookLocation').value = userData.Location.Address;
            }
        }
    } catch (error) {
        console.error('Error loading user location:', error);
        // Silently fail - user can still enter location manually
    }
}

// Load available genres from backend
async function loadGenres() {
    const container = document.getElementById('availableGenres');

    try {
        let genres = [];

        if (USE_MOCK_DATA) {
            // Mock genres
            genres = [
                { GenreID: 1, GenreName: "Fantasy" },
                { GenreID: 2, GenreName: "Science Fiction" },
                { GenreID: 3, GenreName: "Mystery" },
                { GenreID: 4, GenreName: "Thriller" },
                { GenreID: 5, GenreName: "Romance" },
                { GenreID: 6, GenreName: "Non-Fiction" },
                { GenreID: 7, GenreName: "History" },
                { GenreID: 8, GenreName: "Biography" },
                { GenreID: 9, GenreName: "Horror" },
                { GenreID: 10, GenreName: "Adventure" }
            ];
        } else {
            // Fetch from backend
            const response = await fetch(`${API_BASE_URL}/api/get_all_genres`);
            if (response.ok) {
                genres = await response.json();
            } else {
                console.error('Failed to fetch genres');
                container.innerHTML = '<div class="error-message">Failed to load genres</div>';
                return;
            }
        }

        // Clear loading message
        container.innerHTML = '';

        if (genres.length === 0) {
            container.innerHTML = '<div class="no-genres">No genres available</div>';
            return;
        }

        // Create checkboxes
        genres.forEach(genre => {
            const wrapper = document.createElement('div');
            wrapper.className = 'genre-checkbox-wrapper';

            const checkbox = document.createElement('input');
            checkbox.type = 'checkbox';
            checkbox.id = `genre-${genre.GenreID}`;
            checkbox.value = genre.GenreName;
            checkbox.name = 'genres';

            const label = document.createElement('label');
            label.htmlFor = `genre-${genre.GenreID}`;
            label.textContent = genre.GenreName;

            wrapper.appendChild(checkbox);
            wrapper.appendChild(label);
            container.appendChild(wrapper);
        });

    } catch (error) {
        console.error('Error loading genres:', error);
        container.innerHTML = '<div class="error-message">Error loading genres</div>';
    }
}


function showMockModeIndicator() {
    const indicator = document.createElement('div');
    indicator.textContent = '🧪 MOCK MODE';
    indicator.style.cssText = `
        position: fixed; top: 10px; right: 10px;
        background: #f39c12; color: white;
        padding: 8px 16px; border-radius: 20px;
        font-weight: 700; font-size: 12px;
        z-index: 10000; box-shadow: 0 4px 10px rgba(0, 0, 0, 0.2);
    `;
    document.body.appendChild(indicator);
}


// Setup event listeners
function setupEventListeners() {
    const uploadZone = document.getElementById('uploadZone');
    const imageInput = document.getElementById('imageInput');

    // Click to upload
    uploadZone.addEventListener('click', () => imageInput.click());
    imageInput.addEventListener('change', handleFileSelect);

    // Drag and drop
    uploadZone.addEventListener('dragover', handleDragOver);
    uploadZone.addEventListener('dragleave', handleDragLeave);
    uploadZone.addEventListener('drop', handleDrop);

    // Form events
    document.getElementById('bookDescription').addEventListener('input', updateCharacterCount);
    document.getElementById('bookPrice').addEventListener('blur', formatPrice);
    document.getElementById('addListingForm').addEventListener('submit', handleFormSubmit);
}


// Drag and drop handlers
function handleDragOver(e) {
    e.preventDefault();
    e.currentTarget.classList.add('drag-over');
}


function handleDragLeave(e) {
    e.currentTarget.classList.remove('drag-over');
}


function handleDrop(e) {
    e.preventDefault();
    e.currentTarget.classList.remove('drag-over');

    const files = Array.from(e.dataTransfer.files).filter(file => file.type.startsWith('image/'));
    if (files.length > 0) {
        processFiles(files);
    }
}


// Handle file selection
function handleFileSelect(e) {
    const files = Array.from(e.target.files);
    processFiles(files);
    e.target.value = ''; // Reset input
}


// Process and validate files
function processFiles(files) {
    const currentTotal = newImages.length;
    const availableSlots = MAX_IMAGES - currentTotal;

    if (availableSlots <= 0) {
        showToast(`Maximum ${MAX_IMAGES} images allowed`, 'error');
        return;
    }

    const filesToProcess = files.slice(0, availableSlots);

    filesToProcess.forEach(file => {
        // Validate file type
        if (!file.type.startsWith('image/')) {
            showToast(`${file.name} is not an image file`, 'error');
            return;
        }

        // Validate file size
        if (file.size > MAX_FILE_SIZE) {
            showToast(`${file.name} exceeds 10MB limit`, 'error');
            return;
        }

        // Create preview
        const reader = new FileReader();
        reader.onload = (e) => {
            newImages.push({
                file: file,
                preview: e.target.result,
                tempId: Date.now() + Math.random()
            });
            renderImagePreviews();
        };
        reader.readAsDataURL(file);
    });

    if (filesToProcess.length < files.length) {
        showToast(`Only ${filesToProcess.length} images added (${MAX_IMAGES} max)`, 'error');
    }
}


// Render image preview grid
function renderImagePreviews() {
    const grid = document.getElementById('imagePreviewGrid');
    grid.innerHTML = '';

    const totalImages = newImages.length;

    // Render new images
    newImages.forEach((img, index) => {
        grid.appendChild(createImagePreviewElement(img, index));
    });

    // Update counter
    updateImageCounter(totalImages);
}


// Create image preview element
function createImagePreviewElement(img, index) {
    const div = document.createElement('div');
    div.className = 'image-preview-item';

    const isPrimary = index === 0; // First image is primary
    if (isPrimary) div.classList.add('primary');

    div.innerHTML = `
        ${isPrimary ? '<span class="primary-badge">Primary</span>' : ''}
        <img src="${img.preview}" alt="Preview">
        <div class="image-preview-overlay">
            ${!isPrimary ? `
                <button type="button" class="overlay-btn primary" title="Set as primary">
                    <i class="fas fa-star"></i>
                </button>
            ` : ''}
            <button type="button" class="overlay-btn delete" title="Delete">
                <i class="fas fa-trash"></i>
            </button>
        </div>
    `;

    // Event listeners
    const primaryBtn = div.querySelector('.overlay-btn.primary');
    const deleteBtn = div.querySelector('.overlay-btn.delete');

    if (primaryBtn) {
        primaryBtn.addEventListener('click', () => handleSetPrimary(index));
    }

    deleteBtn.addEventListener('click', () => handleDeleteImage(index));

    return div;
}


// Set primary image
function handleSetPrimary(index) {
    const [selectedImage] = newImages.splice(index, 1);
    newImages.unshift(selectedImage);
    renderImagePreviews();
    showToast('Primary image updated', 'success');
}


// Delete image
function handleDeleteImage(index) {
    if (!confirm('Delete this image?')) return;

    newImages.splice(index, 1);
    renderImagePreviews();
    showToast('Image removed', 'success');
}


// Update image counter
function updateImageCounter(count) {
    const grid = document.getElementById('imagePreviewGrid');
    let counter = grid.querySelector('.image-counter');

    if (!counter) {
        counter = document.createElement('div');
        counter.className = 'image-counter';
        grid.appendChild(counter);
    }

    counter.textContent = `${count} / ${MAX_IMAGES} images`;
    counter.classList.toggle('limit', count >= MAX_IMAGES);
}


// Character count for description
function updateCharacterCount() {
    const description = document.getElementById('bookDescription').value;
    const charCount = document.getElementById('charCount');
    const length = description.length;
    const maxLength = 500;

    charCount.textContent = length;

    if (length > maxLength) {
        charCount.style.color = '#e74c3c';
    } else if (length > maxLength * 0.9) {
        charCount.style.color = '#f39c12';
    } else {
        charCount.style.color = '#999';
    }
}


// Format price
function formatPrice(event) {
    let value = event.target.value.trim().replace(/[\$\s]/g, '');
    const number = parseFloat(value);

    if (!isNaN(number) && number >= 0) {
        event.target.value = '$' + number.toFixed(2);
    } else if (value !== '') {
        event.target.value = '$0.00';
    }
}


// Validate form
function validateForm() {
    const errors = [];

    if (newImages.length === 0) {
        errors.push('Please add at least one image');
    }

    const title = document.getElementById('bookTitle').value.trim();
    if (title.length < 3) errors.push('Title must be at least 3 characters');

    const author = document.getElementById('bookAuthor').value.trim();
    if (author.length < 2) errors.push('Author name must be at least 2 characters');

    const price = document.getElementById('bookPrice').value.trim();
    const priceValue = parseFloat(price.replace('$', ''));
    if (isNaN(priceValue) || priceValue < 0) errors.push('Please enter a valid price');

    const condition = document.getElementById('bookCondition').value;
    if (!condition) errors.push('Please select a condition');

    const location = document.getElementById('bookLocation').value.trim();
    if (location.length < 3) errors.push('Location must be at least 3 characters');

    if (errors.length > 0) {
        showToast(errors[0], 'error');
        return false;
    }

    return true;
}


// Handle form submission - FIXED TO MATCH BACKEND
// Handle form submission - FIXED TO MATCH BACKEND
async function handleFormSubmit(event) {
    event.preventDefault();
    event.stopPropagation();

    console.log('🚀 Form submission started'); // Debug log

    if (!validateForm()) return;

    const submitButton = event.target.querySelector('button[type="submit"]');
    const originalButtonText = submitButton.innerHTML;
    submitButton.disabled = true;
    submitButton.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Submitting...';

    try {
        // Helper: Split comma-separated string into array
        const toArray = (str) => {
            if (!str) return [];
            return str.split(',').map(s => s.trim()).filter(s => s.length > 0);
        };

        // Prepare data matching PostListing model
        // Collect selected genres
        const selectedGenres = Array.from(document.querySelectorAll('input[name="genres"]:checked'))
            .map(checkbox => checkbox.value);
        const author = document.getElementById('bookAuthor').value.trim();
        const authorsArray = toArray(author);
        const year = document.getElementById('bookYear').value.trim();

        // Prepare data matching PostListing model
        const newListingData = {
            ListingType: "Sale",
            Status: "Active",
            Description: document.getElementById('bookDescription').value.trim() || "No description provided",
            Price: parseFloat(document.getElementById('bookPrice').value.replace('$', '')),
            BookCondition: document.getElementById('bookCondition').value,
            LocationAddress: document.getElementById('bookLocation').value.trim(),
            Book: {
                Title: document.getElementById('bookTitle').value.trim(),
                Language: "English",
                ReleaseDate: year ? `${year}-01-01` : "2024-01-01",
                ISBN: `TEMP-${Date.now()}`,
                AvgRating: 0.0,
                Edition: 1,
                Author: authorsArray,
                Genre: selectedGenres // Use the collected array of selected genres
            }
        };

        console.log('=== SENDING TO BACKEND ===');
        console.log(JSON.stringify(newListingData, null, 2));
        console.log('==========================');

        const createResponse = await api.post('/api/post_listing', newListingData);
        const listingId = createResponse.ListingID;

        console.log('✅ Listing created with ID:', listingId);

        // 2. Upload images (but don't let failures stop the redirect)
        if (newImages.length > 0 && listingId) {
            try {
                const files = newImages.map(img => img.file);
                await api.uploadImages(listingId, files);
                console.log('✅ Images uploaded successfully');
            } catch (uploadError) {
                console.warn('⚠️ Image upload failed:', uploadError);
                // Don't throw - just log it and continue
            }
        }

        showToast('Listing created successfully!', 'success');

        // Always redirect after a short delay
        console.log('🔄 Redirecting to announcements page...');
        setTimeout(() => {
            window.location.href = 'Announcements.html';
        }, 1000);

    } catch (error) {
        console.error('❌ FULL ERROR:', error);
        console.error('Error stack:', error.stack);
        showToast(error.message || 'Failed to create listing', 'error');
        submitButton.disabled = false;
        submitButton.innerHTML = originalButtonText;
    }
}


// Handle AI Book Scan
async function handleScanBook(event) {
    const file = event.target.files[0];
    if (!file) return;

    // Reset input
    event.target.value = '';

    if (!file.type.startsWith('image/')) {
        showToast('Please select an image file', 'error');
        return;
    }

    const btn = document.querySelector('.scan-btn-prominent');
    const originalContent = btn.innerHTML;
    btn.disabled = true;
    btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Scanning...';

    try {

        const formData = new FormData();
        formData.append('file', file);

        // Use api.postFormData to handle 401 retries automatically
        const data = await api.postFormData('/api/scan_book', formData);

        console.log('AI Result:', data);

        if (data.error) {
            throw new Error(data.error);
        }

        // Populate fields
        if (data.Title) document.getElementById('bookTitle').value = data.Title;
        if (data.Author) document.getElementById('bookAuthor').value = data.Author;
        if (data.Condition) {
            const conditionSelect = document.getElementById('bookCondition');
            // Try to match condition
            for (let i = 0; i < conditionSelect.options.length; i++) {
                if (conditionSelect.options[i].value.toLowerCase() === data.Condition.toLowerCase()) {
                    conditionSelect.selectedIndex = i;
                    break;
                }
            }
        }
        if (data.Genre) {
            // Uncheck all first
            document.querySelectorAll('input[name="genres"]').forEach(cb => cb.checked = false);

            // Check matching genres
            const genres = Array.isArray(data.Genre) ? data.Genre : data.Genre.split(',').map(g => g.trim());
            genres.forEach(genreName => {
                const checkbox = Array.from(document.querySelectorAll('input[name="genres"]'))
                    .find(cb => cb.value.toLowerCase() === genreName.toLowerCase());
                if (checkbox) checkbox.checked = true;
            });
        }
        if (data.Year) document.getElementById('bookYear').value = data.Year;
        if (data.Description) document.getElementById('bookDescription').value = data.Description;

        // Update char count
        updateCharacterCount();

        showToast('Book details filled by AI!', 'success');

        // Also add the image to the preview list
        processFiles([file]);

    } catch (error) {
        console.error('Scan failed:', error);
        showToast('Failed to scan book: ' + error.message, 'error');
    } finally {
        btn.disabled = false;
        btn.innerHTML = originalContent;
    }
}


// Show cancel confirmation modal
function showCancelModal() {
    const modal = document.getElementById('cancelModal');
    modal.classList.add('active');
}

// Close cancel modal
function closeCancelModal() {
    const modal = document.getElementById('cancelModal');
    modal.classList.remove('active');
}

// Confirm cancel and redirect
function confirmCancel() {
    window.location.href = 'announcements.html';
}


// Toast notification
function showToast(message, type = 'success') {
    const toast = document.createElement('div');
    toast.textContent = message;
    toast.style.cssText = `
        position: fixed; bottom: 30px; left: 50%; transform: translateX(-50%);
        background: ${type === 'success' ? '#27ae60' : type === 'warning' ? '#f39c12' : '#e74c3c'};
        color: white; padding: 15px 25px; border-radius: 25px;
        font-weight: 600; z-index: 10000; animation: slideUp 0.3s ease;
        font-family: 'Segoe UI', sans-serif; max-width: 90%;
        text-align: center; box-shadow: 0 4px 15px rgba(0, 0, 0, 0.2);
    `;

    document.body.appendChild(toast);

    setTimeout(() => {
        toast.style.animation = 'slideDown 0.3s ease';
        setTimeout(() => toast.remove(), 300);
    }, 3000);
}


// Animations
const style = document.createElement('style');
style.textContent = `
    @keyframes slideUp {
        from { transform: translate(-50%, 20px); opacity: 0; }
        to { transform: translate(-50%, 0); opacity: 1; }
    }
    @keyframes slideDown {
        from { transform: translate(-50%, 0); opacity: 1; }
        to { transform: translate(-50%, 20px); opacity: 0; }
    }
    .fa-spinner { animation: spin 1s linear infinite; }
    @keyframes spin {
        from { transform: rotate(0deg); }
        to { transform: rotate(360deg); }
    }
`;
document.head.appendChild(style);
