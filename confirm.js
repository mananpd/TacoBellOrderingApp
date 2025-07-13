// confirm.js

import { getOrderDetails, submitOrder, getUserId, getOrderId, showMessageBox } from './app.js';

document.addEventListener('DOMContentLoaded', () => {
    const orderDetailsContainer = document.getElementById('orderDetails');
    const submitOrderButton = document.getElementById('submitOrderButton');
    const loadingIndicator = document.getElementById('loadingIndicator');

    if (!orderDetailsContainer || !submitOrderButton || !loadingIndicator) {
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

        if (order.selectedItems && order.selectedItems.length > 0) {
            order.selectedItems.forEach(item => {
                const li = document.createElement('li');
                li.innerHTML = `<strong>${item.name}</strong> ($${item.price.toFixed(2)})`;

                // Add customizations if they exist for this item
                if (order.customizations && order.customizations[item.id] && order.customizations[item.id].length > 0) {
                    const customizationsDiv = document.createElement('div');
                    customizationsDiv.className = 'customization-details';
                    customizationsDiv.innerHTML = `&nbsp;&nbsp;&nbsp;Custom: ${order.customizations[item.id].join(', ')}`;
                    li.appendChild(customizationsDiv);
                }
                selectedItemsList.appendChild(li);
            });
        } else {
            const li = document.createElement('li');
            li.textContent = 'No items selected.';
            selectedItemsList.appendChild(li);
        }

        // Calculate and display total
        let total = 0;
        if (order.selectedItems) {
            total = order.selectedItems.reduce((sum, item) => sum + item.price, 0);
        }
        document.getElementById('orderTotal').textContent = total.toFixed(2);
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
        if (confirm("Are you sure you want to submit your order? This action cannot be undone.")) {
            loadingIndicator.textContent = "Submitting your order...";
            loadingIndicator.style.display = 'block';
            submitOrderButton.disabled = true;

            const success = await submitOrder();

            loadingIndicator.style.display = 'none';

            if (success) {
                showMessageBox("Your order has been submitted successfully! We'll send an email confirmation shortly.", () => {
                    // Clear session storage related to this order for a fresh start
                    sessionStorage.removeItem('tacoBellOrderId');
                    window.location.href = 'index.html'; // Go back to start
                });
            } else {
                // Error message handled by submitOrder
                submitOrderButton.disabled = false;
            }
        }
    });
});

