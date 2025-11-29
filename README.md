
Built by https://www.blackbox.ai

---

# ElectriTrack

ElectriTrack is a web application designed to monitor electric consumption, manage user profiles, and facilitate billing and payments. The application leverages Firebase for authentication and real-time database functionalities, providing users with an intuitive interface to track their electricity usage and manage their accounts.

## Project Overview

The application consists of a user-friendly dashboard that displays current consumption, allows users to view their profiles, sign in/out, and manage their payment details. It aims to provide a reliable way for users to keep track of their electricity consumption and expenses.

## Installation

To run ElectriTrack locally, follow these steps:

1. **Clone the repository:**
   ```bash
   git clone https://github.com/yourusername/electritrack.git
   cd electritrack
   ```

2. **Open the `index.html` file in a web browser:**
   Simply open `index.html` directly in your preferred web browser to view the application.

3. **Configure Firebase for your application:**
   - Create a Firebase project at [Firebase Console](https://console.firebase.google.com/).
   - Set up Firebase Authentication and Firebase Realtime Database.
   - Replace the `firebaseConfig` object in `firebase-config.js` with your project's Firebase configuration details.

## Usage

- **Sign Up:** Users can register for a new account using their email and a password. A display name is also optional.
- **Sign In:** Existing users can enter their credentials to access their profiles.
- **Dashboard:** Users can monitor their electricity consumption, view current bills, and explore usage history.
- **Profile Management:** Users can manage their account information and personal settings.

### Navigating the Application

Users can navigate through the application using the navigation bar located at the top of the page, which includes links to the dashboard, profile, and authentication (sign in/sign up) pages.

## Features

- User registration and authentication via Firebase.
- Real-time monitoring of electricity consumption.
- Interactive dashboard displaying bills and usage trends.
- Profile management for users to update their information.
- Error handling and user-friendly feedback messages.
- Responsive design for accessibility across devices.

## Dependencies

The project primarily utilizes the following dependencies, as specified in the Firebase SDK:
- **Firebase Authentication**
- **Firebase Realtime Database**
- **Firebase Analytics** (optional for tracking purposes)

Please ensure you have access to these libraries by importing them in your project as demonstrated in the provided JavaScript files.

## Project Structure

```
project-root/
├── index.html           # Main entry point of the application
├── firebase-config.js   # Firebase configuration and initialization
├── auth.js              # Authentication functions for user sign-up, sign-in, and sign-out
├── profile.js           # Functions related to user profile rendering and management
├── consumption.js       # Dashboard functions for displaying consumption data and managing bills
├── main.js              # Main application logic and routing
├── style.css            # Styles for the application
```

### Additional Notes

- Ensure Firebase rules are configured correctly in the Firebase console to allow authenticated users to read/write data.
- Use modern browsers for optimal experience.
- To enhance the application, consider implementing additional features like analytics tracking and a more robust payment system.

For any issues, feel free to open an issue in the repository or contact me directly.

---

Thank you for using ElectriTrack!