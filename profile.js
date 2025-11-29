import { auth, database } from "./firebase-config.js";
import { ref, set, get, update } from "https://www.gstatic.com/firebasejs/10.7.0/firebase-database.js";
import { updateProfile } from "https://www.gstatic.com/firebasejs/10.7.0/firebase-auth.js";

// Render the profile page
export function renderProfilePage() {
  const container = document.getElementById("app-container");
  container.innerHTML = `
    <div class="profile-container">
      <div class="profile-header">
        <h2>User Profile & Settings</h2>
        <p style="color: #ffffff;">Manage your personal information and account settings</p>
      </div>
      
      <div class="profile-content">
        <form id="profile-form" class="profile-form">
          <div class="form-group">
            <label for="display-name">Full Name</label>
            <input type="text" id="display-name" placeholder="Enter your full name" required />
          </div>

          <div class="form-group">
            <label for="email">Email Address</label>
            <input type="email" id="email" placeholder="Enter your email address" required />
          </div>
          
          <div class="form-group">
            <label for="phone">Meter Number</label>
            <input type="tel" id="phone" placeholder="Enter your meter number" />
            <small style="color: #ffffff; font-size: 0.85rem; margin-top: 0.25rem; display: block;">
              📱 This meter number must match your registered device to view consumption data
            </small>
          </div>
          
          <div class="form-group">
            <label for="address">Address</label>
            <textarea id="address" placeholder="Enter your address" rows="3"></textarea>
          </div>
          
          <div id="profile-error" class="error-message"></div>
          <div id="profile-success" class="success-message"></div>
          
          <div class="form-actions">
            <button type="submit" class="btn-primary">
              <span class="btn-text">Save Profile</span>
              <div class="btn-loading" style="display: none;">Saving...</div>
            </button>
            <button type="button" id="cancel-btn" class="btn-secondary">Cancel</button>
          </div>
        </form>
        
        <div class="account-info">
          <h3>Account Information</h3>
          <div class="info-item">
            <span class="info-label">Account Created:</span>
            <span id="account-created">Loading...</span>
          </div>
          <div class="info-item">
            <span class="info-label">Last Sign In:</span>
            <span id="last-signin">Loading...</span>
          </div>

        </div>
      </div>
    </div>
  `;

  // Load existing profile data
  loadUserProfile();
  
  // Load account information
  loadAccountInfo();

  // Add form submission listener
  const profileForm = document.getElementById("profile-form");
  profileForm.addEventListener("submit", handleProfileSubmit);
  
  // Add cancel button listener
  document.getElementById("cancel-btn").addEventListener("click", () => {
    window.location.hash = "#dashboard";
  });
}

// Load user profile data from Firebase
async function loadUserProfile() {
  const user = auth.currentUser;
  if (!user) {
    showError("User not authenticated");
    return;
  }

  try {
    const profileRef = ref(database, `users/${user.uid}/profile`);
    const snapshot = await get(profileRef);
    const profileData = snapshot.val() || {};

    // Populate form fields
    document.getElementById("display-name").value = profileData.displayName || user.displayName || "";
    document.getElementById("email").value = profileData.email || user.email || "";
    document.getElementById("phone").value = profileData.phone || "";
    document.getElementById("address").value = profileData.address || "";
    
  } catch (error) {
    console.error("Error loading profile:", error);
    showError("Failed to load profile data. Please refresh the page.");
  }
}

// Load account information
function loadAccountInfo() {
  const user = auth.currentUser;
  if (!user) return;

  document.getElementById("account-created").textContent = user.metadata.creationTime
    ? new Date(user.metadata.creationTime).toLocaleDateString()
    : "Unknown";
  document.getElementById("last-signin").textContent = user.metadata.lastSignInTime
    ? new Date(user.metadata.lastSignInTime).toLocaleDateString()
    : "Unknown";
}

// Handle profile form submission
async function handleProfileSubmit(e) {
  e.preventDefault();
  
  const user = auth.currentUser;
  if (!user) {
    showError("User not authenticated");
    return;
  }

  // Show loading state
  const submitBtn = e.target.querySelector('button[type="submit"]');
  const btnText = submitBtn.querySelector('.btn-text');
  const btnLoading = submitBtn.querySelector('.btn-loading');
  
  btnText.style.display = 'none';
  btnLoading.style.display = 'inline';
  submitBtn.disabled = true;

  // Clear previous messages
  clearMessages();

  try {
    // Get form data
    const profileData = {
      displayName: document.getElementById("display-name").value.trim(),
      email: document.getElementById("email").value.trim(),
      phone: document.getElementById("phone").value.trim(),
      address: document.getElementById("address").value.trim(),
      lastUpdated: new Date().toISOString()
    };

    // Validate required fields
    if (!profileData.displayName || !profileData.email) {
      throw new Error("Please fill in all required fields");
    }

    // Update Firebase Auth profile
    await updateProfile(user, {
      displayName: profileData.displayName
    });

    // Update profile data in Realtime Database
    const profileRef = ref(database, `users/${user.uid}/profile`);
    await set(profileRef, profileData);

    showSuccess("Profile updated successfully! Analytics data will reload on next view.");
    
    // Store flag to indicate profile changed
    sessionStorage.setItem('profileUpdated', 'true');
    
  } catch (error) {
    console.error("Error updating profile:", error);
    showError(error.message || "Failed to update profile. Please try again.");
  } finally {
    // Reset button state
    btnText.style.display = 'inline';
    btnLoading.style.display = 'none';
    submitBtn.disabled = false;
  }
}

// Utility functions for showing messages
function showError(message) {
  const errorDiv = document.getElementById("profile-error");
  const successDiv = document.getElementById("profile-success");
  
  errorDiv.textContent = message;
  errorDiv.style.display = "block";
  successDiv.style.display = "none";
}

function showSuccess(message) {
  const errorDiv = document.getElementById("profile-error");
  const successDiv = document.getElementById("profile-success");
  
  successDiv.textContent = message;
  successDiv.style.display = "block";
  errorDiv.style.display = "none";
}

function clearMessages() {
  document.getElementById("profile-error").style.display = "none";
  document.getElementById("profile-success").style.display = "none";
}

// Export function to get user profile data
export async function getUserProfile(userId) {
  try {
    const profileRef = ref(database, `users/${userId}/profile`);
    const snapshot = await get(profileRef);
    return snapshot.val();
  } catch (error) {
    console.error("Error fetching user profile:", error);
    throw error;
  }
}
