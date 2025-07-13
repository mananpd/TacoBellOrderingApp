// menu.js

import { saveSelectedItems, getOrderDetails, getUserId, getOrderId, showMessageBox } from './app.js';

// Define your menu items. Added 'restricted: true' for Mexican Pizza and Chicken Quesadilla.
const menuItems = [
    { id: 'crunchwrap_supreme', name: 'Crunchwrap Supreme', image: 'Images/Crunchwrap2.png' },
    { id: 'cheesy_gordita_crunch', name: 'Cheesy Gordita Crunch', image: 'Images/Cheesy.png' },
    { id: 'cantina_chicken_burrito', name: 'Catina Chicken Burrito ', image: 'Images/CatinaBur.png' },
    { id: 'bean_burrito', name: 'Bean Burrito', image: 'Images/BeanBurrito.png' },
    { id: 'catina_chicken_taco', name: 'Catina Chicken Taco', image: 'Images/CatinaTaco.png' },
    { id: 'soft_taco', name: 'Soft Taco', image: 'Images/softTaco.png' },
    { id: 'chicken_quesadilla', name: 'Chicken Quesadilla', image: 'Images/quesadilla.png', restricted: true }, // Restricted item
    { id: 'mexican_pizza', name: 'Mexican Pizza', image: 'Images/mexicanPizza.png', restricted: true }, // Restricted item
];

document.addEventListener('DOMContentLoaded', () => {
    const menuItemsContainer = document.getElementById('menuItemsContainer');
    const nextButton = document.getElementById('nextButton');
    const backButton = document.getElementById('backButton');
    const startOverButton = document.getElementById('startOverButton');
    const loadingIndicator = document.getElementById('loadingIndicator');

    // Restricted Item Modal Elements (reusing the Mexican Pizza modal)
    const restrictedItemModalOverlay = document.getElementById('mexicanPizzaModalOverlay'); // Reusing ID
    const restrictedItemModalTitle = document.getElementById('mexicanPizzaModalTitle');     // Reusing ID
    const restrictedItemModalMessage = document.getElementById('mexicanPizzaModalMessage'); // Reusing ID
    const goBackToMenuButton = document.getElementById('goBackToMenuButton');


    // selectedItems will now store objects with { id, name, quantity }
    let selectedItems = [];

    if (!menuItemsContainer || !nextButton || !backButton || !startOverButton || !loadingIndicator ||
        !restrictedItemModalOverlay || !restrictedItemModalTitle || !restrictedItemModalMessage ||
        !goBackToMenuButton) {
        console.error("Required elements not found on menu.html. Please check HTML IDs.");
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
                const id = menuItemDiv.dataset.itemId;
                const name = menuItemDiv.dataset.itemName;
                const currentItem = menuItems.find(menuItem => menuItem.id === id); // Get the full item object

                console.log(`updateQuantity called for ${id} with change ${change}`); // Debug log

                // Special handling for restricted items: prevent quantity increase
                if (currentItem && currentItem.restricted && change > 0) {
                    handleRestrictedItemSelection(id, name); // Show the warning modal
                    // Do not update quantity or add to selectedItems for restricted items
                    return;
                }

                let currentQty = parseInt(quantityInput.value);
                let newQty = currentQty + change;

                if (newQty < 0) newQty = 0; // Prevent negative quantity

                quantityInput.value = newQty;

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

            // Main item card click listener
            menuItemDiv.addEventListener('click', (event) => {
                // If a quantity button or input was clicked, don't trigger this
                if (event.target.classList.contains('decrease-quantity') ||
                    event.target.classList.contains('increase-quantity') ||
                    event.target.classList.contains('item-quantity')) {
                    return;
                }

                // Special handling for restricted items
                const currentItem = menuItems.find(menuItem => menuItem.id === item.id);
                if (currentItem && currentItem.restricted) {
                    handleRestrictedItemSelection(item.id, item.name);
                    return; // Stop further processing for restricted items
                }

                // Normal logic for other items: toggle quantity between 0 and 1
                if (parseInt(quantityInput.value) === 0) {
                    updateQuantity(1); // Set to 1 if currently 0
                } else {
                    updateQuantity(-parseInt(quantityInput.value)); // Set to 0 if currently > 0
                }
            });
        });
        loadingIndicator.style.display = 'none';
    };

    // Generic function to handle restricted item selection
    const handleRestrictedItemSelection = (itemId, itemName) => {
        restrictedItemModalOverlay.style.display = 'flex'; // Show the modal
        restrictedItemModalTitle.textContent = `Are you sure about the ${itemName}?`;
        restrictedItemModalMessage.textContent = `You sure you want this item? We really think you should select something else.`;
        
        // Ensure the restricted item is NOT selected (quantity remains 0) and update UI
        const restrictedItemInput = document.querySelector(`.item-quantity[data-item-id="${itemId}"]`);
        if (restrictedItemInput) {
            // Remove item from selectedItems if it was somehow added
            const index = selectedItems.findIndex(item => item.id === itemId);
            if (index !== -1) {
                selectedItems.splice(index, 1);
            }
            restrictedItemInput.value = 0; // Reset quantity display
            const restrictedItemDiv = document.querySelector(`.menu-item[data-item-id="${itemId}"]`);
            if (restrictedItemDiv) {
                restrictedItemDiv.classList.remove('selected');
            }
            console.log(`${itemName} quantity reset to 0 and removed from selectedItems.`); // Debug log
        }

        // Remove previous listeners to prevent multiple triggers
        const oldGoBackButton = goBackToMenuButton;
        const newGoBackButton = oldGoBackButton.cloneNode(true);
        oldGoBackButton.parentNode.replaceChild(newGoBackButton, oldGoBackButton);

        newGoBackButton.addEventListener('click', () => {
            restrictedItemModalOverlay.style.display = 'none'; // Hide the modal
            console.log(`${itemName} not selected. Current selected items:`, selectedItems);
        });
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
