// app.js

import { initializeApp } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-app.js";
import { getAuth, signInAnonymously, signInWithCustomToken, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-auth.js";
import { getFirestore, doc, getDoc, setDoc, updateDoc, collection, serverTimestamp } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-firestore.js";

// --- Firebase Initialization (DO NOT MODIFY __firebase_config or __app_id directly here) ---
let app;
let db;
let auth;
let currentUserId = null;
let currentOrderId = null; // Stored in session storage

// Check if running in Canvas environment or locally
if (typeof window.__firebase_config === 'undefined') {
    // Local development setup: Using your provided Firebase project config
    window.__firebase_config = JSON.stringify({
        apiKey: "AIzaSyDpvT4-g2ZJcZXuxaWcjCbQUQG8NXEmPvE",
        authDomain: "tacobellorderingapp.firebaseapp.com",
        projectId: "tacobellorderingapp",
        storageBucket: "tacobellorderingapp.firebasestorage.app",
        messagingSenderId: "557802393026",
        appId: "1:557802393026:web:ef449421ea6238f8655a5b"
    });
    // For local development, also set a default __app_id
    window.__app_id = 'tacobellorderingapp'; // Using your projectId for consistency
}

const firebaseConfig = JSON.parse(window.__firebase_config);
const appId = typeof __app_id !== 'undefined' ? __app_id : 'default-app-id';

app = initializeApp(firebaseConfig);
db = getFirestore(app);
auth = getAuth(app);

// --- Authentication ---
onAuthStateChanged(auth, async (user) => {
    if (user) {
        currentUserId = user.uid;
        console.log("Firebase Auth State Changed: User is signed in with UID:", currentUserId);
        // Dispatch a custom event to notify other scripts that auth is ready
        window.dispatchEvent(new CustomEvent('firebaseAuthReady', { detail: { userId: currentUserId } }));
    } else {
        console.log("Firebase Auth State Changed: No user signed in. Attempting anonymous sign-in...");
        try {
            // Check if there's an initial auth token from the Canvas environment
            if (typeof __initial_auth_token !== 'undefined' && __initial_auth_token) {
                await signInWithCustomToken(auth, __initial_auth_token);
                console.log("Signed in with custom token.");
            } else {
                // Sign in anonymously if no custom token (local dev or direct browser access)
                await signInAnonymously(auth);
                console.log("Signed in anonymously.");
            }
        } catch (error) {
            console.error("Error during authentication:", error);
            showMessageBox("Authentication failed. Please try refreshing the page.");
        }
    }
});

// --- Message Box Utility ---
const messageBox = document.getElementById('messageBox');
const messageText = document.getElementById('messageText');
const messageButton = document.getElementById('messageButton');

if (messageButton) {
    messageButton.addEventListener('click', () => {
        messageBox.style.display = 'none';
        // If a callback was stored, execute it
        if (messageBox._callback) {
            messageBox._callback();
            messageBox._callback = null; // Clear the callback
        }
    });
}

export function showMessageBox(message, callback = null) {
    if (messageBox && messageText) {
        messageText.textContent = message;
        messageBox.style.display = 'block';
        messageBox._callback = callback; // Store callback
    } else {
        console.warn("Message box elements not found. Falling back to console log:", message);
        // Fallback for environments where messageBox might not be present (e.g., pure backend tests)
        alert(message);
    }
}

// --- Order Management Functions ---

// Helper to get the current order document reference (private)
function getOrderDocRef(orderId) {
    return doc(db, `artifacts/${appId}/users/${currentUserId}/orders`, orderId);
}

// Helper to get the public order document reference
function getPublicOrderDocRef(orderId) {
    return doc(db, `artifacts/${appId}/public/data/orders`, orderId);
}

export function getUserId() {
    return currentUserId;
}

export function getOrderId() {
    // Retrieve orderId from session storage
    if (!currentOrderId) {
        currentOrderId = sessionStorage.getItem('tacoBellOrderId');
    }
    return currentOrderId;
}

export async function saveUserName(userName) {
    if (!currentUserId) {
        showMessageBox("Authentication not ready. Please wait a moment and try again.");
        return null;
    }

    let orderId = getOrderId();
    if (!orderId) {
        // Generate a new order ID if one doesn't exist
        orderId = doc(collection(db, `artifacts/${appId}/users/${currentUserId}/orders`)).id;
        sessionStorage.setItem('tacoBellOrderId', orderId);
        currentOrderId = orderId;
        console.log("Generated new order ID:", orderId);
    }

    const orderData = {
        userName: userName,
        userId: currentUserId, // Store userId in the order document
        timestamp: serverTimestamp(),
        status: 'name_entered' // New status field
    };

    try {
        // Save to private collection
        await setDoc(getOrderDocRef(orderId), orderData, { merge: true });
        console.log("User name saved to private order:", orderId);

        // Save to public collection
        await setDoc(getPublicOrderDocRef(orderId), orderData, { merge: true });
        console.log("User name saved to public order:", orderId);

        return orderId;
    } catch (e) {
        console.error("Error saving user name:", e);
        showMessageBox(`Failed to save your name: ${e.message}`);
        return null;
    }
}

export async function saveSelectedItems(items) {
    if (!currentUserId || !getOrderId()) {
        showMessageBox("Order not in progress. Please start from the beginning.");
        return false;
    }

    const orderData = {
        selectedItems: items,
        status: 'items_selected' // Update status
    };

    try {
        // Update private collection
        await updateDoc(getOrderDocRef(getOrderId()), orderData);
        console.log("Selected items saved to private order:", getOrderId());

        // Update public collection
        await updateDoc(getPublicOrderDocRef(getOrderId()), orderData);
        console.log("Selected items saved to public order:", getOrderId());

        return true;
    } catch (e) {
        console.error("Error saving selected items:", e);
        showMessageBox(`Failed to save your selections: ${e.message}`);
        return false;
    }
}

export async function saveCustomizations(customizations) {
    if (!currentUserId || !getOrderId()) {
        showMessageBox("Order not in progress. Please start from the beginning.");
        return false;
    }

    const orderData = {
        customizations: customizations,
        status: 'customized' // Update status
    };

    try {
        // Update private collection
        await updateDoc(getOrderDocRef(getOrderId()), orderData);
        console.log("Customizations saved to private order:", getOrderId());

        // Update public collection
        await updateDoc(getPublicOrderDocRef(getOrderId()), orderData);
        console.log("Customizations saved to public order:", getOrderId());

        return true;
    } catch (e) {
        console.error("Error saving customizations:", e);
        showMessageBox(`Failed to save your customizations: ${e.message}`);
        return false;
    }
}

export async function submitOrder() {
    if (!currentUserId || !getOrderId()) {
        showMessageBox("Order not in progress. Please start from the beginning.");
        return false;
    }

    const orderData = {
        status: 'submitted', // Final status
        submissionTimestamp: serverTimestamp() // Record submission time
    };

    try {
        // Update private collection
        await updateDoc(getOrderDocRef(getOrderId()), orderData);
        console.log("Order submitted in private collection:", getOrderId());

        // Update public collection
        await updateDoc(getPublicOrderDocRef(getOrderId()), orderData);
        console.log("Order submitted in public collection:", getOrderId());

        return true;
    } catch (e) {
        console.error("Error submitting order:", e);
        showMessageBox(`Failed to submit order: ${e.message}`);
        return false;
    }
}

export async function getOrderDetails() {
    if (!currentUserId || !getOrderId()) {
        console.warn("Cannot get order details: User not authenticated or no order ID.");
        return null;
    }
    try {
        const orderDoc = await getDoc(getOrderDocRef(getOrderId()));
        if (orderDoc.exists()) {
            return orderDoc.data();
        } else {
            console.warn("No such order document exists:", getOrderId());
            return null;
        }
    } catch (e) {
        console.error("Error getting order details:", e);
        showMessageBox(`Failed to load order details: ${e.message}`);
        return null;
    }
}
