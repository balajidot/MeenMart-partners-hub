/**
 * Firebase project configuration.
 *
 * Get these values from:
 * Firebase Console (console.firebase.google.com) -> your project ->
 * Project Settings (gear icon) -> General tab -> "Your apps" section ->
 * Web app (</>) -> SDK setup and configuration -> "Config".
 *
 * This is a PUBLIC client-side config (safe to commit to git).
 * Actual access control is enforced by Realtime Database security
 * rules in the Firebase Console, not by hiding this file.
 */
const firebaseConfig = {
  apiKey: "PASTE_YOUR_API_KEY_HERE",
  authDomain: "PASTE_YOUR_PROJECT_ID.firebaseapp.com",
  databaseURL: "https://PASTE_YOUR_PROJECT_ID-default-rtdb.asia-southeast1.firebasedatabase.app",
  projectId: "PASTE_YOUR_PROJECT_ID",
  storageBucket: "PASTE_YOUR_PROJECT_ID.appspot.com",
  messagingSenderId: "PASTE_YOUR_SENDER_ID",
  appId: "PASTE_YOUR_APP_ID"
};
