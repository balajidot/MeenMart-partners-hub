import { initializeApp } from 'firebase/app';
import { getDatabase } from 'firebase/database';

const firebaseConfig = {
  apiKey: "AIzaSyDgmMzKiRKM8mn9FgOdkWCanqZ7RihV0k8",
  authDomain: "meenmart-partners-hub.firebaseapp.com",
  databaseURL: "https://meenmart-partners-hub-default-rtdb.asia-southeast1.firebasedatabase.app",
  projectId: "meenmart-partners-hub",
  storageBucket: "meenmart-partners-hub.firebasestorage.app",
  messagingSenderId: "49631212929",
  appId: "1:49631212929:web:15f09cb19dab3110ac2480"
};

const app = initializeApp(firebaseConfig);
export const db = getDatabase(app);
