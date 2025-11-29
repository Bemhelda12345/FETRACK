# Deploying ElectriTrack to GitHub Pages

This guide will walk you through the process of deploying your ElectriTrack PWA to GitHub Pages so it can be accessed online from anywhere.

## Prerequisites

- A GitHub account (create one at [github.com](https://github.com) if you don't have one)
- Git installed on your computer (download from [git-scm.com](https://git-scm.com/downloads))

## Step 1: Create a GitHub Repository

1. Log in to your GitHub account
2. Click the "+" icon in the top-right corner and select "New repository"
3. Name your repository (e.g., "electritrack")
4. Add a description (optional)
5. Keep it as a public repository (GitHub Pages requires this for free accounts)
6. Do NOT initialize with a README, .gitignore, or license for now
7. Click "Create repository"

## Step 2: Initialize Git in Your Project

Open a terminal/command prompt in your project directory and run:

```bash
git init
```

## Step 3: Add Your Files to Git

```bash
git add .
```

This adds all files in your project to be tracked by Git.

## Step 4: Commit Your Files

```bash
git commit -m "Initial commit - ElectriTrack PWA"
```

## Step 5: Connect Your Local Repository to GitHub

Replace `YOUR-USERNAME` and `YOUR-REPO-NAME` with your GitHub username and repository name:

```bash
git remote add origin https://github.com/YOUR-USERNAME/YOUR-REPO-NAME.git
```

## Step 6: Push Your Code to GitHub

```bash
git push -u origin master
```

Note: If your default branch is named "main" instead of "master", use:

```bash
git push -u origin main
```

## Step 7: Enable GitHub Pages

1. Go to your repository on GitHub
2. Click "Settings"
3. Scroll down to the "GitHub Pages" section
4. Under "Source", select the branch you pushed to (main or master)
5. Select the root folder (/(root))
6. Click "Save"

## Step 8: Access Your Deployed PWA

After a few minutes, your PWA will be available at:

```
https://YOUR-USERNAME.github.io/YOUR-REPO-NAME/
```

For example, if your username is "johndoe" and your repository is "electritrack", the URL would be:

```
https://johndoe.github.io/electritrack/
```

## Step 9: Install the PWA on Your Samsung A32 5G

1. Open Chrome or Samsung Internet browser on your phone
2. Navigate to your GitHub Pages URL
3. Follow the installation instructions from the PWA-INSTRUCTIONS.md file

## Troubleshooting

- **404 Error**: It may take a few minutes for GitHub Pages to deploy your site. If you still see a 404 error after 10 minutes, check your repository settings to ensure GitHub Pages is properly configured.

- **Service Worker Issues**: If the service worker isn't working, make sure the path in your service worker registration is correct. For GitHub Pages, you might need to update the path in index.html:

  ```javascript
  navigator.serviceWorker.register('./service-worker.js')
  ```

  Instead of:

  ```javascript
  navigator.serviceWorker.register('/service-worker.js')
  ```

- **Manifest Not Loading**: Similarly, update the manifest path if needed:

  ```html
  <link rel="manifest" href="./manifest.json">
  ```

## Updating Your PWA

When you make changes to your app:

1. Make your changes locally
2. Commit them:
   ```bash
   git add .
   git commit -m "Description of changes"
   ```
3. Push to GitHub:
   ```bash
   git push
   ```
4. GitHub Pages will automatically update with your changes

Your PWA is now deployed online and can be installed on any compatible device, including your Samsung A32 5G!
