function handleRegistration3(event) {
    event.preventDefault();

    const password = document.getElementById('password').value;
    const confirmPassword = document.getElementById('confirmPassword').value;
    const errorMessage = document.getElementById('errorMessage');

    // Check if passwords match
    if (password !== confirmPassword) {
        errorMessage.textContent = 'Passwords do not match!';
        document.getElementById('confirmPassword').focus();
        return;
    }

    // Clear error message
    errorMessage.textContent = '';

    // Save password to localStorage
    localStorage.setItem('reg_password', password);

    // Navigate to next page (preferences dashboard)
    window.location.href = 'preferencedashboard.html';
}

function goBack() {
    window.location.href = 'registration2.html';
}

// Real-time password matching validation
document.addEventListener('DOMContentLoaded', () => {
    const password = document.getElementById('password');
    const confirmPassword = document.getElementById('confirmPassword');
    const errorMessage = document.getElementById('errorMessage');

    function validatePasswords() {
        if (confirmPassword.value === '') {
            errorMessage.textContent = '';
            errorMessage.style.color = ''; // Reset to CSS default
        } else if (password.value !== confirmPassword.value) {
            errorMessage.textContent = 'Passwords do not match!';
            errorMessage.style.color = '#e74c3c'; // Ensure red for mismatch
        } else {
            errorMessage.textContent = '✓ Passwords match';
            errorMessage.style.color = '#27ae60'; // Ensure green for match
        }
    }

    confirmPassword.addEventListener('input', validatePasswords);
    password.addEventListener('input', validatePasswords);
});
