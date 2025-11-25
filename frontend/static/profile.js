// ============================================
// GLOBAL NAVIGATION FUNCTIONS
// ============================================

window.goBack = function() {
    window.history.back();
};

// ============================================
// USER PROFILE DATA
// ============================================

const userData = {
    name: "John Doe",
    email: "johndoe@gmail.com",
    about: "I am John Doe, an Information Systems student with all the dreams in the world. I've been a cruise-ship pianist, President of the Youth Parliament and a vocalist on a Grammy-winning track—and I still want to become a pilot!",
    interests: "Horror, Thriller; Romance"
};

// ============================================
// PAGE INITIALIZATION
// ============================================

document.addEventListener('DOMContentLoaded', function() {
    loadUserProfile();
});

// ============================================
// LOAD USER PROFILE DATA
// ============================================

function loadUserProfile() {
    const userNameElement = document.getElementById('userName');
    const userEmailElement = document.getElementById('userEmail');
    const aboutTextElement = document.getElementById('aboutText');
    const interestsTextElement = document.getElementById('interestsText');

    if (userNameElement) {
        userNameElement.textContent = `Hello, ${userData.name}!`;
    }

    if (userEmailElement) {
        userEmailElement.textContent = userData.email;
    }

    if (aboutTextElement) {
        aboutTextElement.textContent = userData.about;
    }

    if (interestsTextElement) {
        interestsTextElement.textContent = userData.interests;
    }
}

// ============================================
// PROFILE ACTIONS
// ============================================

function editProfile() {
    // In a real app, this would open an edit profile modal or page
    console.log('Edit Profile clicked');
    showToast('Edit Profile feature coming soon!', 'info');
    // window.location.href = 'edit-profile.html';
}

function viewTransactionHistory() {
    // In a real app, this would navigate to transaction history page
    console.log('View Transaction History clicked');
    showToast('Transaction History feature coming soon!', 'info');
    // window.location.href = 'transaction-history.html';
}

function logout() {
    const confirmLogout = confirm('Are you sure you want to log out?');
    
    if (confirmLogout) {
        // In a real app, this would:
        // 1. Clear session/auth tokens
        // 2. Clear local storage
        // 3. Redirect to login page
        console.log('Logging out...');
        
        // Simulate logout
        showToast('Logged out successfully', 'success');
        
        // Redirect to login page after a short delay
        setTimeout(() => {
            window.location.href = 'login.html';
        }, 1500);
    }
}

// ============================================
// NAVIGATION FUNCTIONS
// ============================================

function goToHome() {
    window.location.href = 'home.html';
}

function goToAnnouncements() {
    window.location.href = 'announcements.html';
}

function goToFavorites() {
    window.location.href = 'favourites.html';
}

function goToProfile() {
    window.location.href = 'profile.html';
}

function goToMessages() {
    window.location.href = 'mymessages.html';
}

// ============================================
// TOAST NOTIFICATION
// ============================================

function showToast(message, type = 'success') {
    const toast = document.createElement('div');
    toast.textContent = message;
    
    let backgroundColor;
    switch(type) {
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
