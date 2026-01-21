/**
 * Shared Utility Functions for BookXchange Frontend
 * Centralized utilities to eliminate code duplication
 */

/**
 * Display a toast notification
 * @param {string} message - Message to display
 * @param {string} type - Type of toast ('success' or 'error')
 */
function showToast(message, type = 'success') {
    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    toast.textContent = message;
    toast.style.cssText = `
        position: fixed;
        bottom: 100px;
        left: 50%;
        transform: translateX(-50%);
        background: ${type === 'success' ? '#27ae60' : '#c84c3d'};
        color: white;
        padding: 15px 25px;
        border-radius: 25px;
        font-weight: 600;
        z-index: 10000;
        animation: slideUp 0.3s ease;
        font-family: 'Segoe UI', sans-serif;
        box-shadow: 0 4px 15px rgba(0, 0, 0, 0.2);
        max-width: 90%;
        text-align: center;
    `;

    document.body.appendChild(toast);

    setTimeout(() => {
        toast.style.animation = 'slideDown 0.3s ease';
        setTimeout(() => toast.remove(), 300);
    }, 3000);
}

/**
 * Display an error message in a container
 * @param {string} message - Error message to display
 * @param {HTMLElement} container - Container element to display error in
 * @param {Function} retryCallback - Optional callback function for retry button
 */
function showError(message, container, retryCallback = null) {
    if (!container) return;

    const retryButton = retryCallback
        ? `<button onclick="${retryCallback.name}()" style="margin-top: 20px; padding: 12px 30px; background: #c84c3d; color: white; border: none; border-radius: 25px; cursor: pointer; font-weight: 600; font-family: 'Segoe UI', sans-serif;">
                Try Again
           </button>`
        : '';

    container.style.display = 'grid';
    container.innerHTML = `
        <div class="error-state" style="grid-column: 1/-1; text-align: center; padding: 60px 20px;">
            <i class="fas fa-exclamation-circle" style="font-size: 48px; color: #c84c3d; margin-bottom: 20px;"></i>
            <p style="color: #666; font-size: 18px;">${message}</p>
            ${retryButton}
        </div>
    `;
}

/**
 * Apply fade-in animation to an element
 * @param {HTMLElement} element - Element to animate
 * @param {number} delay - Delay in milliseconds before animation starts
 */
function fadeInAnimation(element, delay = 0) {
    element.style.opacity = '0';
    element.style.transform = 'translateY(20px)';
    element.style.transition = 'all 0.6s ease';

    setTimeout(() => {
        element.style.opacity = '1';
        element.style.transform = 'translateY(0)';

        // Clean up inline styles after animation
        setTimeout(() => {
            element.style.opacity = '';
            element.style.transform = '';
            element.style.transition = '';
        }, 600);
    }, delay);
}

/**
 * Apply staggered fade-in animation to multiple elements
 * @param {NodeList|Array} elements - Elements to animate
 * @param {number} staggerDelay - Delay between each element in milliseconds
 */
function staggeredFadeIn(elements, staggerDelay = 100) {
    elements.forEach((element, index) => {
        fadeInAnimation(element, index * staggerDelay);
    });
}

/**
 * Escape HTML to prevent XSS attacks
 * @param {string} unsafe - Unsafe string that may contain HTML
 * @returns {string} - Escaped string safe for HTML insertion
 */
function escapeHtml(unsafe) {
    if (!unsafe) return '';
    return unsafe
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
}

/**
 * Format an array as a comma-separated string
 * @param {Array|string} arr - Array to format or string to return as-is
 * @returns {string} - Formatted string
 */
function formatArray(arr) {
    if (!arr) return '';
    if (Array.isArray(arr)) {
        return arr.join(', ');
    }
    return arr;
}

/**
 * Extract year from a date string
 * @param {string} dateString - Date string in various formats
 * @returns {string} - Year as string
 */
function extractYear(dateString) {
    if (!dateString) return '';
    // Handle formats like "1902-01-01T00:00:00" or "2024-01-01"
    if (dateString.includes('T')) {
        return dateString.split('T')[0].split('-')[0];
    }
    if (dateString.includes('-')) {
        return dateString.split('-')[0];
    }
    return dateString; // Already just a year
}

/**
 * Format a date as relative time (e.g., "Posted 2 days ago")
 * @param {string|Date} date - Date to format
 * @returns {string} - Formatted relative time string
 */
function formatRelativeTime(date) {
    const creationDate = typeof date === 'string' ? new Date(date) : date;
    const now = new Date();
    const diffTime = Math.abs(now - creationDate);
    const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays === 0) {
        return 'Posted today';
    } else if (diffDays === 1) {
        return 'Posted 1 day ago';
    } else if (diffDays < 7) {
        return `Posted ${diffDays} days ago`;
    } else if (diffDays < 30) {
        const weeks = Math.floor(diffDays / 7);
        return weeks === 1 ? 'Posted 1 week ago' : `Posted ${weeks} weeks ago`;
    } else {
        const months = Math.floor(diffDays / 30);
        return months === 1 ? 'Posted 1 month ago' : `Posted ${months} months ago`;
    }
}

/**
 * Debounce function to limit how often a function can be called
 * @param {Function} func - Function to debounce
 * @param {number} wait - Wait time in milliseconds
 * @returns {Function} - Debounced function
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

// Navigation functions
function goToHome() {
    window.location.href = 'home.html';
}

function goToMessages() {
    window.location.href = 'messages.html';
}

function goToProfile() {
    window.location.href = 'profile.html';
}

function goToLeaderboard() {
    window.location.href = 'leaderboard.html';
}

function goToUserProfile(userId) {
    // Navigate to the profile page of another user (by ID)
    window.location.href = `foreignprofile.html?id=${encodeURIComponent(userId)}`;
}


// Add CSS for toast animations if not already present
if (!document.getElementById('utils-toast-styles')) {
    const style = document.createElement('style');
    style.id = 'utils-toast-styles';
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
}
