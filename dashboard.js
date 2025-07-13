// dashboard.js

import { getFirestore, collection, query, where, onSnapshot, deleteDoc, doc } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-firestore.js";
import { getAuth, onAuthStateChanged, signInAnonymously } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-auth.js";
import { showMessageBox } from './app.js';

document.addEventListener('DOMContentLoaded', () => {
    const dashboardContent = document.getElementById('dashboardContent');

    const ordersList = document.getElementById('ordersList');
    const loadingOrders = document.getElementById('loadingOrders');
    const filterAllBtn = document.getElementById('filterAll');
    const filterSubmittedBtn = document.getElementById('filterSubmitted');
    const filterInProgressBtn = document.getElementById('filterInProgress');

    let currentAuth = null;
    let currentDb = null;
    let currentAppId = null;
    let currentUserId = null; // This will be the anonymous user for dashboard access
    let unsubscribe = null; // To store the unsubscribe function for the Firestore listener
    let currentFilter = 'all'; // Default filter

    // Common ingredients map for display (should be consistent with customize.js and confirm.js)
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
        'red_strips': 'Red Strips',
        'tostada_shell': 'Tostada Shell'
    };

    // Function to delete an order from Firestore
    const deleteOrder = async (orderIdToDelete, orderUserId) => {
        if (!currentDb || !currentUserId || !currentAppId) {
            showMessageBox("Dashboard not ready. Cannot delete order.");
            return;
        }

        const confirmDelete = await new Promise(resolve => {
            showMessageBox(`Are you sure you want to delete order ID: ${orderIdToDelete}? This action cannot be undone.`, () => {
                resolve(true);
            });
        });

        if (!confirmDelete) {
            return;
        }

        try {
            // Delete from public collection
            const publicOrderDocRef = doc(currentDb, `artifacts/${currentAppId}/public/data/orders`, orderIdToDelete);
            await deleteDoc(publicOrderDocRef);
            console.log(`DASHBOARD.JS: Order ${orderIdToDelete} deleted from public collection.`);

            // Also delete from the original user's private collection
            // This requires knowing the original userId of the order
            if (orderUserId) {
                const privateOrderDocRef = doc(currentDb, `artifacts/${currentAppId}/users/${orderUserId}/orders`, orderIdToDelete);
                await deleteDoc(privateOrderDocRef);
                console.log(`DASHBOARD.JS: Order ${orderIdToDelete} deleted from private collection of user ${orderUserId}.`);
            }

            // If both deletions (or just public if private doesn't exist) succeed, show success message
            showMessageBox(`Order ${orderIdToDelete} deleted successfully!`);

        } catch (error) {
            console.error(`DASHBOARD.JS: Error deleting order ${orderIdToDelete}:`, error);
            // Only show permission denied if the error code explicitly indicates it
            if (error.code === 'permission-denied') {
                showMessageBox("Permission denied: Check your Firestore Security Rules to allow delete operations for dashboard users.");
            } else {
                // For any other error, show a generic failure message
                showMessageBox(`Failed to delete order: ${error.message}`);
            }
        }
    };


    // Function to set up the Firestore listener for the PUBLIC orders collection
    const setupFirestoreListener = () => {
        if (unsubscribe) {
            unsubscribe(); // Unsubscribe from previous listener if exists
            console.log("DASHBOARD.JS: Unsubscribed from previous Firestore listener.");
        }

        if (!currentDb || !currentAppId) {
            console.warn("DASHBOARD.JS: Firestore or App ID not ready for listener setup. Skipping listener setup.");
            loadingOrders.textContent = "Error: Dashboard not fully initialized.";
            return;
        }

        console.log(`DASHBOARD.JS: Setting up Firestore listener for ALL public orders, app: ${currentAppId}, filter: ${currentFilter}`);

        // Query the PUBLIC orders collection
        const ordersCollectionRef = collection(currentDb, `artifacts/${currentAppId}/public/data/orders`);
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
            console.log("DASHBOARD.JS: Received Firestore snapshot. Number of documents:", snapshot.size);
            loadingOrders.style.display = 'none'; // Hide loading once data starts coming
            ordersList.innerHTML = ''; // Clear existing orders before re-rendering

            if (snapshot.empty) {
                ordersList.innerHTML = '<p>No orders found for this filter.</p>';
                console.log("DASHBOARD.JS: Snapshot is empty.");
                return;
            }

            snapshot.forEach(doc => {
                const order = doc.data();
                const orderId = doc.id;
                console.log(`DASHBOARD.JS: Processing order ${orderId}:`, order);

                const orderCard = document.createElement('div');
                orderCard.className = 'order-card';
                orderCard.innerHTML = `
                    <h3>Order ID: ${orderId}</h3>
                    <button class="delete-button" data-order-id="${orderId}" data-order-user-id="${order.userId || ''}">Delete</button>
                    <p><strong>Customer Name:</strong> ${order.userName || 'N/A'}</p>
                    <p><strong>Status:</strong> <span class="status ${order.status}">${order.status ? order.status.replace(/_/g, ' ') : 'N/A'}</span></p>
                    <p><strong>Order Date:</strong> ${order.timestamp ? new Date(order.timestamp.toDate()).toLocaleString() : 'N/A'}</p>
                    <h4>Items:</h4>
                    <ul>
                `;

                const itemsList = orderCard.querySelector('ul');
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
                        itemsList.appendChild(li);
                    });
                } else {
                    const li = document.createElement('li');
                    li.textContent = 'No items selected for this order.';
                    itemsList.appendChild(li);
                }

                orderCard.innerHTML += `</ul>`;
                ordersList.appendChild(orderCard);

                // Add event listener for the delete button
                orderCard.querySelector('.delete-button').addEventListener('click', (event) => {
                    const idToDelete = event.target.dataset.orderId;
                    const orderUserId = event.target.dataset.orderUserId; // Get the original user ID
                    deleteOrder(idToDelete, orderUserId);
                });
            });
        }, (error) => {
            console.error("DASHBOARD.JS: Error fetching orders from Firestore:", error);
            loadingOrders.textContent = "Error loading orders. Check console for details.";
            if (error.code === 'permission-denied') {
                showMessageBox("Permission denied: Check your Firestore Security Rules for read access to public orders.");
            } else {
                showMessageBox(`Error loading orders: ${error.message}`);
            }
        });
    };

    // Authentication state listener from Firebase
    onAuthStateChanged(getAuth(), (user) => {
        if (user) {
            currentAuth = getAuth();
            currentDb = getFirestore();
            currentAppId = window.__app_id;
            currentUserId = user.uid; // This user is the anonymous user for dashboard access

            console.log("DASHBOARD.JS: Firebase Auth ready. User is signed in with UID:", currentUserId);
            // Directly set dashboard content to visible and setup listener
            dashboardContent.style.display = 'block';
            setupFirestoreListener();
        } else {
            console.log("DASHBOARD.JS: No user signed in. Attempting anonymous sign-in for dashboard access...");
            // Automatically sign in anonymously if not already signed in
            signInAnonymously(getAuth()).then(userCredential => {
                currentUserId = userCredential.user.uid;
                console.log("DASHBOARD.JS: Successfully signed in anonymously for dashboard access. UID:", currentUserId);
                dashboardContent.style.display = 'block';
                setupFirestoreListener();
            }).catch(error => {
                console.error("DASHBOARD.JS: Error signing in anonymously for dashboard:", error);
                showMessageBox("Failed to authenticate for dashboard access. Please try again.");
                loadingOrders.textContent = "Authentication failed. Please refresh.";
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


