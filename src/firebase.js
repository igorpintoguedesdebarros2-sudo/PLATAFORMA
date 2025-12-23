import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyDZVSYMoAY2iGVWzBpS8FnhHmBeXU3IVgA",
  authDomain: "projeto-a1382.firebaseapp.com",
  projectId: "projeto-a1382",
  storageBucket: "projeto-a1382.firebasestorage.app",
  messagingSenderId: "83902456715",
  appId: "1:83902456715:web:c664902fd6b866a0e2058e",
  measurementId: "G-4TVBBQDZ9C"
};

const app = initializeApp(firebaseConfig);

export const auth = getAuth(app);
export const db = getFirestore(app);
