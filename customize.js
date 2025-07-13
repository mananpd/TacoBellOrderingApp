// customize.js

import { getOrderDetails, saveCustomizations, getOrderId, getUserId, showMessageBox } from './app.js';

// Common ingredients that can be customized for items
const commonIngredients = [
    { id: 'lettuce', name: 'Lettuce' },
    { id: 'cheese', name: 'Cheddar Cheese' },
    { id: 'sour_cream', name: 'Sour Cream' },
    { id: 'tomato', name: 'Diced Tomatoes' },
    { id: 'beans', name: 'Refried Beans' },
    { id: 'rice', name: 'Seasoned Rice' },
    { id: 'jalapenos', name: 'Jalapeños' },
    { id: 'onions', name: 'Onions' },
    { id: 'guacamole', name: 'Guacamole' },
    { id: 'pico_de_gallo', name: 'Pico de Gallo' }
];

document.addEventListener('DOMContentLoaded', () => {
    const customizationContainer = document.getElementById('customizationContainer');
    const nextButton = document.getElementById('nextButton');
    const loadingIndicator = document.getElementById('loadingIndicator');

    if (!customizationContainer || !nextButton || !loadingIndicator) {
        console.error("Required elements not found on customize.html.");
        showMessageBox("An error occurred loading the page. Please try again.");
        return;
    }

    loadingIndicator.textContent = "Loading your selected items...";
    loadingIndicator.style.display = 'block';

    // Function to load and display order details
    const loadOrderDetails = async () => {
        const userId = getUserId();
        const orderId = getOrderId();

        console.log("customize.js: Attempting to load order details.");
        console.log("customize.js: currentUserId =", userId);
        console.log("customize.js: currentOrderId =", orderId);

        if (!orderId) {
            showMessageBox("No active order found. Please start from the beginning.", () => {
                window.location.href = 'index.html'; // Redirect if no order
            });
            loadingIndicator.style.display = 'none';
            return;
        }

        const orderDetails = await getOrderDetails();

        if (!orderDetails || !orderDetails.selectedItems || orderDetails.selectedItems.length === 0) {
            showMessageBox("No items selected for customization. Please go back to the menu.", () => {
                window.location.href = 'menu.html';
            });
            loadingIndicator.style.display = 'none';
            return;
        }

        loadingIndicator.style.display = 'none';

        // Store current customizations in a mutable object
        let currentCustomizations = orderDetails.customizations || {};

        // Dynamically create customization UI for each selected item
        orderDetails.selectedItems.forEach(item => {
            const itemDiv = document.createElement('div');
            itemDiv.className = 'order-summary'; // Reusing style for a nice box
            itemDiv.innerHTML = `<h3>${item.name} Customization</h3>`;

            const ingredientsDiv = document.createElement('div');
            ingredientsDiv.className = 'checkbox-group';

            commonIngredients.forEach(ingredient => {
                const ingredientCheckboxDiv = document.createElement('div');
                ingredientCheckboxDiv.className = 'checkbox-item';

                const isChecked = currentCustomizations[item.id] && currentCustomizations[item.id].includes(ingredient.id);

                ingredientCheckboxDiv.innerHTML = `
                    <input type="checkbox" id="${item.id}-${ingredient.id}" value="${ingredient.id}" ${isChecked ? 'checked' : ''}>
                    <label for="${item.id}-${ingredient.id}">${ingredient.name}</label>
                `;
                ingredientsDiv.appendChild(ingredientCheckboxDiv);

                // Add event listener to update currentCustomizations directly
                const checkbox = ingredientCheckboxDiv.querySelector(`#${item.id}-${ingredient.id}`);
                checkbox.addEventListener('change', () => {
                    if (!currentCustomizations[item.id]) {
                        currentCustomizations[item.id] = [];
                    }
                    if (checkbox.checked) {
                        if (!currentCustomizations[item.id].includes(ingredient.id)) {
                            currentCustomizations[item.id].push(ingredient.id);
                        }
                    } else {
                        currentCustomizations[item.id] = currentCustomizations[item.id].filter(id => id !== ingredient.id);
                    }
                    console.log(`Customizations for ${item.name}:`, currentCustomizations[item.id]);
                });
            });
            itemDiv.appendChild(ingredientsDiv);
            customizationContainer.appendChild(itemDiv);
        });

        nextButton.addEventListener('click', async () => {
            loadingIndicator.textContent = "Saving your customizations...";
            loadingIndicator.style.display = 'block';
            nextButton.disabled = true;

            const success = await saveCustomizations(currentCustomizations);

            loadingIndicator.style.display = 'none';

            if (success) {
                window.location.href = 'confirm.html';
            } else {
                // Error message handled by saveCustomizations
                nextButton.disabled = false;
            }
        });
    };

    // Wait for Firebase authentication to be ready before trying to load order details
    window.addEventListener('firebaseAuthReady', (event) => {
        if (event.detail.userId) {
            console.log("customize.js: Firebase auth ready. Loading order details...");
            loadOrderDetails();
        } else {
            console.error("customize.js: Firebase auth not ready or user not authenticated.");
            showMessageBox("Authentication issue. Please restart the order process.", () => {
                window.location.href = 'index.html';
            });
        }
    });

    // If the page loads and auth is already ready (e.g., fast navigation), load immediately
    // This check is important for when the 'firebaseAuthReady' event might have fired
    // before this script's DOMContentLoaded listener could attach.
    if (getUserId()) {
        console.log("customize.js: User ID already available on DOMContentLoaded. Loading order details...");
        loadOrderDetails();
    }
});

