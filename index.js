// index.js

// Import utility functions from app.js if needed, though not strictly required for this page
// import { showMessageBox } from './app.js';

document.addEventListener('DOMContentLoaded', () => {
    const startButton = document.getElementById('startButton');

    if (startButton) {
        startButton.addEventListener('click', () => {
            // Navigate to the next page (name entry)
            window.location.href = 'name.html';
        });
    } else {
        console.error("Start button not found.");
        // showMessageBox("An error occurred: Start button not found."); // Using showMessageBox from app.js
    }
});
