import { auth } from "./firebase-config.js";
import { 
  createUserWithEmailAndPassword, 
  signInWithEmailAndPassword, 
  signOut,
  updateProfile 
} from "https://www.gstatic.com/firebasejs/10.7.0/firebase-auth.js";

// Validate email format
function isValidEmail(email) {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

// Validate password strength
function isValidPassword(password) {
  return password && password.length >= 6;
}

// Register a new user
export async function registerUser(email, password, displayName = '') {
  try {
    // Client-side validation
    if (!email || !isValidEmail(email)) {
      throw new Error("Please enter a valid email address.");
    }
    
    if (!isValidPassword(password)) {
      throw new Error("Password must be at least 6 characters long.");
    }
    
    console.log("Attempting to register user with email:", email);
    const userCredential = await createUserWithEmailAndPassword(auth, email, password);
    const user = userCredential.user;
    
    // Update the user's display name if provided
    if (displayName.trim()) {
      await updateProfile(user, {
        displayName: displayName.trim()
      });
      console.log("Display name updated successfully");
    }
    
    console.log("User registered successfully:", user.uid);
    return user;
  } catch (error) {
    console.error("Registration Error:", error);
    
    // Provide user-friendly error messages
    let errorMessage = "Registration failed. Please try again.";
    switch (error.code) {
      case 'auth/email-already-in-use':
        errorMessage = "This email is already registered. Please sign in instead.";
        break;
      case 'auth/invalid-email':
        errorMessage = "Please enter a valid email address.";
        break;
      case 'auth/operation-not-allowed':
        errorMessage = "Email/password accounts are not enabled. Please contact support.";
        break;
      case 'auth/weak-password':
        errorMessage = "Password should be at least 6 characters long.";
        break;
      case 'auth/network-request-failed':
        errorMessage = "Network error. Please check your connection and try again.";
        break;
      default:
        errorMessage = error.message || "An unexpected error occurred during registration.";
    }
    
    throw new Error(errorMessage);
  }
}

// Sign in an existing user
export async function loginUser(email, password) {
  try {
    // Client-side validation
    if (!email || !isValidEmail(email)) {
      throw new Error("Please enter a valid email address.");
    }
    
    if (!password) {
      throw new Error("Please enter your password.");
    }
    
    console.log("Attempting to sign in user with email:", email);
    const userCredential = await signInWithEmailAndPassword(auth, email, password);
    console.log("User signed in successfully:", userCredential.user.uid);
    return userCredential.user;
  } catch (error) {
    console.error("Login Error:", error);
    
    // Provide user-friendly error messages
    let errorMessage = "Login failed. Please try again.";
    switch (error.code) {
      case 'auth/user-disabled':
        errorMessage = "This account has been disabled. Please contact support.";
        break;
      case 'auth/user-not-found':
        errorMessage = "No account found with this email address. Please sign up first.";
        break;
      case 'auth/wrong-password':
        errorMessage = "Incorrect password. Please try again.";
        break;
      case 'auth/invalid-email':
        errorMessage = "Please enter a valid email address.";
        break;
      case 'auth/too-many-requests':
        errorMessage = "Too many failed attempts. Please try again later.";
        break;
      case 'auth/network-request-failed':
        errorMessage = "Network error. Please check your connection and try again.";
        break;
      case 'auth/invalid-credential':
        errorMessage = "Invalid email or password. Please check your credentials.";
        break;
      default:
        errorMessage = error.message || "An unexpected error occurred during sign in.";
    }
    
    throw new Error(errorMessage);
  }
}

// Sign out the current user
export async function logoutUser() {
  try {
    await signOut(auth);
    console.log("User signed out successfully");
  } catch (error) {
    console.error("Logout Error:", error);
    throw new Error("Failed to sign out. Please try again.");
  }
}

// Get current user info
export function getCurrentUser() {
  return auth.currentUser;
}

// Check if user is authenticated
export function isAuthenticated() {
  return auth.currentUser !== null;
}
