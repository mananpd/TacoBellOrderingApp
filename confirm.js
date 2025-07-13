// confirm.js

import { getOrderDetails, submitOrder, getUserId, getOrderId, showMessageBox } from './app.js';

document.addEventListener('DOMContentLoaded', () => {
    const orderDetailsContainer = document.getElementById('orderDetails');
    const submitOrderButton = document.getElementById('submitOrderButton');
    const backButton = document.getElementById('backButton'); // New back button
    const startOverButton = document.getElementById('startOverButton'); // New start over button
    const loadingIndicator = document.getElementById('loadingIndicator');

    if (!orderDetailsContainer || !submitOrderButton || !backButton || !startOverButton || !loadingIndicator) {
        console.error("Required elements not found on confirm.html.");
        showMessageBox("An error occurred loading the page. Please try again.");
        return;
    }

    loadingIndicator.textContent = "Loading your final order details...";
    loadingIndicator.style.display = 'block';

    // Function to load and display order details
    const loadAndDisplayOrder = async () => {
        const userId = getUserId();
        const orderId = getOrderId();

        console.log("confirm.js: Attempting to load final order details.");
        console.log("confirm.js: currentUserId =", userId);
        console.log("confirm.js: currentOrderId =", orderId);

        if (!orderId) {
            showMessageBox("No active order found. Please start from the beginning.", () => {
                window.location.href = 'index.html'; // Redirect if no order
            });
            loadingIndicator.style.display = 'none';
            return;
        }

        const order = await getOrderDetails();

        console.log("confirm.js: Fetched order details:", order);

        loadingIndicator.style.display = 'none'; // Hide loading after fetch attempt

        if (!order) {
            showMessageBox("Could not retrieve order details. Please start from the beginning.", () => {
                window.location.href = 'index.html';
            });
            return;
        }

        // Display name
        document.getElementById('orderName').textContent = order.userName || 'N/A';

        // Display selected items
        const selectedItemsList = document.getElementById('selectedItemsList');
        selectedItemsList.innerHTML = ''; // Clear previous content

        // Helper map for ingredient names (should be consistent with customize.js)
        const commonIngredientsMap = {
            'lettuce': 'Lettuce',
            'cheese': 'Cheddar Cheese',
            'sour_cream': 'Sour Cream',
            'tomato': 'Diced Tomatoes',
            'beans': 'Refried Beans',
            'rice': 'Seasoned Rice',
            'jalapenos': 'Jalapeños',
            'onions': 'Onions',
            'guacamole': 'Guacamole',
            'pico_de_gallo': 'Pico de Gallo',
            'beef': 'Seasoned Beef',
            'chicken': 'Chicken',
            'steak': 'Steak',
            'nacho_cheese_sauce': 'Nacho Cheese Sauce',
            'red_strips': 'Red Strips'
        };


        if (order.selectedItems && order.selectedItems.length > 0) {
            order.selectedItems.forEach(item => {
                const li = document.createElement('li');
                li.innerHTML = `<strong>${item.name}</strong> (Qty: ${item.quantity || 1})`; // Display quantity

                // Add customizations if they exist for this item
                if (order.customizations && order.customizations[item.id]) {
                    const itemCustoms = order.customizations[item.id];
                    
                    if (itemCustoms.removed && itemCustoms.removed.length > 0) {
                        const removedDiv = document.createElement('div');
                        removedDiv.className = 'customization-details';
                        const removedNames = itemCustoms.removed.map(id => commonIngredientsMap[id] || id);
                        removedDiv.innerHTML = `&nbsp;&nbsp;&nbsp;Removed: ${removedNames.join(', ')}`;
                        li.appendChild(removedDiv);
                    }
                    if (itemCustoms.added && itemCustoms.added.length > 0) {
                        const addedDiv = document.createElement('div');
                        addedDiv.className = 'customization-details';
                        const addedNames = itemCustoms.added.map(id => commonIngredientsMap[id] || id);
                        addedDiv.innerHTML = `&nbsp;&nbsp;&nbsp;Added: ${addedNames.join(', ')}`;
                        li.appendChild(addedDiv);
                    }
                }
                selectedItemsList.appendChild(li);
            });
        } else {
            const li = document.createElement('li');
            li.textContent = 'No items selected.';
            selectedItemsList.appendChild(li);
        }

        // Removed total calculation and display
    };

    // Wait for Firebase authentication to be ready before trying to load order details
    window.addEventListener('firebaseAuthReady', (event) => {
        if (event.detail.userId) {
            console.log("confirm.js: Firebase auth ready. Loading final order details...");
            loadAndDisplayOrder();
        } else {
            console.error("confirm.js: Firebase auth not ready or user not authenticated.");
            showMessageBox("Authentication issue. Please restart the order process.", () => {
                window.location.href = 'index.html';
            });
        }
    });

    // If the page loads and auth is already ready (e.g., fast navigation), load immediately
    if (getUserId()) {
        console.log("confirm.js: User ID already available on DOMContentLoaded. Loading final order details...");
        loadAndDisplayOrder();
    }

    submitOrderButton.addEventListener('click', async () => {
        // Using a custom message box instead of window.confirm
        const confirmSubmission = await new Promise(resolve => {
            showMessageBox("Are you sure you want to submit your order?, () => {
                resolve(true); // User clicked OK
            });
            // For a "Cancel" option, you'd need a more complex custom dialog
            // with multiple buttons and callbacks.
        });

        if (!confirmSubmission) {
            return; // User cancelled
        }

        loadingIndicator.textContent = "Submitting your order...";
        loadingIndicator.style.display = 'block';
        submitOrderButton.disabled = true;
        backButton.disabled = true; // Disable navigation buttons during submission
        startOverButton.disabled = true;

        const success = await submitOrder();

        loadingIndicator.style.display = 'none';

        if (success) {
            showMessageBox("Your order has been submitted successfully!", () => {
                // Clear session storage related to this order for a fresh start
                sessionStorage.removeItem('tacoBellOrderId');
                window.location.href = 'index.html'; // Go back to start
            });
        } else {
            // Error message handled by submitOrder
            submitOrderButton.disabled = false;
            backButton.disabled = false; // Re-enable on failure
            startOverButton.disabled = false;
        }
    });

    // Event listener for the "Back" button
    backButton.addEventListener('click', () => {
        console.log("confirm.js: 'Back' button clicked. Navigating to customize.html.");
        window.location.href = 'customize.html';
    });

    // Event listener for the "Start Over" button
    startOverButton.addEventListener('click', () => {
        sessionStorage.removeItem('tacoBellOrderId');
        console.log("confirm.js: 'Start Over' button clicked. Session order ID cleared. Navigating to index.html.");
        window.location.href = 'index.html';
    });
});

