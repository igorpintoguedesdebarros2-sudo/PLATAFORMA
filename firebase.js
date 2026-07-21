// Firebase SDK via CDN

import { initializeApp }
from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";


import { getAnalytics }
from "https://www.gstatic.com/firebasejs/10.7.1/firebase-analytics.js";


import { getAuth }
from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";


import { getDatabase }
from "https://www.gstatic.com/firebasejs/10.7.1/firebase-database.js";



// Configuração Firebase

const firebaseConfig = {

    apiKey: "AIzaSyBZ8DgiFi6ciVGgkam2bYqe2LSu-YMVIRE",

    authDomain: "proje-79338.firebaseapp.com",

    databaseURL: "https://proje-79338-default-rtdb.firebaseio.com",

    projectId: "proje-79338",

    storageBucket: "proje-79338.firebasestorage.app",

    messagingSenderId: "518397475805",

    appId: "1:518397475805:web:db57de624180a995575434",

    measurementId: "G-SN49DNNBX2"

};



// Inicializar Firebase

const app = initializeApp(firebaseConfig);



// Analytics

const analytics = getAnalytics(app);



// Serviços Firebase

export const auth = getAuth(app);

export const db = getDatabase(app);