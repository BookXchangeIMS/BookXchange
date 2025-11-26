// Disable Next button on page load + start animation
document.addEventListener("DOMContentLoaded", () => {
    const container = document.querySelector(".container");
    const nextBtn = document.querySelector(".next-btn");

    // Disable Next at start
    nextBtn.disabled = true;
    nextBtn.classList.add("disabled");

    // Zoom-in entrance animation
    container.style.opacity = "0";
    container.style.transform = "scale(1.15) translateY(30px)";

    setTimeout(() => {
        container.style.transition = "all 0.7s ease";
        container.style.opacity = "1";
        container.style.transform = "scale(1) translateY(0)";
    }, 80);
});

// Toggle card selection
function togglePreference(card) {
    card.classList.toggle("selected");

    const selectedCards = document.querySelectorAll(".pref-card.selected");
    const nextBtn = document.querySelector(".next-btn");

    // If at least one card is selected → enable Next
    if (selectedCards.length > 0) {
        nextBtn.disabled = false;
        nextBtn.classList.remove("disabled");
    } else {
        nextBtn.disabled = true;
        nextBtn.classList.add("disabled");
    }
}

// Skip button - create account without preferences
async function skip() {
    await createAccount(false);
}

// Next button - create account with preferences
async function goNext() {
    const nextBtn = document.querySelector(".next-btn");
    if (nextBtn.disabled) return;

    await createAccount(true);
}

// Create account and optionally save preferences
async function createAccount(withPreferences) {
    const skipBtn = document.querySelector(".skip-btn");
    const nextBtn = document.querySelector(".next-btn");

    // Disable buttons
    skipBtn.disabled = true;
    nextBtn.disabled = true;
    nextBtn.textContent = 'Creating account...';

    try {
        // Get data from localStorage
        const userData = {
            name: localStorage.getItem('reg_name'),
            email: localStorage.getItem('reg_email'),
            password: localStorage.getItem('reg_password'),
            dob: localStorage.getItem('reg_dob'),
            location: localStorage.getItem('reg_location')
        };

        console.log('Registration data:', userData);

        // Validate all data is present
        if (!userData.name || !userData.email || !userData.password || !userData.dob || !userData.location) {
            alert('Registration data is incomplete. Please start over.');
            window.location.href = 'registration.html';
            return;
        }

        // Sign up user
        console.log('Calling signUp API...');
        const tokens = await signUp(userData);

        // Save tokens
        saveTokens(tokens.access_token, tokens.refresh_token);

        // Save preferences if selected
        if (withPreferences) {
            const selectedCards = document.querySelectorAll(".pref-card.selected");
            const genres = Array.from(selectedCards).map(card => {
                // Genre name is in the span element
                const span = card.querySelector('span');
                return span ? span.textContent.trim() : null;
            }).filter(g => g); // Remove nulls

            console.log('Selected genres:', genres);

            if (genres.length > 0) {
                await savePreferences(genres, tokens.access_token);
            }
        }

        // Clear registration data from localStorage
        localStorage.removeItem('reg_name');
        localStorage.removeItem('reg_email');
        localStorage.removeItem('reg_password');
        localStorage.removeItem('reg_dob');
        localStorage.removeItem('reg_location');

        // Redirect to home
        window.location.href = 'home.html';

    } catch (error) {
        console.error('Registration error:', error);
        alert('Registration failed: ' + error.message);

        // Re-enable buttons
        skipBtn.disabled = false;
        nextBtn.disabled = false;
        nextBtn.textContent = 'Next';
    }
}
