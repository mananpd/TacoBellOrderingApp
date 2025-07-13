// menu.js

import { saveSelectedItems, getOrderId, showMessageBox } from './app.js';

// Hardcoded menu items
const menuItems = [
    { id: 'crunchy_taco', name: 'Crunchy Taco', price: 1.89 },
    { id: 'soft_taco', name: 'Soft Taco', price: 1.89 },
    { id: 'burrito_supreme', name: 'Burrito Supreme', price: 4.59 },
    { id: 'quesadilla', name: 'Chicken Quesadilla', price: 4.99 },
    { id: 'nacho_fries', name: 'Nacho Fries', price: 2.19 },
    { id: 'cinnamon_twists', name: 'Cinnamon Twists', price: 1.00 }
];

document.addEventListener('DOMContentLoaded', () => {
    const menuItemsContainer = document.getElementById('menuItemsContainer');
    const nextButton = document.getElementById('nextButton');
    const loadingIndicator = document.getElementById('loadingIndicator');

    if (!menuItemsContainer || !nextButton || !loadingIndicator) {
        console.error("Required elements not found on menu.html.");
        showMessageBox("An error occurred loading the page. Please try again.");
        return;
    }

    // Check if an order is in progress (i.e., orderId exists)
    if (!getOrderId()) {
        showMessageBox("No active order found. Please start from the beginning.", () => {
            window.location.href = 'index.html'; // Redirect if no order
        });
        return;
    }

    // Populate menu items dynamically
    menuItems.forEach(item => {
        const itemDiv = document.createElement('div');
        itemDiv.className = 'checkbox-item';
        itemDiv.innerHTML = `
            <input type="checkbox" id="${item.id}" value="${item.id}" data-name="${item.name}" data-price="${item.price}">
            <label for="${item.id}">
                ${item.name} <span class="item-price">($${item.price.toFixed(2)})</span>
            </label>
        `;
        menuItemsContainer.appendChild(itemDiv);
    });

    nextButton.addEventListener('click', async () => {
        const selectedCheckboxes = document.querySelectorAll('#menuItemsContainer input[type="checkbox"]:checked');
        const selectedItems = [];

        if (selectedCheckboxes.length === 0) {
            showMessageBox('Please select at least one item.');
            return;
        }

        if (selectedCheckboxes.length > 6) {
            showMessageBox('You can select a maximum of 6 items.');
            return;
        }

        selectedCheckboxes.forEach(checkbox => {
            selectedItems.push({
                id: checkbox.value,
                name: checkbox.dataset.name,
                price: parseFloat(checkbox.dataset.price)
            });
        });

        loadingIndicator.style.display = 'block'; // Show loading indicator
        nextButton.disabled = true; // Disable button during save

        const success = await saveSelectedItems(selectedItems);

        loadingIndicator.style.display = 'none'; // Hide loading indicator

        if (success) {
            window.location.href = 'customize.html';
        } else {
            // Error message already handled by saveSelectedItems via showMessageBox
            nextButton.disabled = false; // Re-enable button if save failed
        }
    });
});
