/**
 * Multi-Step Registration Form
 * Consolidated from registration.js, registration2.js, and registration3.js
 */

let currentStep = 1;
const totalSteps = 3;

// Initialize on page load
document.addEventListener('DOMContentLoaded', () => {
    initializeRegistration();
    setupPasswordValidation();
    setupDateInput();
    fadeInAnimation(document.querySelector('.container'), 100);
});

/**
 * Initialize registration form
 */
function initializeRegistration() {
    const backBtn = document.getElementById('backBtn');
    const nextBtn = document.getElementById('nextBtn');
    const form = document.getElementById('registrationForm');

    // Initially hide back button on step 1
    updateNavigationButtons();

    // Back button handler
    backBtn.addEventListener('click', () => {
        if (currentStep > 1) {
            currentStep--;
            updateStep();
        }
    });

    // Next/Submit button handler
    nextBtn.addEventListener('click', async () => {
        if (await validateCurrentStep()) {
            if (currentStep < totalSteps) {
                currentStep++;
                updateStep();
            } else {
                // Final step - submit registration
                await submitRegistration();
            }
        }
    });
}

/**
 * Update the visible step
 */
function updateStep() {
    // Update form steps visibility
    document.querySelectorAll('.form-step').forEach(step => {
        step.classList.remove('active');
    });
    document.querySelector(`.form-step[data-step="${currentStep}"]`).classList.add('active');

    // Update step indicator
    document.querySelectorAll('.step').forEach((step, index) => {
        if (index < currentStep) {
            step.classList.add('active');
            step.classList.add('completed');
        } else if (index === currentStep - 1) {
            step.classList.add('active');
            step.classList.remove('completed');
        } else {
            step.classList.remove('active');
            step.classList.remove('completed');
        }
    });

    // Update navigation buttons
    updateNavigationButtons();

    // Animate step transition
    const activeStep = document.querySelector('.form-step.active');
    fadeInAnimation(activeStep, 0);
}

/**
 * Update navigation button states
 */
function updateNavigationButtons() {
    const backBtn = document.getElementById('backBtn');
    const nextBtn = document.getElementById('nextBtn');

    // Show/hide back button
    if (currentStep === 1) {
        backBtn.style.display = 'none';
    } else {
        backBtn.style.display = 'block';
    }

    // Update next button text/icon
    if (currentStep === totalSteps) {
        nextBtn.querySelector('.arrow').textContent = '✓';
    } else {
        nextBtn.querySelector('.arrow').textContent = '→';
    }
}

/**
 * Validate current step
 */
async function validateCurrentStep() {
    const nextBtn = document.getElementById('nextBtn');

    if (currentStep === 1) {
        // Validate name and email
        const name = document.getElementById('name').value.trim();
        const email = document.getElementById('email').value.trim();

        if (!name || !email) {
            showToast('Please fill in all fields', 'error');
            return false;
        }

        // Check if email already exists
        nextBtn.disabled = true;
        nextBtn.querySelector('.arrow').textContent = '...';

        try {
            const exists = await doesUserExist(email);

            if (exists) {
                showToast('This email is already registered. Please use a different email or login.', 'error');
                nextBtn.disabled = false;
                nextBtn.querySelector('.arrow').textContent = '→';
                return false;
            }

            // Save data to localStorage
            localStorage.setItem('reg_name', name);
            localStorage.setItem('reg_email', email);

            nextBtn.disabled = false;
            nextBtn.querySelector('.arrow').textContent = '→';
            return true;

        } catch (error) {
            console.error('Registration error:', error);
            showToast('Error checking email. Please try again.', 'error');
            nextBtn.disabled = false;
            nextBtn.querySelector('.arrow').textContent = '→';
            return false;
        }
    }
    else if (currentStep === 2) {
        // Validate DOB and address
        const dob = document.getElementById('dob').value;
        const address = document.getElementById('address').value.trim();
        const terms = document.getElementById('terms').checked;

        if (!dob || !address) {
            showToast('Please fill in your date of birth and address.', 'error');
            return false;
        }

        if (!terms) {
            showToast('You must confirm you are 18+ to continue.', 'error');
            return false;
        }

        // Save to localStorage
        localStorage.setItem('reg_dob', dob);
        localStorage.setItem('reg_location', address);
        return true;
    }
    else if (currentStep === 3) {
        // Validate passwords
        const password = document.getElementById('password').value;
        const confirmPassword = document.getElementById('confirmPassword').value;
        const errorMessage = document.getElementById('errorMessage');

        if (password.length < 8) {
            errorMessage.textContent = 'Password must be at least 8 characters';
            errorMessage.style.color = '#e74c3c';
            return false;
        }

        if (password !== confirmPassword) {
            errorMessage.textContent = 'Passwords do not match!';
            errorMessage.style.color = '#e74c3c';
            return false;
        }

        // Save password to localStorage
        localStorage.setItem('reg_password', password);
        return true;
    }

    return true;
}

/**
 * Submit final registration step (password)
 * Note: Account creation happens in preference dashboard, not here
 */
async function submitRegistration() {
    const nextBtn = document.getElementById('nextBtn');

    try {
        // Disable button
        nextBtn.disabled = true;
        nextBtn.querySelector('.arrow').textContent = '...';

        // Gather all data from localStorage
        const userData = {
            name: localStorage.getItem('reg_name'),
            email: localStorage.getItem('reg_email'),
            dob: localStorage.getItem('reg_dob'),
            location: localStorage.getItem('reg_location'),
            password: localStorage.getItem('reg_password')
        };

        // Validate all data is present (account creation happens in preference dashboard)
        if (!userData.name || !userData.email || !userData.dob || !userData.location || !userData.password) {
            showToast('Registration data is incomplete. Please start over.', 'error');
            // Clear incomplete data
            localStorage.removeItem('reg_name');
            localStorage.removeItem('reg_email');
            localStorage.removeItem('reg_dob');
            localStorage.removeItem('reg_location');
            localStorage.removeItem('reg_password');

            // Reset to step 1
            currentStep = 1;
            updateStep();
            nextBtn.disabled = false;
            nextBtn.querySelector('.arrow').textContent = '→';
            return;
        }

        showToast('Almost done! Let\'s set your preferences...', 'success');

        // Navigate to preferences dashboard
        setTimeout(() => {
            window.location.href = 'preferencedashboard.html';
        }, 1500);

    } catch (error) {
        console.error('Registration error:', error);
        showToast('Registration failed. Please try again.', 'error');
        nextBtn.disabled = false;
        nextBtn.querySelector('.arrow').textContent = '✓';
    }
}

/**
 * Setup real-time password validation
 */
function setupPasswordValidation() {
    const password = document.getElementById('password');
    const confirmPassword = document.getElementById('confirmPassword');
    const errorMessage = document.getElementById('errorMessage');

    function validatePasswords() {
        if (confirmPassword.value === '') {
            errorMessage.textContent = '';
        } else if (password.value !== confirmPassword.value) {
            errorMessage.textContent = 'Passwords do not match!';
            errorMessage.style.color = '#e74c3c';
        } else {
            errorMessage.textContent = '✓ Passwords match';
            errorMessage.style.color = '#27ae60';
        }
    }

    password.addEventListener('input', validatePasswords);
    confirmPassword.addEventListener('input', validatePasswords);
}

/**
 * Setup date input max date
 */
function setupDateInput() {
    const dateInput = document.getElementById('dob');
    const today = new Date().toISOString().split('T')[0];
    dateInput.setAttribute('max', today);
}

/**
 * Navigate to login page
 */
function goToLogin() {
    window.location.href = 'login.html';
}