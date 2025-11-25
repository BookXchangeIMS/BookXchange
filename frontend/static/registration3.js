function handleRegistration3(event) {
    event.preventDefault();
    
    const password = document.getElementById('password').value;
    const confirmPassword = document.getElementById('confirmPassword').value;
    const errorMessage = document.getElementById('errorMessage');
    
    // Check if passwords match
    if (password !== confirmPassword) {
        errorMessage.textContent = 'Passwords do not match!';
        errorMessage.style.color = '#e74c3c'; // RED
        document.getElementById('confirmPassword').focus();
        return;
    }
    
    // Clear error message
    errorMessage.textContent = '';
    
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
    
    // Check passwords match while typing
    confirmPassword.addEventListener('input', () => {
        if (confirmPassword.value === '') {
            errorMessage.textContent = '';
            errorMessage.style.color = ''; // Reset
        } else if (password.value !== confirmPassword.value) {
            errorMessage.textContent = 'Passwords do not match!';
            errorMessage.style.color = '#e74c3c'; // RED
        } else {
            errorMessage.textContent = '✓ Passwords match';
            errorMessage.style.color = '#27ae60'; // GREEN
        }
    });
    
    password.addEventListener('input', () => {
        if (confirmPassword.value !== '') {
            if (password.value !== confirmPassword.value) {
                errorMessage.textContent = 'Passwords do not match!';
                errorMessage.style.color = '#e74c3c'; // RED
            } else {
                errorMessage.textContent = '✓ Passwords match';
                errorMessage.style.color = '#27ae60'; // GREEN
            }
        } else {
            errorMessage.textContent = '';
            errorMessage.style.color = '';
        }
    });

    // Fade-in animation for container
    const container = document.querySelector('.container');
    container.style.opacity = '0';
    container.style.transform = 'translateY(20px)';
    setTimeout(() => {
        container.style.transition = 'all 0.6s ease';
        container.style.opacity = '1';
        container.style.transform = 'translateY(0)';
    }, 100);
});
