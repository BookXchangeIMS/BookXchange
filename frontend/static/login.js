async function handleLogin(event) {
    event.preventDefault();

    const email = event.target[0].value;
    const password = event.target[1].value;





    try {
        // Call backend API
        const tokens = await signIn(email, password);

        // Save tokens
        saveTokens(tokens.access_token, tokens.refresh_token);

        // Redirect to home
        window.location.href = '../templates/home.html';
    } catch (error) {
        // Show error
        alert('Login failed: ' + error.message);

        // Re-enable button
        submitButton.disabled = false;
        submitButton.textContent = originalText;
    }
}

function handleRegister() {
    window.location.href = 'registration.html';

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
