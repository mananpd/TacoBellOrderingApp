// customize.js

import { getOrderDetails, saveCustomizations, getOrderId, getUserId, showMessageBox } from './app.js';

// Common ingredients that can be customized for items
const commonIngredients = [
    { id: 'lettuce', name: 'Lettuce' },
    { id: 'cheese', name: 'Cheddar Cheese' },
    { id: 'sour_cream', name: 'Sour Cream' },
    { id: 'salsa', name: 'Salsa' },
    { id: 'beans', name: 'Black Beans' },
    { id: 'jalapenos', name: 'Jalapeños' },
    { id: 'beef', name: 'Seasoned Beef' }, // Added for removal/substitution
    { id: 'chicken', name: 'Chicken' },    // Added for removal/substitution
];

// A simplified mapping of ingredients typically found in items for 'removal' suggestions
// This is a basic example; a real app would have more detailed item compositions.
const defaultIngredientsPerItem = {
    'cheesy_gordita_crunch': ['beef', 'lettuce', 'cheese'],
    'soft_taco': ['beef', 'lettuce', 'cheese'],
    'mexican_pizza': ['beef', 'beans', 'rice', 'salsa'],
    'chicken_quesadilla': ['chicken', 'cheese'], // Assuming chicken quesadilla
    'catina_chicken_taco': ['chicken', 'cheese', 'lettuce', 'salsa'],
    'cantina_chicken_burrito': ['chicken', 'cheese', 'lettuce', 'salsa'],
    'bean_burrito': ['beans', 'cheese', 'salsa'],
    'crunchwrap_supreme': ['beef', 'cheese', 'tostada_shell', 'sour_cream', 'lettuce', 'salsa']
};

document.addEventListener('DOMContentLoaded', () => {
    const customizationContainer = document.getElementById('customizationContainer');
    const nextButton = document.getElementById('nextButton');
    const backButton = document.getElementById('backButton'); // New back button
    const startOverButton = document.getElementById('startOverButton'); // New start over button
    const loadingIndicator = document.getElementById('loadingIndicator');

    if (!customizationContainer || !nextButton || !backButton || !startOverButton || !loadingIndicator) {
        console.error("Required elements not found on customize.html. Please check HTML IDs.");
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
        console.log("customize.js: Fetched orderDetails:", orderDetails); // Log the fetched order details

        if (!orderDetails || !orderDetails.selectedItems || orderDetails.selectedItems.length === 0) {
            console.warn("customize.js: No items selected for customization found in order details.");
            showMessageBox("No items selected for customization. Please go back to the menu.", () => {
                window.location.href = 'menu.html';
            });
            loadingIndicator.style.display = 'none';
            return;
        }

        loadingIndicator.style.display = 'none';

        // currentCustomizations will now store objects like:
        // { [itemId]: { removed: [], added: [] } }
        let currentCustomizations = orderDetails.customizations || {};
        console.log("customize.js: Initial currentCustomizations:", currentCustomizations); // Log initial customizations

        customizationContainer.innerHTML = ''; // Clear previous content

        orderDetails.selectedItems.forEach(item => {
            console.log("customize.js: Processing item for customization:", item); // Log each item being processed
            // Initialize customization structure for this item if not present
            if (!currentCustomizations[item.id]) {
                currentCustomizations[item.id] = { removed: [], added: [] };
            }

            const itemDiv = document.createElement('div');
            itemDiv.className = 'item-customization-card';
            itemDiv.innerHTML = `<h3>${item.name} (Qty: ${item.quantity || 1})</h3>`;

            // --- REMOVE INGREDIENTS SECTION ---
            const removeSection = document.createElement('div');
            removeSection.className = 'customization-section';
            removeSection.innerHTML = `<h4>Remove Ingredients</h4>`;
            const removeCheckboxGroup = document.createElement('div');
            removeCheckboxGroup.className = 'checkbox-group';

            // Get default ingredients for this item, or an empty array if not defined
            const defaultIngredients = defaultIngredientsPerItem[item.id] || [];
            console.log(`customize.js: Item ${item.id} default ingredients:`, defaultIngredients);

            if (defaultIngredients.length === 0) {
                removeCheckboxGroup.innerHTML = '<p style="text-align: center; color: #718096;">No common ingredients to remove for this item.</p>';
            } else {
                defaultIngredients.forEach(ingredientId => {
                    const ingredient = commonIngredients.find(ing => ing.id === ingredientId);
                    if (!ingredient) {
                        console.warn(`customize.js: Ingredient ID '${ingredientId}' not found in commonIngredients map.`);
                        return; // Skip if ingredient not found in common list
                    }

                    const checkboxItem = document.createElement('div');
                    checkboxItem.className = 'checkbox-item';
                    const isChecked = currentCustomizations[item.id].removed.includes(ingredient.id);
                    checkboxItem.innerHTML = `
                        <input type="checkbox" id="remove-${item.id}-${ingredient.id}" value="${ingredient.id}" ${isChecked ? 'checked' : ''}>
                        <label for="remove-${item.id}-${ingredient.id}">${ingredient.name}</label>
                    `;
                    removeCheckboxGroup.appendChild(checkboxItem);

                    const checkbox = checkboxItem.querySelector(`#remove-${item.id}-${ingredient.id}`);
                    checkbox.addEventListener('change', () => {
                        if (checkbox.checked) {
                            if (!currentCustomizations[item.id].removed.includes(ingredient.id)) {
                                currentCustomizations[item.id].removed.push(ingredient.id);
                            }
                        } else {
                            currentCustomizations[item.id].removed = currentCustomizations[item.id].removed.filter(id => id !== ingredient.id);
                        }
                        console.log(`customize.js: Removed for ${item.name}:`, currentCustomizations[item.id].removed);
                    });
                });
            }
            removeSection.appendChild(removeCheckboxGroup);
            itemDiv.appendChild(removeSection);

            // --- ADD INGREDIENTS SECTION ---
            const addSection = document.createElement('div');
            addSection.className = 'customization-section';
            addSection.innerHTML = `<h4>Add Ingredients</h4>`;
            const addCheckboxGroup = document.createElement('div');
            addCheckboxGroup.className = 'checkbox-group';

            let ingredientsAddedCount = 0;
            commonIngredients.forEach(ingredient => {
                // Only show ingredients that are NOT default ingredients for this item to avoid redundancy
                // and are not already in the 'removed' list for this item.
                // This logic might need refinement based on exact "substitution" rules.
                // For now, it shows all common ingredients that aren't *default* for the item.
                if (!defaultIngredients.includes(ingredient.id)) { // Only suggest adding ingredients not typically in the item
                    const checkboxItem = document.createElement('div');
                    checkboxItem.className = 'checkbox-item';
                    const isChecked = currentCustomizations[item.id].added.includes(ingredient.id);
                    checkboxItem.innerHTML = `
                        <input type="checkbox" id="add-${item.id}-${ingredient.id}" value="${ingredient.id}" ${isChecked ? 'checked' : ''}>
                        <label for="add-${item.id}-${ingredient.id}">${ingredient.name}</label>
                    `;
                    addCheckboxGroup.appendChild(checkboxItem);
                    ingredientsAddedCount++;

                    const checkbox = checkboxItem.querySelector(`#add-${item.id}-${ingredient.id}`);
                    checkbox.addEventListener('change', () => {
                        if (checkbox.checked) {
                            if (!currentCustomizations[item.id].added.includes(ingredient.id)) {
                                currentCustomizations[item.id].added.push(ingredient.id);
                            }
                        } else {
                            currentCustomizations[item.id].added = currentCustomizations[item.id].added.filter(id => id !== ingredient.id);
                        }
                        console.log(`customize.js: Added for ${item.name}:`, currentCustomizations[item.id].added);
                    });
                }
            });
            if (ingredientsAddedCount === 0) {
                 addCheckboxGroup.innerHTML = '<p style="text-align: center; color: #718096;">No additional ingredients to add.</p>';
            }
            addSection.appendChild(addCheckboxGroup);
            itemDiv.appendChild(addSection);

            customizationContainer.appendChild(itemDiv);
        });

        // Event listener for Next button
        nextButton.addEventListener('click', async () => {
            loadingIndicator.textContent = "Saving your customizations...";
            loadingIndicator.style.display = 'block';
            nextButton.disabled = true;
            backButton.disabled = true;
            startOverButton.disabled = true;

            const success = await saveCustomizations(currentCustomizations);

            loadingIndicator.style.display = 'none';
            nextButton.disabled = false;
            backButton.disabled = false;
            startOverButton.disabled = false;

            if (success) {
                window.location.href = 'confirm.html';
            } else {
                // Error message handled by saveCustomizations
            }
        });

        // Event listener for Back button
        backButton.addEventListener('click', () => {
            console.log("customize.js: 'Back' button clicked. Navigating to menu.html.");
            window.location.href = 'menu.html';
        });

        // Event listener for Start Over button
        startOverButton.addEventListener('click', () => {
            sessionStorage.removeItem('tacoBellOrderId');
            console.log("customize.js: 'Start Over' button clicked. Session order ID cleared. Navigating to index.html.");
            window.location.href = 'index.html';
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
    if (getUserId()) {
        console.log("customize.js: User ID already available on DOMContentLoaded. Loading order details...");
        loadOrderDetails();
    }
});


