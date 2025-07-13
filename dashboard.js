// dashboard.js

import { getFirestore, collection, query, where, onSnapshot, deleteDoc, doc } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-firestore.js";
import { getAuth, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-auth.js";
import { showMessageBox } from './app.js'; // Assuming app.js initializes Firebase and exports showMessageBox

document.addEventListener('DOMContentLoaded', () => {
    const userIdDisplay = document.getElementById('userIdDisplay');
    const ordersList = document.getElementById('ordersList');
    const loadingOrders = document.getElementById('loadingOrders');
    const filterAllBtn = document.getElementById('filterAll');
    const filterSubmittedBtn = document.getElementById('filterSubmitted');
    const filterInProgressBtn = document.getElementById('filterInProgress');

    let currentAuth = null;
    let currentDb = null;
    let currentAppId = null;
    let currentUserId = null;
    let unsubscribe = null; // To store the unsubscribe function for the Firestore listener
    let currentFilter = 'all'; // Default filter

    // Common ingredients map for display (should match customize.js and confirm.js)
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
        'pico_de_gallo': 'Pico de Gallo'
    };

    // Function to delete an order from Firestore
    const deleteOrder = async (orderIdToDelete) => {
        if (!currentDb || !currentUserId || !currentAppId) {
            showMessageBox("Database not ready or user not authenticated. Cannot delete order.");
            return;
        }

        // Custom confirmation dialog instead of window.confirm
        const confirmDelete = await new Promise(resolve => {
            showMessageBox(`Are you sure you want to delete order ID: ${orderIdToDelete}? This action cannot be undone.`, () => {
                resolve(true); // User clicked OK
            });
            // You might need a more sophisticated custom dialog with "Cancel" button
            // For simplicity, this example assumes "OK" means confirm.
            // In a real app, you'd add a "Cancel" button to your messageBox HTML/CSS
            // and pass a different callback or resolve false.
        });

        if (!confirmDelete) {
            return; // User cancelled the deletion
        }

        try {
            const orderDocRef = doc(currentDb, `artifacts/${currentAppId}/users/${currentUserId}/orders`, orderIdToDelete);
            await deleteDoc(orderDocRef);
            console.log(`Order ${orderIdToDelete} deleted successfully.`);
            showMessageBox(`Order ${orderIdToDelete} deleted successfully!`);
        } catch (error) {
            console.error(`Error deleting order ${orderIdToDelete}:`, error);
            if (error.code === 'permission-denied') {
                showMessageBox("Permission denied: Check your Firestore Security Rules to allow delete operations.");
            } else {
                showMessageBox(`Failed to delete order: ${error.message}`);
            }
        }
    };


    // Function to set up the Firestore listener
    const setupFirestoreListener = () => {
        if (unsubscribe) {
            unsubscribe(); // Unsubscribe from previous listener if exists
        }

        if (!currentDb || !currentUserId || !currentAppId) {
            console.warn("Firestore or User ID not ready for listener setup.");
            loadingOrders.textContent = "Please ensure you are authenticated and connected to Firebase.";
            return;
        }

        userIdDisplay.textContent = currentUserId; // Display the user ID

        const ordersCollectionRef = collection(currentDb, `artifacts/${currentAppId}/users/${currentUserId}/orders`);
        let q;

        if (currentFilter === 'submitted') {
            q = query(ordersCollectionRef, where('status', '==', 'submitted'));
        } else if (currentFilter === 'in_progress') {
            // Orders that are not 'submitted' are considered 'in progress'
            q = query(ordersCollectionRef, where('status', '!=', 'submitted'));
        } else { // 'all' filter
            q = ordersCollectionRef;
        }

        loadingOrders.style.display = 'block';
        loadingOrders.textContent = "Loading orders...";
        ordersList.innerHTML = ''; // Clear previous orders

        unsubscribe = onSnapshot(q, (snapshot) => {
            loadingOrders.style.display = 'none'; // Hide loading once data starts coming
            ordersList.innerHTML = ''; // Clear existing orders before re-rendering

            if (snapshot.empty) {
                ordersList.innerHTML = '<p>No orders found for this filter.</p>';
                return;
            }

            snapshot.forEach(doc => {
                const order = doc.data();
                const orderId = doc.id;

                const orderCard = document.createElement('div');
                orderCard.className = 'order-card';
                orderCard.innerHTML = `
                    <h3>Order ID: ${orderId} <span>(User: ${order.userId})</span></h3>
                    <button class="delete-button" data-order-id="${orderId}">Delete</button>
                    <p><strong>Customer Name:</strong> ${order.userName || 'N/A'}</p>
                    <p><strong>Status:</strong> <span class="status ${order.status}">${order.status.replace(/_/g, ' ')}</span></p>
                    <p><strong>Order Date:</strong> ${order.timestamp ? new Date(order.timestamp.toDate()).toLocaleString() : 'N/A'}</p>
                    <h4>Items:</h4>
                    <ul>
                `;

                const itemsList = orderCard.querySelector('ul');
                if (order.selectedItems && order.selectedItems.length > 0) {
                    order.selectedItems.forEach(item => {
                        const li = document.createElement('li');
                        let customizationText = '';
                        if (order.customizations && order.customizations[item.id] && order.customizations[item.id].length > 0) {
                            const customizedIngredients = order.customizations[item.id].map(ingId => commonIngredientsMap[ingId] || ingId);
                            customizationText = `<br>&nbsp;&nbsp;&nbsp;Custom: ${customizedIngredients.join(', ')}`;
                        }
                        li.innerHTML = `<strong>${item.name}</strong> ($${item.price.toFixed(2)})${customizationText}`;
                        itemsList.appendChild(li);
                    });
                } else {
                    const li = document.createElement('li');
                    li.textContent = 'No items selected for this order.';
                    itemsList.appendChild(li);
                }

                orderCard.innerHTML += `</ul>`;

                // Add total
                let total = 0;
                if (order.selectedItems) {
                    total = order.selectedItems.reduce((sum, item) => sum + item.price, 0);
                }
                orderCard.innerHTML += `<p><strong>Total: $${total.toFixed(2)}</strong></p>`;

                ordersList.appendChild(orderCard);

                // Add event listener for the delete button
                orderCard.querySelector('.delete-button').addEventListener('click', (event) => {
                    const idToDelete = event.target.dataset.orderId;
                    deleteOrder(idToDelete);
                });
            });
        }, (error) => {
            console.error("Error fetching orders:", error);
            loadingOrders.textContent = "Error loading orders. Check console for details.";
            if (error.code === 'permission-denied') {
                showMessageBox("Permission denied: Check your Firestore Security Rules for read access to orders.");
            } else {
                showMessageBox(`Error loading orders: ${error.message}`);
            }
        });
    };

    // Authentication state listener from Firebase
    onAuthStateChanged(getAuth(), (user) => {
        if (user) {
            currentAuth = getAuth();
            currentDb = getFirestore(); // Get the initialized Firestore instance
            currentAppId = window.__app_id; // Get app ID from global variable
            currentUserId = user.uid; // Get the user's UID

            console.log("Dashboard: Firebase Auth ready. User ID:", currentUserId);
            setupFirestoreListener(); // Setup listener once authenticated
        } else {
            console.log("Dashboard: No user signed in. Waiting for authentication.");
            userIdDisplay.textContent = "Not authenticated";
            loadingOrders.textContent = "Waiting for user authentication...";
            showMessageBox("Please ensure Firebase is initialized and you are authenticated to view the dashboard.", () => {
                // Optionally redirect to index.html if not authenticated after a delay
                // window.location.href = 'index.html';
            });
        }
    });

    // Filter button event listeners
    filterAllBtn.addEventListener('click', () => {
        currentFilter = 'all';
        filterAllBtn.classList.add('active');
        filterSubmittedBtn.classList.remove('active');
        filterInProgressBtn.classList.remove('active');
        setupFirestoreListener();
    });

    filterSubmittedBtn.addEventListener('click', () => {
        currentFilter = 'submitted';
        filterAllBtn.classList.remove('active');
        filterSubmittedBtn.classList.add('active');
        filterInProgressBtn.classList.remove('active');
        setupFirestoreListener();
    });

    filterInProgressBtn.addEventListener('click', () => {
        currentFilter = 'in_progress';
        filterAllBtn.classList.remove('active');
        filterSubmittedBtn.classList.remove('active');
        filterInProgressBtn.classList.add('active');
        setupFirestoreListener();
    });
});

