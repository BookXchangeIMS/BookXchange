// ============================================
// EDIT PROFILE - Real Backend Integration
// ============================================

// Require login
if (!isLoggedIn()) {
  window.location.href = '../templates/Login.html';
}

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

// Track selected genres
let selectedGenres = [];
let currentProfile = null;

// ============================================
// GENRE MANAGEMENT
// ============================================

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

// ============================================
// LOAD PROFILE DATA
// ============================================

async function loadProfile() {
  const token = getAccessToken();

  if (!token) {
    setFormMessage("Not logged in. Redirecting...", "error");
    setTimeout(() => window.location.href = '../templates/Login.html', 1000);
    return;
  }

  try {
    setFormMessage("Loading profile...", "");

    // Fetch user profile from API
    currentProfile = await getMyProfile(token);
    console.log('Loaded profile:', currentProfile);

    // Populate form fields
    document.getElementById("fullName").value = currentProfile.Name || "";
    document.getElementById("email").value = currentProfile.Email || "";
    document.getElementById("location").value = currentProfile.Location?.Address || "";
    document.getElementById("aboutMe").value = currentProfile.AboutMe || "";

    // Email is read-only
    document.getElementById("email").readOnly = true;

    // Set profile image if exists
    if (currentProfile.ProfileImagePath) {
      const avatarPreview = document.getElementById('avatarPreview');
      const imageUrl = `${API_BASE_URL}/api/get_users_profile_picture?userid=${currentProfile.UserID}&access_token=${token}`;
      avatarPreview.innerHTML = `<img src="${imageUrl}" alt="Profile Picture" style="width: 100%; height: 100%; object-fit: cover; border-radius: 50%;" onerror="this.parentElement.innerHTML='<svg xmlns=\\'http://www.w3.org/2000/svg\\' width=\\'64\\' height=\\'64\\' viewBox=\\'0 0 24 24\\' fill=\\'none\\' stroke=\\'currentColor\\' stroke-width=\\'1.5\\' stroke-linecap=\\'round\\' stroke-linejoin=\\'round\\'><path d=\\'M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2\\' /><circle cx=\\'12\\' cy=\\'7\\' r=\\'4\\' /></svg>'">`;
    }

    // Fetch and load preferences
    try {
      const preferences = await getPreferences(token);
      console.log('Loaded preferences:', preferences);
      selectedGenres = preferences || [];
      renderGenreCheckboxes();
      renderSelectedGenres();
    } catch (error) {
      console.error('Could not load preferences:', error);
      selectedGenres = [];
      renderGenreCheckboxes();
      renderSelectedGenres();
    }

    // Clear the loading message
    setFormMessage("", "");
  } catch (error) {
    console.error('Error loading profile:', error);
    setFormMessage("Could not load profile. Please try again.", "error");
  }
}

// ============================================
// SAVE PROFILE DATA
// ============================================

async function saveProfile(event) {
  event.preventDefault();

  const token = getAccessToken();
  if (!token) {
    setFormMessage("Not logged in. Please login again.", "error");
    return;
  }

  const form = event.target;
  const formData = new FormData(form);

  const payload = {
    Name: formData.get("fullName").trim(),
    AboutMe: formData.get("aboutMe").trim() || "",
    LocationAddress: formData.get("location").trim() || "Unknown",
    ProfileImagePath: currentProfile?.ProfileImagePath || ""
  };

  console.log('Sending payload:', payload);

  // Validate
  if (!payload.Name || payload.Name.length < 2) {
    setFormMessage("Name must be at least 2 characters", "error");
    return;
  }

  try {
    setFormMessage("Saving profile...", "");

    // Update profile
    await updateProfile(payload, token);
    console.log('Profile updated successfully');

    // Update preferences if changed
    const originalPreferences = await getPreferences(token);
    const preferencesChanged = JSON.stringify(originalPreferences.sort()) !== JSON.stringify(selectedGenres.sort());

    if (preferencesChanged) {
      // First delete all preferences
      for (const genre of originalPreferences) {
        try {
          await fetch(`${API_BASE_URL}/api/delete_preferences?genre_name=${encodeURIComponent(genre)}`, {
            method: 'DELETE',
            headers: { 'access-token': token }
          });
        } catch (e) {
          console.warn('Could not delete preference:', genre);
        }
      }

      // Then add new ones
      if (selectedGenres.length > 0) {
        await savePreferences(selectedGenres, token);
      }
      console.log('Preferences updated successfully');
    }

    setFormMessage("✓ Profile updated successfully!", "success");

    // Redirect after success
    setTimeout(() => window.location.href = '/profile', 1500);
  } catch (error) {
    console.error('Error saving profile:', error);
    setFormMessage("Error saving profile. Please try again.", "error");
  }
}

// ============================================
// DELETE ACCOUNT
// ============================================

let deleteStep = 1;

function confirmDeleteAccount() {
  deleteStep = 1;
  const modal = document.getElementById('deleteModal');
  const title = document.getElementById('modalTitle');
  const message = document.getElementById('modalMessage');

  title.textContent = '⚠️ Delete Account?';
  message.innerHTML = `
    This action will permanently delete:<br><br>
    • Your profile and all personal information<br>
    • All your listings<br>
    • All your messages<br>
    • All your preferences<br><br>
    <strong>This action CANNOT be undone!</strong>
  `;

  modal.classList.add('active');
}

function closeDeleteModal() {
  const modal = document.getElementById('deleteModal');
  modal.classList.remove('active');
  deleteStep = 1;
}

function proceedDeleteAccount() {
  if (deleteStep === 1) {
    // Show second confirmation
    deleteStep = 2;
    const title = document.getElementById('modalTitle');
    const message = document.getElementById('modalMessage');

    title.textContent = '🚨 FINAL WARNING!';
    message.innerHTML = `
      Are you <strong>absolutely sure</strong>?<br><br>
      Everything will be <strong>lost forever</strong>.<br><br>
      This is your last chance to cancel.
    `;
  } else {
    // Actually delete the account
    closeDeleteModal();
    executeDeleteAccount();
  }
}

async function executeDeleteAccount() {
  const token = getAccessToken();
  const refreshToken = getRefreshToken();

  if (!token || !refreshToken) {
    setFormMessage('Not logged in', 'error');
    return;
  }

  try {
    setFormMessage('Deleting account...', '');
    await deleteAccount(token, refreshToken);
    clearTokens();
    setFormMessage('✓ Account deleted. Redirecting...', 'success');
    setTimeout(() => {
      window.location.href = '../templates/Login.html';
    }, 1500);
  } catch (error) {
    console.error('Error deleting account:', error);
    setFormMessage('Error deleting account. Please try again.', 'error');
  }
}


// ============================================
// HELPER FUNCTIONS
// ============================================

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
  window.location.href = "/";
}

function goToAnnouncements() {
  window.location.href = "/announcements";
}

function goToFavorites() {
  window.location.href = "/favourites";
}

function goToProfile() {
  window.location.href = "/profile";
}

function goToMessages() {
  window.location.href = "/messages";
}

function goBackToForeignProfile() {
  window.location.href = "/user/";
}

// ============================================
// INITIALIZE
// ============================================

// Image Upload Setup
function setupImageUpload() {
  const fileInput = document.getElementById('profileImageInput');
  const avatarPreview = document.getElementById('avatarPreview');

  if (!fileInput || !avatarPreview) {
    return;
  }

  fileInput.addEventListener('change', async (e) => {
    e.preventDefault();
    e.stopPropagation();

    const file = e.target.files[0];
    if (!file) {
      return;
    }

    // Show preview immediately
    const reader = new FileReader();
    reader.onload = (readerEvent) => {
      avatarPreview.innerHTML = `<img src="${readerEvent.target.result}" alt="Preview" style="width: 100%; height: 100%; object-fit: cover; border-radius: 50%;">`;
    };
    reader.readAsDataURL(file);

    // Upload immediately
    try {
      setFormMessage("Uploading image...", "");
      const token = getAccessToken();

      const result = await uploadProfileImage(file, token);

      // Update current profile with new path
      if (currentProfile) {
        currentProfile.ProfileImagePath = result.path;
      }

      setFormMessage("✓ Image uploaded successfully", "success");
      setTimeout(() => setFormMessage("", ""), 3000);
    } catch (error) {
      console.error('Image upload failed:', error);
      setFormMessage("Image upload failed. Please try again.", "error");
    }
  });
}

// ============================================
// INITIALIZE
// ============================================

document.addEventListener("DOMContentLoaded", () => {
  console.log("Edit Profile page loaded - REAL API MODE");

  loadProfile();
  setupImageUpload();

  const form = document.getElementById("editProfileForm");
  form.addEventListener("submit", saveProfile);
});
