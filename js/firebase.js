// Replace the placeholder values with your Firebase Web App configuration.
import { initializeApp } from "https://www.gstatic.com/firebasejs/11.10.0/firebase-app.js";
import { getAuth } from "https://www.gstatic.com/firebasejs/11.10.0/firebase-auth.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/11.10.0/firebase-firestore.js";

const firebaseConfig = {
  apiKey: "AIzaSyC2Yax8bQVHnwGAjPvfsFLB7gO-4PIKrV0",
  authDomain: "foodbridge-446b8.firebaseapp.com",
  projectId: "foodbridge-446b8",
  storageBucket: "foodbridge-446b8.firebasestorage.app",
  messagingSenderId: "394554483482",
  appId: "1:394554483482:web:42b20a3a59d76785ef82a3",
  measurementId: "G-CD7090QT0Y"
};

export const firebaseConfigured =
  firebaseConfig.apiKey !== "PASTE_YOUR_API_KEY" &&
  firebaseConfig.projectId !== "PASTE_YOUR_PROJECT_ID";

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);
