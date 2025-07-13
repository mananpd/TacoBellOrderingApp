// name.js

import { saveUserName, showMessageBox } from './app.js';

document.addEventListener('DOMContentLoaded', () => {
    const nameInput = document.getElementById('nameInput');
    const nextButton = document.getElementById('nextButton');
    const loadingIndicator = document.getElementById('loadingIndicator');

    if (!nameInput || !nextButton || !loadingIndicator) {
        console.error("Required elements not found on name.html.");
        showMessageBox("An error occurred loading the page. Please try again.");
        return;
    }

    // Wait for Firebase authentication to be ready before enabling the button
    window.addEventListener('firebaseAuthReady', (event) => {
        if (event.detail.userId) {
            nextButton.disabled = false; // Enable button once authenticated
            console.log("Firebase auth ready for name page.");
        } else {
            nextButton.disabled = true; // Keep disabled if no user
            showMessageBox("Authentication failed. Please refresh the page.");
        }
    });

    nextButton.addEventListener('click', async () => {
        const userName = nameInput.value.trim();

        if (userName === '') {
            showMessageBox('Please enter your name to continue.');
            return;
        }

        loadingIndicator.style.display = 'block'; // Show loading indicator
        nextButton.disabled = true; // Disable button during save

        const orderId = await saveUserName(userName);

        loadingIndicator.style.display = 'none'; // Hide loading indicator

        if (orderId) {
            // Successfully saved name and created order, proceed to menu page
            window.location.href = 'menu.html';
        } else {
            // Error message already handled by saveUserName via showMessageBox
            nextButton.disabled = false; // Re-enable button if save failed
        }
    });
});
