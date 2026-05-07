import { initializeApp } from "firebase/app";
import { getDatabase } from "firebase/database";

const firebaseConfig = {
  apiKey: "AIzaSyBb2YvuK5lsJ7bJxYpQiAnp_MwRkcDJL1Y",
  authDomain: "nasiyasale.firebaseapp.com",
  databaseURL: "https://nasiyasale-default-rtdb.firebaseio.com",
  projectId: "nasiyasale",
  storageBucket: "nasiyasale.firebasestorage.app",
  messagingSenderId: "18517404160",
  appId: "1:18517404160:web:77a787e21820e00510c6e5"
};

const app = initializeApp(firebaseConfig);
export const db = getDatabase(app);
