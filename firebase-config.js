// Import the functions you need from the SDKs you need
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.0/firebase-app.js";
import { getAnalytics } from "https://www.gstatic.com/firebasejs/10.7.0/firebase-analytics.js";
import { getAuth } from "https://www.gstatic.com/firebasejs/10.7.0/firebase-auth.js";
import { getDatabase } from "https://www.gstatic.com/firebasejs/10.7.0/firebase-database.js";

// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyDtSB855fSpikoqatfFrXJ4T7w5osPngwk",
  authDomain: "centralize-524ea.firebaseapp.com",
  databaseURL: "https://centralize-524ea-default-rtdb.asia-southeast1.firebasedatabase.app",
  projectId: "centralize-524ea",
  storageBucket: "centralize-524ea.firebasestorage.app",
  messagingSenderId: "1029942918862",
  appId: "1:1029942918862:web:3d3d6eeb049ab8e872da9f",
  measurementId: "G-D81WQW7E55"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

let analytics;
try {
  analytics = getAnalytics(app);
  console.log("Firebase Analytics initialized successfully");
} catch (error) {
  console.warn("Analytics initialization failed:", error);
}

const auth = getAuth(app);
const database = getDatabase(app);

console.log("Firebase initialized successfully");

export { app, analytics, auth, database };
