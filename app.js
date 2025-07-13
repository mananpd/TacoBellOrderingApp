// app.js

// Firebase imports
import { initializeApp } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-app.js";
import { getAuth, signInAnonymously, signInWithCustomToken, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-auth.js";
import { getFirestore, doc, getDoc, setDoc, updateDoc, collection, onSnapshot, addDoc } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-firestore.js";

// --- START: Local Development Global Variable Definitions ---
// For local development, we directly define the Firebase configuration and app ID.
// IMPORTANT: These values MUST be your actual Firebase project's configuration.
// These are now directly assigned, removing the 'if undefined' checks that caused warnings.
window.__firebase_config = JSON.stringify({
    apiKey: "AIzaSyDpvT4-g2ZJcZXuxaWcjCbQUQG8NXEmPvE",
    authDomain: "tacobellorderingapp.firebaseapp.com",
    projectId: "tacobellorderingapp",
    storageBucket: "tacobellorderingapp.firebasestorage.app",
    messagingSenderId: "557802393026",
    appId: "1:557802393026:web:ef449421ea6238f8655a5b"
});

window.__app_id = 'tacobellorderingapp'; // Your actual Firebase Project ID

// __initial_auth_token is typically provided by the Canvas environment.
// For local setup, we default it to null for anonymous sign-in.
if (typeof window.__initial_auth_token === 'undefined') {
    window.__initial_auth_token = null;
}
// --- END: Local Development Global Variable Definitions ---


// Global variables for Firebase instances
let app;
let db;
let auth;
let currentUserId = null; // To store the authenticated user ID
let currentOrderId = null; // To store the current order ID for the session

// Function to initialize Firebase and authenticate
async function initializeFirebaseAndAuth() {
    try {
        // Retrieve Firebase config and app ID from global variables
        const firebaseConfigRaw = window.__firebase_config; // Now guaranteed to exist
        let firebaseConfig;
        try {
            firebaseConfig = JSON.parse(firebaseConfigRaw);
        } catch (parseError) {
            console.error("Error parsing __firebase_config:", parseError);
            console.error("Raw __firebase_config:", firebaseConfigRaw);
            showMessageBox("Error: Invalid Firebase configuration format. Please check console for details.");
            return; // Stop execution if config is invalid
        }

        const appId = window.__app_id; // Now guaranteed to exist
        const initialAuthToken = window.__initial_auth_token; // Now guaranteed to exist

        console.log("Initializing Firebase with config:", firebaseConfig);
        console.log("App ID:", appId);
        console.log("Initial Auth Token present:", initialAuthToken ? "Yes" : "No");

        // Initialize Firebase app
        app = initializeApp(firebaseConfig);
        db = getFirestore(app);
        auth = getAuth(app);

        // Set up authentication state listener
        onAuthStateChanged(auth, async (user) => {
            if (user) {
                currentUserId = user.uid;
                console.log("Firebase Auth State Changed: User is signed in with UID:", currentUserId);
            } else {
                currentUserId = null;
                console.log("Firebase Auth State Changed: No user is signed in.");
            }
            // Dispatch a custom event once auth state is known
            window.dispatchEvent(new CustomEvent('firebaseAuthReady', { detail: { userId: currentUserId } }));
        });

        // Sign in using custom token or anonymously
        if (initialAuthToken) {
            await signInWithCustomToken(auth, initialAuthToken);
            console.log("Signed in with custom token.");
        } else {
            await signInAnonymously(auth);
            console.log("Signed in anonymously.");
        }

    } catch (error) {
        console.error("Error initializing Firebase or authenticating:", error);
        showMessageBox("Error initializing app. Please try again later. Check console for details.");
    }
}

// Function to get the current authenticated user ID
export function getUserId() {
    return currentUserId;
}

// Function to get the current order ID
export function getOrderId() {
    // Try to get orderId from session storage first
    if (currentOrderId) {
        return currentOrderId;
    }
    const storedOrderId = sessionStorage.getItem('tacoBellOrderId');
    if (storedOrderId) {
        currentOrderId = storedOrderId;
        return currentOrderId;
    }
    return null;
}

// Function to set the current order ID and store it in session storage
export function setOrderId(orderId) {
    currentOrderId = orderId;
    sessionStorage.setItem('tacoBellOrderId', orderId);
}

// Utility function to show a custom message box instead of alert()
export function showMessageBox(message, callback = null) {
    const messageBox = document.getElementById('messageBox');
    const messageText = document.getElementById('messageText');
    const messageButton = document.getElementById('messageButton');

    if (!messageBox || !messageText || !messageButton) {
        console.error("Message box elements not found.");
        return;
    }

    messageText.textContent = message;
    messageBox.style.display = 'block';

    messageButton.onclick = () => {
        messageBox.style.display = 'none';
        if (callback) {
            callback();
        }
    };
}


// Firestore utility functions

/**
 * Saves the user's name to Firestore and creates a new order document.
 * @param {string} name - The user's name.
 * @returns {Promise<string>} The ID of the newly created order document.
 */
export async function saveUserName(name) {
    if (!db) {
        console.error("saveUserName: Firestore database instance (db) is not initialized.");
        showMessageBox("Database not ready. Please wait a moment and try again.");
        return null;
    }
    if (!currentUserId) {
        console.error("saveUserName: currentUserId is null. User not authenticated or auth state not ready.");
        showMessageBox("User not authenticated. Please ensure you are connected to Firebase.");
        return null;
    }

    try {
        const appId = window.__app_id; // Now guaranteed to exist
        const ordersCollectionRef = collection(db, `artifacts/${appId}/users/${currentUserId}/orders`);
        console.log(`Attempting to save user name '${name}' to collection: artifacts/${appId}/users/${currentUserId}/orders`);

        // Create a new order document
        const newOrderRef = await addDoc(ordersCollectionRef, {
            userId: currentUserId,
            userName: name,
            selectedItems: [],
            customizations: {},
            timestamp: new Date(),
            status: 'name_entered'
        });

        setOrderId(newOrderRef.id); // Store the new order ID
        console.log("User name and new order saved successfully with ID:", newOrderRef.id);
        return newOrderRef.id;
    } catch (error) {
        console.error("Error saving user name and creating order:", error);
        // Provide more specific error message if possible
        if (error.code === 'permission-denied') {
            showMessageBox("Permission denied: Check your Firestore Security Rules. You might not have write access.");
        } else {
            showMessageBox(`Failed to save your name: ${error.message}. Please try again.`);
        }
        return null;
    }
}

/**
 * Saves selected menu items to the current order document.
 * @param {Array<Object>} items - An array of selected menu item objects.
 * @returns {Promise<boolean>} True if successful, false otherwise.
 */
export async function saveSelectedItems(items) {
    if (!db || !currentUserId || !currentOrderId) {
        showMessageBox("Database not ready, user not authenticated, or no order in progress.");
        return false;
    }
    try {
        const appId = window.__app_id; // Now guaranteed to exist
        const orderDocRef = doc(db, `artifacts/${appId}/users/${currentUserId}/orders`, currentOrderId);
        console.log("Attempting to save selected items:", items); // Added log
        console.log(`Targeting order document: artifacts/${appId}/users/${currentUserId}/orders/${currentOrderId}`); // Added log

        await updateDoc(orderDocRef, {
            selectedItems: items,
            status: 'items_selected'
        });
        console.log("Selected items saved for order ID:", currentOrderId);
        return true;
    } catch (error) {
        console.error("Error saving selected items:", error);
        if (error.code === 'permission-denied') {
            showMessageBox("Permission denied: Check your Firestore Security Rules. You might not have write access.");
        } else {
            showMessageBox(`Failed to save selected items: ${error.message}. Please try again.`);
        }
        return false;
    }
}

/**
 * Saves customizations for selected items to the current order document.
 * @param {Object} customizations - An object where keys are item IDs and values are customization details.
 * @returns {Promise<boolean>} True if successful, false otherwise.
 */
export async function saveCustomizations(customizations) {
    if (!db || !currentUserId || !currentOrderId) {
        showMessageBox("Database not ready, user not authenticated, or no order in progress.");
        return false;
    }
    try {
        const appId = window.__app_id; // Now guaranteed to exist
        const orderDocRef = doc(db, `artifacts/${appId}/users/${currentUserId}/orders`, currentOrderId);

        await updateDoc(orderDocRef, {
            customizations: customizations,
            status: 'customized'
        });
        console.log("Customizations saved for order ID:", currentOrderId);
        return true;
    } catch (error) {
        console.error("Error saving customizations:", error);
        if (error.code === 'permission-denied') {
            showMessageBox("Permission denied: Check your Firestore Security Rules. You might not have write access.");
        } else {
            showMessageBox(`Failed to save customizations: ${error.message}. Please try again.`);
        }
        return false;
    }
}

/**
 * Fetches the current order details from Firestore.
 * @returns {Promise<Object|null>} The order data or null if not found/error.
 */
export async function getOrderDetails() {
    if (!db || !currentUserId || !currentOrderId) {
        console.warn("Cannot fetch order details: Database not ready, user not authenticated, or no order in progress.");
        return null;
    }
    try {
        const appId = window.__app_id; // Now guaranteed to exist
        const orderDocRef = doc(db, `artifacts/${appId}/users/${currentUserId}/orders`, currentOrderId);
        const orderSnap = await getDoc(orderDocRef);

        if (orderSnap.exists()) {
            console.log("Order details fetched:", orderSnap.data());
            return orderSnap.data();
        } else {
            console.log("No such order document!");
            return null;
        }
    } catch (error) {
        console.error("Error fetching order details:", error);
        if (error.code === 'permission-denied') {
            showMessageBox("Permission denied: Check your Firestore Security Rules. You might not have read access.");
        } else {
            showMessageBox(`Failed to retrieve order details: ${error.message}. Please try again.`);
        }
        return null;
    }
}

/**
 * Marks the order as submitted.
 * @returns {Promise<boolean>} True if successful, false otherwise.
 */
export async function submitOrder() {
    if (!db || !currentUserId || !currentOrderId) {
        showMessageBox("Database not ready, user not authenticated, or no order in progress.");
        return false;
    }
    try {
        const appId = window.__app_id; // Now guaranteed to exist
        const orderDocRef = doc(db, `artifacts/${appId}/users/${currentUserId}/orders`, currentOrderId);

        await updateDoc(orderDocRef, {
            status: 'submitted',
            submissionTimestamp: new Date()
        });
        console.log("Order submitted for ID:", currentOrderId);
        // In a real application, a backend service would listen for this status change
        // and trigger an email.
        return true;
    } catch (error) {
        console.error("Error submitting order:", error);
        if (error.code === 'permission-denied') {
            showMessageBox("Permission denied: Check your Firestore Security Rules. You might not have write access.");
        } else {
            showMessageBox(`Failed to submit order: ${error.message}. Please try again.`);
        }
        return false;
    }
}

// Initialize Firebase and Auth when the script loads
initializeFirebaseAndAuth();



