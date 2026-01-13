import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { getAnalytics } from "firebase/analytics";

const firebaseConfig = {
  apiKey: "AIzaSyDZVSYMoAY2iGVWzBpS8FnhHmBeXU3IVgA",
  authDomain: "projeto-a1382.firebaseapp.com",
  projectId: "projeto-a1382",
  storageBucket: "projeto-a1382.firebasestorage.app",
  messagingSenderId: "83902456715",
  appId: "1:83902456715:web:dfb6728aceb5a4dfe2058e",
  measurementId: "G-3QEK2V07WD",
};

const app = initializeApp(firebaseConfig);

export const auth = getAuth(app);
export const db = getFirestore(app);
export const analytics = getAnalytics(app);