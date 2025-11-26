async function handleRegistration(event) {
    event.preventDefault();

    const name = event.target[0].value.trim();
    const email = event.target[1].value.trim();
    const submitButton = event.target.querySelector('button[type="submit"]');

    // Disable button
    submitButton.disabled = true;
    submitButton.textContent = 'Checking...';

    try {
        // Check if email already exists
        const exists = await doesUserExist(email);

        if (exists) {
            alert('This email is already registered. Please use a different email or login.');
            submitButton.disabled = false;
            submitButton.textContent = 'Continue';
            return;
        }

        // Save data to localStorage
        localStorage.setItem('reg_name', name);
        localStorage.setItem('reg_email', email);

        // Navigate to next step
        window.location.href = 'registration2.html';
    } catch (error) {
        console.error('Registration error:', error);
        alert('Error checking email. Please try again.');
        submitButton.disabled = false;
        submitButton.textContent = 'Continue';
    }
}

function goToLogin() {
    window.location.href = 'Login.html';
}

// Add subtle animation on page load
document.addEventListener('DOMContentLoaded', () => {
    const container = document.querySelector('.container');
    container.style.opacity = '0';
    container.style.transform = 'translateY(20px)';

    setTimeout(() => {
        container.style.transition = 'all 0.6s ease';
        container.style.opacity = '1';
        container.style.transform = 'translateY(0)';
    }, 100);
});