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

// Skip button
function skip() {
    window.location.href = "home.html"; 
}

// Next button (only works if enabled)
function goNext() {
    const nextBtn = document.querySelector(".next-btn");

    if (nextBtn.disabled) return; // safety check

    window.location.href = "home.html";
}
