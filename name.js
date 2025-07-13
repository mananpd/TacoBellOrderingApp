// name.js

import { saveUserName, showMessageBox } from './app.js';

document.addEventListener('DOMContentLoaded', () => {
    const userNameInput = document.getElementById('userName');
    const nextButton = document.getElementById('nextButton');
    const loadingIndicator = document.getElementById('loadingIndicator');

    // Log to confirm elements are found
    console.log("name.js: userNameInput found?", !!userNameInput);
    console.log("name.js: nextButton found?", !!nextButton);
    console.log("name.js: loadingIndicator found?", !!loadingIndicator);

    // Check if all required elements are present
    if (!userNameInput || !nextButton || !loadingIndicator) {
        console.error("name.js: One or more required elements not found on name.html.");
        showMessageBox("An error occurred loading the name entry page. Please ensure all elements are present.");
        return; // Stop execution if elements are missing
    }

    // Initially hide the loading indicator
    loadingIndicator.style.display = 'none';

    nextButton.addEventListener('click', async () => {
        const userName = userNameInput.value.trim();

        if (userName) {
            // --- New: Check for "Brayden" in the name (case-insensitive) ---
            if (userName.toLowerCase().includes('bray')) {
                showMessageBox("only adults can place orders :)");
                return; // Stop the process here if "Brayden" is found
            }
            // --- End New Check ---

            loadingIndicator.textContent = "Saving name...";
            loadingIndicator.style.display = 'block';
            nextButton.disabled = true; // Disable button to prevent multiple clicks

            const orderId = await saveUserName(userName);

            loadingIndicator.style.display = 'none'; // Hide loading after save attempt

            if (orderId) {
                console.log("name.js: Name saved, navigating to menu.html with Order ID:", orderId);
                window.location.href = 'menu.html';
            } else {
                // Error message is handled by saveUserName (via showMessageBox)
                console.error("name.js: Failed to save user name or get order ID.");
                nextButton.disabled = false; // Re-enable button on failure
            }
        } else {
            showMessageBox("Please enter your name to proceed.");
        }
    });

    // Optional: Allow pressing Enter to submit
    userNameInput.addEventListener('keypress', (event) => {
        if (event.key === 'Enter') {
            event.preventDefault(); // Prevent default form submission
            nextButton.click(); // Simulate button click
        }
    });
});


