# ElectriTrack PWA Installation Instructions

ElectriTrack has been converted to a Progressive Web App (PWA), which allows you to install it on your Samsung A32 5G device without needing an APK file. Follow these instructions to install and use the app.

## How to Install ElectriTrack on Samsung A32 5G

### Method 1: Using Chrome Browser

1. Open Chrome browser on your Samsung A32 5G
2. Navigate to your website where ElectriTrack is hosted
3. Wait for the page to fully load
4. You should see a prompt at the bottom of the screen saying "Add ElectriTrack to Home screen"
5. Tap on this prompt and then tap "Add" or "Install"
6. If you don't see the prompt, tap the three-dot menu (⋮) in the top-right corner
7. Select "Add to Home screen" or "Install app"
8. Tap "Add" or "Install" on the confirmation dialog
9. The app will be installed on your home screen

### Method 2: Using Samsung Internet Browser

1. Open Samsung Internet browser on your device
2. Navigate to your website where ElectriTrack is hosted
3. Tap the menu button (three lines) at the bottom-right
4. Select "Add page to" and then "Home screen"
5. Tap "Add" on the confirmation dialog
6. The app will be installed on your home screen

## Features of the PWA Version

- **Offline Access**: The app will work even when you're offline or have poor connectivity
- **Fast Loading**: The app loads quickly after the first visit
- **Home Screen Access**: Launch directly from your home screen like a native app
- **Full-Screen Experience**: The app runs in full-screen mode without browser UI
- **Push Notifications**: Receive alerts about your electricity consumption (if enabled)
- **Background Sync**: Data will sync when connectivity is restored if you use the app offline

## Troubleshooting

If you encounter any issues installing or using the PWA:

1. Make sure you're using an up-to-date browser (Chrome or Samsung Internet)
2. Clear your browser cache and try again
3. Ensure you have a stable internet connection for the initial installation
4. If the app doesn't appear to update, try uninstalling and reinstalling it

## For Developers

The PWA implementation includes:

- A complete `manifest.json` file with app information
- Service worker for offline functionality and caching
- Properly sized icons for various screen densities
- Meta tags for iOS and Android compatibility

To test the PWA features, you can use Chrome DevTools' Lighthouse audit or PWA checklist.
