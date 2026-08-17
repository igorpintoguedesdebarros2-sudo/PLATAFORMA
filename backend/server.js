import express from "express";
import cors from "cors";
import Stripe from "stripe";
import admin from "firebase-admin";

// =====================================================
// CONFIGURAÇÃO
// =====================================================

const app = express();

const PORT = process.env.PORT || 10000;

// =====================================================
// STRIPE
// =====================================================

if (!process.env.STRIPE_SECRET_KEY) {
    console.error("ERRO: STRIPE_SECRET_KEY não configurada.");
    process.exit(1);
}

const stripe = new Stripe(
    process.env.STRIPE_SECRET_KEY
);

// =====================================================
// FIREBASE ADMIN
// =====================================================

let firebasePrivateKey =
    process.env.FIREBASE_PRIVATE_KEY;

if (!firebasePrivateKey) {
    console.error(
        "ERRO: FIREBASE_PRIVATE_KEY não configurada."
    );

    process.exit(1);
}

firebasePrivateKey =
    firebasePrivateKey.replace(/\\n/g, "\n");

if (!admin.apps || admin.apps.length === 0) {

    admin.initializeApp({

        credential:
            admin.credential.cert({

                projectId:
                    process.env.FIREBASE_PROJECT_ID,

                clientEmail:
                    process.env.FIREBASE_CLIENT_EMAIL,

                privateKey:
                    firebasePrivateKey
            })
    });
}

const db =
    admin.firestore();

// =====================================================
// MIDDLEWARE
// =====================================================

app.use(
    cors({
        origin: "*"
    })
);

app.use(
    express.json()
);

// =====================================================
// TESTE
// =====================================================

app.get(
    "/",
    (req, res) => {

        res.json({

            ok: true,

            servidor:
                "Plataforma",

            status:
                "online"
        });
    }
);