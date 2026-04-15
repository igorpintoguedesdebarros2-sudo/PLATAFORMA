// Importações corretas
import { initializeApp } from "firebase/app";
import { getAuth, GoogleAuthProvider } from "firebase/auth"; // 🔥 faltava
import { getFirestore } from "firebase/firestore"; // 🔥 faltava
import { getAnalytics } from "firebase/analytics";

// Config
const firebaseConfig = {
  apiKey: "AIzaSyDZVSYMoAY2iGVWzBpS8FnhHmBeXU3IVgA",
  authDomain: "projeto-a1382.firebaseapp.com",
  projectId: "projeto-a1382",
  storageBucket: "projeto-a1382.firebasestorage.app",
  messagingSenderId: "83902456715",
  appId: "1:83902456715:web:dfb6728aceb5a4dfe2058e",
  measurementId: "G-3QEK2V07WD"
};

// Inicializa Firebase
const app = initializeApp(firebaseConfig);

// Serviços
export const auth = getAuth(app);
export const provider = new GoogleAuthProvider();
export const db = getFirestore(app);

// Analytics (opcional)
const analytics = getAnalytics(app);