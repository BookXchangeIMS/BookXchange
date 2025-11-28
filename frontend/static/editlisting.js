// API Configuration
const API_BASE_URL = 'http://localhost:8000';
const USE_MOCK_DATA = false; // Change to false for backend
const MAX_IMAGES = 10;
const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB

// Get books from localStorage (shared with announcements page)
function getBooksDatabase() {
    const stored = localStorage.getItem('MOCK_USER_BOOKS');
    if (stored) {
        return JSON.parse(stored);
    }
    // Default books if nothing in storage
    const defaultBooks = {
        101: {
            ListingID: 101,
            Name: "Harry Potter and the Sorcerer's Stone",
            author: "J.K. Rowling",
            price: "$18.25",
            PublicationDate: "1997",
            condition: "Good",
            Location: "Benfica - Lisboa",
            genres: "Fantasy, Adventure",
            description: "A magical journey begins at Hogwarts! Follow Harry Potter as he discovers his true identity and battles the forces of darkness.",
            Image_Path: "../static/resources/harrypotter.png"
        },
        102: {
            ListingID: 102,
            Name: "The Lord of the Rings: The Fellowship of the Ring (First Edition)",
            author: "J.R.R. Tolkien",
            price: "$45.00",
            PublicationDate: "1954",
            condition: "Almost new",
            Location: "Benfica - Lisboa",
            genres: "Fantasy, Adventure",
            description: "A classic masterpiece by J.R.R. Tolkien! This book will take you on an unforgettable journey through Middle-earth.",
            Image_Path: "../static/resources/lotr.png"
        },
        103: {
            ListingID: 103,
            Name: "Sapiens: A Brief History of Humankind",
            author: "Yuval Noah Harari",
            price: "$15.00",
            PublicationDate: "2011",
            condition: "Good",
            Location: "Benfica - Lisboa",
            genres: "Non-fiction, History",
            description: "Explore the history of humankind from the Stone Age to the modern era in this thought-provoking book.",
            Image_Path: "../static/resources/sapiens.png"
        }
    };
    localStorage.setItem('MOCK_USER_BOOKS', JSON.stringify(defaultBooks));
    return defaultBooks;
}

// Save books to localStorage
function saveBooksDatabase(books) {
    localStorage.setItem('MOCK_USER_BOOKS', JSON.stringify(books));
}

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
    async get(endpoint) {
        if (USE_MOCK_DATA) {
            // Mock API - use localStorage
            const id = parseInt(endpoint.split('/').pop());
            const booksDB = getBooksDatabase();
            const book = booksDB[id];
            if (!book) {
                throw new Error('Book not found');
            }
            return { data: book };
        }

        try {
            // Use backend endpoint: /api/get_listing_by_ListingID
            const listingId = endpoint.split('/').pop();
            const response = await fetch(`${API_BASE_URL}/api/get_listing_by_ListingID?listing_id=${listingId}`, {
                method: 'GET',
                headers: {
                    'Content-Type': 'application/json',
                    'access-token': getAccessToken() || ''
                }
            });

            if (response.status === 401) {
                await this.refreshAccessToken();
                return await this.get(endpoint);
            }

            if (!response.ok) throw new Error(`HTTP error! Status: ${response.status}`);

            const data = await response.json();

            // Helper function to extract year from date string
            const extractYear = (dateString) => {
                if (!dateString) return '';
                if (dateString.includes('T')) {
                    return dateString.split('T')[0].split('-')[0];
                }
                return dateString.split('-')[0];
            };

            // Transform backend response to match frontend format
            return {
                data: {
                    ListingID: data.ListingID,
                    BookID: data.Book.BookID,
                    ISBN: data.Book.ISBN || "",
                    Name: data.Book.Title,
                    author: Array.isArray(data.Book.Author) ? data.Book.Author.join(', ') : data.Book.Author,
                    price: `$${parseFloat(data.Price).toFixed(2)}`,
                    PublicationDate: extractYear(data.Book.ReleaseDate),
                    BookCondition: data.BookCondition,
                    Location: data.Location.Address,
                    genres: Array.isArray(data.Book.Genre) ? data.Book.Genre.join(', ') : data.Book.Genre,
                    description: data.Description,
                    Image_Path: data.Book.Image_Path || "../static/resources/harrypotter.png",
                    images: []
                }
            };
        } catch (error) {
            console.error('GET request failed:', error);
            throw error;
        }
    },

    async put(endpoint, data) {
        if (USE_MOCK_DATA) {
            // Mock API - update localStorage
            const id = parseInt(endpoint.split('/').pop());
            const booksDB = getBooksDatabase();
            if (booksDB[id]) {
                booksDB[id] = { ...booksDB[id], ...data };
                saveBooksDatabase(booksDB);
                return { success: true, data: booksDB[id] };
            }
            throw new Error('Book not found');
        }

        try {
            console.log('=== SENDING UPDATE DATA TO BACKEND ===');
            console.log(JSON.stringify(data, null, 2));
            console.log('======================================');

            const response = await fetch(`${API_BASE_URL}/api/update_listing`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    'access-token': getAccessToken() || ''
                },
                body: JSON.stringify(data)
            });

            if (response.status === 401) {
                await this.refreshAccessToken();
                return await this.put(endpoint, data);
            }

            if (!response.ok) {
                const errorData = await response.json();
                console.error('=== BACKEND ERROR RESPONSE ===');
                console.error(errorData);
                console.error('==============================');
                throw new Error(errorData.detail || `HTTP error! Status: ${response.status}`);
            }
            return await response.json();
        } catch (error) {
            console.error('PUT request failed:', error);
            throw error;
        }
    },

    async delete(endpoint) {
        if (USE_MOCK_DATA) {
            // Mock API - delete from localStorage
            const id = parseInt(endpoint.split('/').pop());
            const booksDB = getBooksDatabase();
            if (booksDB[id]) {
                delete booksDB[id];
                saveBooksDatabase(booksDB);
                return { success: true, message: 'Deleted successfully' };
            }
            throw new Error('Book not found');
        }

        try {
            // Use backend endpoint: /api/delete_listing
            const listingId = endpoint.split('/').pop();
            const response = await fetch(`${API_BASE_URL}/api/delete_listing?listing_id=${listingId}`, {
                method: 'DELETE',
                headers: {
                    'Content-Type': 'application/json',
                    'access-token': getAccessToken() || ''
                }
            });

            if (response.status === 401) {
                await this.refreshAccessToken();
                return await this.delete(endpoint);
            }

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.detail || `HTTP error! Status: ${response.status}`);
            }

            // 204 No Content doesn't have a body
            if (response.status === 204) {
                return { success: true, message: 'Deleted successfully' };
            }

            return await response.json();
        } catch (error) {
            console.error('DELETE request failed:', error);
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

// Get listing ID from URL
const urlParams = new URLSearchParams(window.location.search);
const listingId = parseInt(urlParams.get('id'));

// State management
let book = null;
let existingImages = []; // [{photoId, imagePath, isPrimary}]
let newImages = []; // [{file, preview, tempId}]
let deletedImageIds = [];

// Initialize
document.addEventListener('DOMContentLoaded', async function () {
    // Check if user is authenticated
    if (!USE_MOCK_DATA && !getAccessToken()) {
        showToast('Please login to edit listings', 'error');
        setTimeout(() => window.location.href = '/login.html', 2000);
        return;
    }

    if (USE_MOCK_DATA) showMockModeIndicator();

    if (!listingId || isNaN(listingId)) {
        showToast('Invalid listing ID', 'error');
        setTimeout(() => window.location.href = 'announcements.html', 2000);
        return;
    }

    try {
        await fetchListingDetails(listingId);
        setupEventListeners();
    } catch (error) {
        console.error('Error loading listing:', error);
        showToast('Failed to load listing details', 'error');
        setTimeout(() => window.location.href = 'announcements.html', 2000);
    }
});

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

// Fetch listing details including images
async function fetchListingDetails(id) {
    try {
        showToast('Loading listing details...', 'success');
        const response = await api.get(`/api/listings/${id}`);
        book = response.data || response;

        console.log('=== DATA RETURNED FROM BACKEND ===');
        console.log(JSON.stringify(book, null, 2));
        console.log('===================================');

        // Fetch ALL images from backend
        try {
            const accessToken = getAccessToken();
            const imagesResponse = await fetch(`${API_BASE_URL}/api/get_listing_images_urls?listingid=${id}&access_token=${accessToken}`, {
                method: 'GET',
                headers: {
                    'Content-Type': 'application/json'
                }
            });

            if (imagesResponse.ok) {
                const imagesData = await imagesResponse.json();
                // Convert to format expected by frontend
                existingImages = imagesData.map(img => ({
                    photoId: img.photoId,
                    imagePath: `${API_BASE_URL}${img.imageUrl}`,
                    isPrimary: img.isPrimary
                }));
            } else {
                console.warn('No images found for this listing');
                existingImages = [];
            }
        } catch (imgError) {
            console.warn('Failed to load images:', imgError);
            existingImages = [];
        }

        console.log('Loaded listing:', book);
        console.log('Existing images:', existingImages);

        loadListingDetailsIntoForm(book);
        renderImagePreviews();
        showToast('Listing loaded successfully', 'success');
    } catch (error) {
        console.error('Failed to fetch listing details:', error);
        throw error;
    }
}

// Load form fields
function loadListingDetailsIntoForm(book) {
    document.getElementById('bookTitle').value = book.Name || book.title || '';

    // Handle author (could be array or string)
    let authorValue = book.author || '';
    if (Array.isArray(authorValue)) {
        authorValue = authorValue.join(', ');
    }
    document.getElementById('bookAuthor').value = authorValue;

    document.getElementById('bookPrice').value = book.price || '';

    // Handle publication date - extract year only
    let year = book.PublicationDate || book.year || book.publication_year || book.releaseDate || '';
    if (year.includes('T') || year.includes('-')) {
        year = year.split('T')[0].split('-')[0];
    }
    document.getElementById('bookYear').value = year;

    document.getElementById('bookCondition').value = book.BookCondition || '';
    document.getElementById('bookLocation').value = book.Location || book.location || '';

    // Handle genres (could be array or string)
    let genresValue = book.genres || '';
    if (Array.isArray(genresValue)) {
        genresValue = genresValue.join(', ');
    }
    document.getElementById('bookGenres').value = genresValue;

    document.getElementById('bookDescription').value = book.description || '';
    updateCharacterCount();
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
    document.getElementById('editListingForm').addEventListener('submit', handleFormSubmit);
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
    const currentTotal = existingImages.length + newImages.length;
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

    const totalImages = existingImages.length + newImages.length;

    // Render existing images
    existingImages.forEach((img, index) => {
        grid.appendChild(createImagePreviewElement(img, 'existing', index));
    });

    // Render new images
    newImages.forEach((img, index) => {
        grid.appendChild(createImagePreviewElement(img, 'new', index));
    });

    // Update counter
    updateImageCounter(totalImages);
}

// Create image preview element
function createImagePreviewElement(img, type, index) {
    const div = document.createElement('div');
    div.className = 'image-preview-item';

    const isPrimary = type === 'existing' && img.isPrimary;
    if (isPrimary) div.classList.add('primary');

    const imgSrc = type === 'existing' ? img.imagePath : img.preview;

    div.innerHTML = `
        ${isPrimary ? '<span class="primary-badge">Primary</span>' : ''}
        <img src="${imgSrc}" alt="Preview">
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
        primaryBtn.addEventListener('click', () => handleSetPrimary(type, index));
    }

    deleteBtn.addEventListener('click', () => handleDeleteImage(type, index));

    return div;
}

// Set primary image
function handleSetPrimary(type, index) {
    if (type === 'existing') {
        existingImages.forEach((img, i) => {
            img.isPrimary = (i === index);
        });
    } else {
        existingImages.forEach(img => img.isPrimary = false);
        const [selectedImage] = newImages.splice(index, 1);
        newImages.unshift(selectedImage);
    }

    renderImagePreviews();
    showToast('Primary image updated', 'success');
}

// Delete image
function handleDeleteImage(type, index) {
    if (!confirm('Delete this image?')) return;

    if (type === 'existing') {
        const deletedImage = existingImages.splice(index, 1)[0];
        deletedImageIds.push(deletedImage.photoId);

        if (deletedImage.isPrimary && existingImages.length > 0) {
            existingImages[0].isPrimary = true;
        }
    } else {
        newImages.splice(index, 1);
    }

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

// Handle form submission - FIXED TO GET NEW VALUES FROM FORM
async function handleFormSubmit(event) {
    event.preventDefault();

    if (!validateForm()) return;

    const submitButton = event.target.querySelector('button[type="submit"]');
    const originalButtonText = submitButton.innerHTML;
    submitButton.disabled = true;
    submitButton.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Saving...';

    try {
        // Helper to convert comma-separated string to array
        const toArray = (str) => {
            if (!str) return [];
            return str.split(',').map(s => s.trim()).filter(s => s.length > 0);
        };

        // Get NEW values from form (not old book data!)
        const genres = document.getElementById('bookGenres').value.trim();
        const genresArray = toArray(genres);
        const author = document.getElementById('bookAuthor').value.trim();
        const authorsArray = toArray(author);
        const year = document.getElementById('bookYear').value.trim();
        const priceValue = document.getElementById('bookPrice').value || '';
        const priceNumber = parseFloat(priceValue.replace('$', '').trim()) || 0;

        const updatedListingData = {
            ListingID: listingId,
            BookID: book.BookID,
            ListingType: "Sale",
            Status: "Active",
            Description: document.getElementById('bookDescription').value.trim(),
            Price: priceNumber,
            BookCondition: document.getElementById('bookCondition').value,
            LocationAddress: document.getElementById('bookLocation').value.trim(),
            Book: {
                Title: document.getElementById('bookTitle').value.trim(),  // ✅ NEW value from form
                Language: "English",
                ReleaseDate: year ? `${year}-01-01` : "2024-01-01",
                ISBN: book.ISBN || `TEMP-${Date.now()}`,
                AvgRating: 0,
                Edition: 1,
                Author: authorsArray,  // ✅ NEW value from form
                Genre: genresArray      // ✅ NEW value from form
            }
        };

        console.log('=== SENDING UPDATE DATA TO BACKEND ===');
        console.log(JSON.stringify(updatedListingData, null, 2));
        console.log('======================================');

        showToast('Updating listing...', 'success');

        const response = await api.put(`/api/listings/${listingId}`, updatedListingData);

        console.log('✅ Update response:', response);

        // Handle deleted images first
        if (deletedImageIds.length > 0) {
            try {
                showToast(`Deleting ${deletedImageIds.length} image(s)...`, 'success');
                for (const photoId of deletedImageIds) {
                    const deleteResponse = await fetch(`${API_BASE_URL}/api/delete_listing_image/${photoId}`, {
                        method: 'DELETE',
                        headers: {
                            'access-token': getAccessToken() || ''
                        }
                    });

                    if (!deleteResponse.ok) {
                        console.warn(`Failed to delete image ${photoId}`);
                    }
                }
                console.log('✅ Images deleted successfully');
            } catch (deleteError) {
                console.warn('⚠️ Image deletion failed:', deleteError);
            }
        }

        // Handle new images if any
        if (newImages.length > 0) {
            try {
                showToast(`Uploading ${newImages.length} image(s)...`, 'success');
                const files = newImages.map(img => img.file);

                // Upload images one by one
                for (let i = 0; i < files.length; i++) {
                    const formData = new FormData();
                    formData.append('file', files[i]);

                    const uploadResponse = await fetch(`${API_BASE_URL}/api/post_listings_picture?listingid=${listingId}`, {
                        method: 'POST',
                        headers: {
                            'access-token': getAccessToken() || ''
                        },
                        body: formData
                    });

                    if (!uploadResponse.ok) {
                        console.warn(`Failed to upload image ${i + 1}`);
                    }
                }
                console.log('✅ Images uploaded successfully');
            } catch (uploadError) {
                console.warn('⚠️ Image upload failed:', uploadError);
            }
        }

        showToast('Listing updated successfully!', 'success');

        setTimeout(() => {
            window.location.href = 'announcements.html';
        }, 1500);

    } catch (error) {
        console.error('❌ Failed to update listing:', error);
        showToast(error.message || 'Failed to update listing', 'error');
        submitButton.disabled = false;
        submitButton.innerHTML = originalButtonText;
    }
}

// Confirm delete
async function confirmDelete() {
    console.log('confirmDelete called for listing:', listingId);

    const confirmation = confirm('Are you sure you want to delete this listing? This action cannot be undone.');
    if (!confirmation) {
        console.log('User cancelled first confirmation');
        return;
    }

    const doubleCheck = confirm('This will permanently delete your listing. Are you absolutely sure?');
    if (!doubleCheck) {
        console.log('User cancelled second confirmation');
        return;
    }

    try {
        console.log('Starting delete process...');
        const response = await api.delete(`/api/listings/${listingId}`);
        console.log('Delete response:', response);
        showToast('Listing deleted successfully', 'success');

        setTimeout(() => {
            console.log('Redirecting to announcements...');
            window.location.href = 'announcements.html';
        }, 1500);
    } catch (error) {
        console.error('Failed to delete listing:', error);
        showToast(error.message || 'Failed to delete listing', 'error');
    }
}

// Toast notification
function showToast(message, type = 'success') {
    const toast = document.createElement('div');
    toast.textContent = message;
    toast.style.cssText = `
        position: fixed; bottom: 30px; left: 50%; transform: translateX(-50%);
        background: ${type === 'success' ? '#27ae60' : '#e74c3c'};
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
