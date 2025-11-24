// ============================================
// LOCAL TESTING MODE - No database required
// ============================================

// All available genres
const ALL_GENRES = [
  "Horror",
  "Thriller",
  "Romance",
  "Fantasy",
  "Science Fiction",
  "Mystery",
  "Historical Fiction",
  "Literary Fiction",
  "Young Adult",
  "Non-Fiction",
  "Biography",
  "Self-Help",
  "Poetry",
  "Drama",
  "Adventure"
];

// Mock profile data
const mockProfileData = {
  fullName: "Jane Doe",
  email: "johndoe@gmail.com",
  aboutMe: "I am John Doe, an Information Systems student with all the dreams in the world. I've been a cruise-ship pianist, President of the Youth Parliament and a vocalist on a Grammy-winning track—and I still want to become a pilot!",
  interests: ["Horror", "Thriller", "Romance"] // Now an array
};

// Track selected genres
let selectedGenres = [];

// Render available genre checkboxes
function renderGenreCheckboxes() {
  const container = document.getElementById("availableGenres");
  container.innerHTML = "";

  ALL_GENRES.forEach((genre) => {
    const wrapper = document.createElement("div");
    wrapper.className = "genre-checkbox-wrapper";

    const checkbox = document.createElement("input");
    checkbox.type = "checkbox";
    checkbox.id = `genre-${genre.replace(/\s+/g, "-")}`;
    checkbox.value = genre;
    checkbox.checked = selectedGenres.includes(genre);

    checkbox.addEventListener("change", (e) => {
      if (e.target.checked) {
        addGenre(genre);
      } else {
        removeGenre(genre);
      }
    });

    const label = document.createElement("label");
    label.htmlFor = checkbox.id;
    label.textContent = genre;

    wrapper.appendChild(checkbox);
    wrapper.appendChild(label);
    container.appendChild(wrapper);
  });
}

// Render selected genre tags
function renderSelectedGenres() {
  const container = document.getElementById("selectedGenres");
  container.innerHTML = "";

  selectedGenres.forEach((genre) => {
    const tag = document.createElement("div");
    tag.className = "genre-tag";

    const text = document.createElement("span");
    text.textContent = genre;

    const removeBtn = document.createElement("button");
    removeBtn.innerHTML = "&times;";
    removeBtn.type = "button";
    removeBtn.setAttribute("aria-label", `Remove ${genre}`);
    removeBtn.addEventListener("click", () => removeGenre(genre));

    tag.appendChild(text);
    tag.appendChild(removeBtn);
    container.appendChild(tag);
  });
}

// Add genre to selection
function addGenre(genre) {
  if (!selectedGenres.includes(genre)) {
    selectedGenres.push(genre);
    renderSelectedGenres();
    renderGenreCheckboxes();
  }
}

// Remove genre from selection
function removeGenre(genre) {
  selectedGenres = selectedGenres.filter((g) => g !== genre);
  renderSelectedGenres();
  renderGenreCheckboxes();
}

// Load profile data
function loadProfile() {
  try {
    setTimeout(() => {
      console.log("Loading mock profile data...");

      document.getElementById("fullName").value = mockProfileData.fullName || "";
      document.getElementById("email").value = mockProfileData.email || "";
      document.getElementById("aboutMe").value = mockProfileData.aboutMe || "";

      // Load selected genres
      selectedGenres = mockProfileData.interests || [];
      renderGenreCheckboxes();
      renderSelectedGenres();

      setFormMessage("Profile loaded (mock data)", "success");
      console.log("Mock profile loaded:", mockProfileData);
    }, 300);
  } catch (err) {
    setFormMessage("Could not load profile data. Please try again.", "error");
    console.error(err);
  }
}

// Save profile data
function saveProfile(event) {
  event.preventDefault();

  const form = event.target;
  const formData = new FormData(form);

  const payload = {
    fullName: formData.get("fullName"),
    email: formData.get("email"),
    aboutMe: formData.get("aboutMe"),
    interests: selectedGenres // Save as array
  };

  try {
    setTimeout(() => {
      console.log("Saving profile data...");
      console.log("New data:", payload);

      // Update mock data
      mockProfileData.fullName = payload.fullName;
      mockProfileData.email = payload.email;
      mockProfileData.aboutMe = payload.aboutMe;
      mockProfileData.interests = payload.interests;

      setFormMessage("✓ Profile updated successfully!", "success");
      console.log("Mock profile saved:", mockProfileData);

      // Optional: Redirect after success
      // setTimeout(() => goBackToForeignProfile(), 1000);
    }, 500);
  } catch (err) {
    setFormMessage("Error saving profile. Please try again.", "error");
    console.error(err);
  }
}

function setFormMessage(message, type) {
  const msgEl = document.getElementById("formMessage");
  msgEl.textContent = message;
  msgEl.classList.remove("success", "error");
  if (type) {
    msgEl.classList.add(type);
  }
}

// Navigation functions
function goToHome() {
  window.location.href = "home.html";
}

function goToAnnouncements() {
  window.location.href = "announcements.html";
}

function goToFavorites() {
  window.location.href = "favourites.html";
}

function goToProfile() {
  window.location.href = "profile.html";
}

function goToMessages() {
  window.location.href = "messages.html";
}

function goBackToForeignProfile() {
  window.location.href = "foreignprofile.html";
}

// Initialize
document.addEventListener("DOMContentLoaded", () => {
  console.log("Edit Profile page loaded - LOCAL TESTING MODE");
  loadProfile();

  const form = document.getElementById("editProfileForm");
  form.addEventListener("submit", saveProfile);
});
