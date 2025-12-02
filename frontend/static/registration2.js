function handleRegistration2(event) {
    event.preventDefault();

    const dob = event.target[0].value;
    const location = event.target[1].value.trim();

    if (!dob || !location) {
        console.error('DOB or location missing');
        alert('Please fill in your date of birth and address.');
        return;
    }

    // Save to localStorage for later final submit
    localStorage.setItem('reg_dob', dob);
    localStorage.setItem('reg_location', location);

    // Navigate to registration3.html
    window.location.href = '/registration3';
}

function goBack() {
    window.location.href = '/registration';
}

// Set max date to today (users must be born before today)
document.addEventListener('DOMContentLoaded', () => {
    const dateInput = document.querySelector('.date-input');
    const today = new Date().toISOString().split('T')[0];
    dateInput.setAttribute('max', today);

    // Add fade-in animation
    const container = document.querySelector('.container');
    container.style.opacity = '0';
    container.style.transform = 'translateY(20px)';

    setTimeout(() => {
        container.style.transition = 'all 0.6s ease';
        container.style.opacity = '1';
        container.style.transform = 'translateY(0)';
    }, 100);
});
