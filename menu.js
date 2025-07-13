// menu.js

import { saveSelectedItems, getOrderDetails, getUserId, getOrderId, showMessageBox } from './app.js';

// Define your menu items (price property is intentionally absent)
const menuItems = [
    { id: 'crunchy_taco', name: 'Crunchy Taco', image: 'https://placehold.co/150x150/FFCC00/000000?text=Taco' },
    { id: 'soft_taco', name: 'Soft Taco', image: 'https://placehold.co/150x150/FFCC00/000000?text=Soft+Taco' },
    { id: 'burrito_supreme', name: 'Burrito Supreme', image: 'https://placehold.co/150x150/FFCC00/000000?text=Burrito' },
    { id: 'quesadilla', name: 'Quesadilla', image: 'https://placehold.co/150x150/FFCC00/000000?text=Quesadilla' },
    { id: 'nacho_fries', name: 'Nacho Fries', image: 'https://placehold.co/150x150/FFCC00/000000?text=Fries' },
    { id: 'cinnamon_twists', name: 'Cinnamon Twists', image: 'https://placehold.co/150x150/FFCC00/000000?text=Twists' },
    { id: 'chalupa_supreme', name: 'Chalupa Supreme', image: 'https://placehold.co/150x150/FFCC00/000000?text=Chalupa' },
    { id: 'crunchwrap_supreme', name: 'Crunchwrap Supreme', image: 'https://placehold.co/150x150/FFCC00/000000?text=Crunchwrap' }
];

document.addEventListener('DOMContentLoaded', () => {
    const menuItemsContainer = document.getElementById('menuItemsContainer');
    const nextButton = document.getElementById('nextButton');
    const backButton = document.getElementById('backButton');
    const startOverButton = document.getElementById('startOverButton');
    const loadingIndicator = document.getElementById('loadingIndicator');

    // selectedItems will now store objects with { id, name, quantity }
    let selectedItems = [];

    if (!menuItemsContainer || !nextButton || !backButton || !startOverButton || !loadingIndicator) {
        console.error("Required elements not found on menu.html.");
        showMessageBox("An error occurred loading the menu page. Please try again.");
        return;
    }

    loadingIndicator.textContent = "Loading menu...";
    loadingIndicator.style.display = 'block';

    // Function to load and display menu items
    const loadMenuItems = async () => {
        const userId = getUserId();
        const orderId = getOrderId();

        if (!userId || !orderId) {
            showMessageBox("Order not in progress. Please start from the beginning.", () => {
                window.location.href = 'index.html';
            });
            loadingIndicator.style.display = 'none';
            return;
        }

        // Fetch existing order details to pre-select items and quantities if user comes back
        const orderDetails = await getOrderDetails();
        if (orderDetails && orderDetails.selectedItems) {
            selectedItems = orderDetails.selectedItems; // Load previously selected items with quantities
        }

        menuItemsContainer.innerHTML = ''; // Clear existing content
        menuItems.forEach(item => {
            const menuItemDiv = document.createElement('div');
            menuItemDiv.className = 'menu-item';
            menuItemDiv.dataset.itemId = item.id;
            menuItemDiv.dataset.itemName = item.name;

            // Find if this item was previously selected and get its quantity
            const existingSelectedItem = selectedItems.find(sItem => sItem.id === item.id);
            const initialQuantity = existingSelectedItem ? existingSelectedItem.quantity : 0;

            if (initialQuantity > 0) {
                menuItemDiv.classList.add('selected');
            }

            menuItemDiv.innerHTML = `
                <img src="${item.image}" alt="${item.name}">
                <h3>${item.name}</h3>
                <div class="quantity-control">
                    <button class="decrease-quantity" data-item-id="${item.id}">-</button>
                    <input type="number" class="item-quantity" data-item-id="${item.id}" value="${initialQuantity}" min="0" readonly>
                    <button class="increase-quantity" data-item-id="${item.id}">+</button>
                </div>
            `;
            menuItemsContainer.appendChild(menuItemDiv);

            const quantityInput = menuItemDiv.querySelector(`.item-quantity[data-item-id="${item.id}"]`);
            const decreaseButton = menuItemDiv.querySelector(`.decrease-quantity[data-item-id="${item.id}"]`);
            const increaseButton = menuItemDiv.querySelector(`.increase-quantity[data-item-id="${item.id}"]`);

            // Function to update quantity and selectedItems array
            const updateQuantity = (change) => {
                let currentQty = parseInt(quantityInput.value);
                let newQty = currentQty + change;

                if (newQty < 0) newQty = 0; // Prevent negative quantity

                quantityInput.value = newQty;

                const id = menuItemDiv.dataset.itemId;
                const name = menuItemDiv.dataset.itemName;

                const existingIndex = selectedItems.findIndex(sItem => sItem.id === id);

                if (newQty > 0) {
                    menuItemDiv.classList.add('selected'); // Mark as selected if quantity > 0
                    if (existingIndex === -1) {
                        selectedItems.push({ id, name, quantity: newQty });
                    } else {
                        selectedItems[existingIndex].quantity = newQty;
                    }
                } else { // newQty is 0
                    menuItemDiv.classList.remove('selected'); // Unmark if quantity is 0
                    if (existingIndex !== -1) {
                        selectedItems.splice(existingIndex, 1); // Remove item if quantity is 0
                    }
                }
                console.log("Current selected items:", selectedItems);
            };

            // Event listeners for quantity buttons
            decreaseButton.addEventListener('click', (event) => {
                event.stopPropagation(); // Prevent item card click from triggering
                updateQuantity(-1);
            });

            increaseButton.addEventListener('click', (event) => {
                event.stopPropagation(); // Prevent item card click from triggering
                updateQuantity(1);
            });

            // Prevent item card click from toggling 'selected' class if quantity controls are clicked
            // The main menu-item click listener will now only toggle if quantity is not being directly manipulated
            menuItemDiv.addEventListener('click', (event) => {
                // If a quantity button or input was clicked, don't toggle the selected class
                if (event.target.classList.contains('decrease-quantity') ||
                    event.target.classList.contains('increase-quantity') ||
                    event.target.classList.contains('item-quantity')) {
                    return;
                }
                // If the card itself is clicked, toggle quantity between 0 and 1
                if (parseInt(quantityInput.value) === 0) {
                    updateQuantity(1); // Set to 1 if currently 0
                } else {
                    updateQuantity(-parseInt(quantityInput.value)); // Set to 0 if currently > 0
                }
            });
        });
        loadingIndicator.style.display = 'none';
    };

    // Wait for Firebase authentication to be ready before trying to load menu items
    window.addEventListener('firebaseAuthReady', (event) => {
        if (event.detail.userId) {
            console.log("menu.js: Firebase auth ready. Loading menu items...");
            loadMenuItems();
        } else {
            console.error("menu.js: Firebase auth not ready or user not authenticated.");
            showMessageBox("Authentication issue. Please restart the order process.", () => {
                window.location.href = 'index.html';
            });
        }
    });

    // If the page loads and auth is already ready (e.g., fast navigation), load immediately
    if (getUserId()) {
        console.log("menu.js: User ID already available on DOMContentLoaded. Loading menu items...");
        loadMenuItems();
    }


    nextButton.addEventListener('click', async () => {
        if (selectedItems.length === 0) {
            showMessageBox("Please select at least one item before proceeding.");
            return;
        }

        loadingIndicator.textContent = "Saving selected items...";
        loadingIndicator.style.display = 'block';
        nextButton.disabled = true;
        backButton.disabled = true;
        startOverButton.disabled = true;

        const success = await saveSelectedItems(selectedItems);

        loadingIndicator.style.display = 'none';
        nextButton.disabled = false;
        backButton.disabled = false;
        startOverButton.disabled = false;

        if (success) {
            window.location.href = 'customize.html';
        } else {
            // Error message handled by saveSelectedItems
        }
    });

    // Event listener for the "Back" button
    backButton.addEventListener('click', () => {
        console.log("menu.js: 'Back' button clicked. Navigating to name.html.");
        window.location.href = 'name.html';
    });

    // Event listener for the "Start Over" button
    startOverButton.addEventListener('click', () => {
        sessionStorage.removeItem('tacoBellOrderId');
        console.log("menu.js: 'Start Over' button clicked. Session order ID cleared. Navigating to index.html.");
        window.location.href = 'index.html';
    });
});
