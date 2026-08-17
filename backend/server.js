import express from "express";
import cors from "cors";
import Stripe from "stripe";
import admin from "firebase-admin";

const app = express();

const PORT = process.env.PORT || 10000;

const stripe = new Stripe(
    process.env.STRIPE_SECRET_KEY
);

const privateKey =
    process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, "\n");

if (!privateKey) {
    console.error("FIREBASE_PRIVATE_KEY não configurada.");
    process.exit(1);
}

admin.initializeApp({
    credential: admin.credential.cert({
        projectId: process.env.FIREBASE_PROJECT_ID,
        clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
        privateKey: privateKey
    })
});

const db = admin.firestore();

app.use(
    cors({
        origin: "*"
    })
);

app.use(express.json());

app.get("/", (req, res) => {
    res.json({
        ok: true,
        servidor: "Plataforma",
        status: "online"
    });
});