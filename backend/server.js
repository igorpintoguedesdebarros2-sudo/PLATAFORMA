const express = require("express");
const cors = require("cors");
const Stripe = require("stripe");
require("dotenv").config();

const {
    initializeApp,
    cert
} = require("firebase-admin/app");

const {
    getDatabase,
    ref,
    update
} = require("firebase-admin/database");


// =======================
// FIREBASE
// =======================

const serviceAccount =
    require("./firebase-admin.json");

initializeApp({
    credential: cert(serviceAccount),
    databaseURL: "https://proje-79338-default-rtdb.firebaseio.com"
});

const db = getDatabase();


// =======================
// STRIPE
// =======================

const stripe = Stripe(
    process.env.STRIPE_SECRET_KEY
);


// =======================
// EXPRESS
// =======================

const app = express();

app.use(cors());

app.use(express.json());


// =======================
// CRIAR PAGAMENTO STRIPE
// =======================

app.post("/criar-pagamento", async (req, res) => {

    const {
        curso,
        valor,
        pedidoId,
        usuarioId
    } = req.body;


    if (!curso || !valor || !pedidoId) {

        return res.status(400).json({
            erro: "Dados incompletos"
        });

    }


    try {

        const session =
            await stripe.checkout.sessions.create({

                payment_method_types: [
                    "card"
                ],

                line_items: [

                    {
                        price_data: {

                            currency: "brl",

                            product_data: {
                                name: curso
                            },

                            unit_amount:
                                Math.round(
                                    Number(valor) * 100
                                )

                        },

                        quantity: 1
                    }

                ],

                mode: "payment",

                metadata: {

                    pedidoId: pedidoId,

                    usuarioId:
                        usuarioId || "",

                    curso: curso

                },

                success_url:
                    "https://igorpintoguedesdebarros2-sudo.github.io/PLATAFORMA/sucesso.html?session_id={CHECKOUT_SESSION_ID}",

                cancel_url:
                    "https://igorpintoguedesdebarros2-sudo.github.io/PLATAFORMA/cancelado.html"

            });


        res.json({

            id: session.id

        });


    }
    catch (error) {

        console.log(
            "Erro criar pagamento:",
            error.message
        );

        res.status(500).json({

            erro: error.message

        });

    }

});


// =======================
// TESTE DA API
// =======================

app.get("/", (req, res) => {

    res.json({

        status: "online",

        mensagem:
            "API Plataforma funcionando"

    });

});


// =======================
// SERVIDOR
// =======================

const PORT =
    process.env.PORT || 3000;

app.listen(
    PORT,
    () => {

        console.log(
            "Servidor rodando na porta",
            PORT
        );

    }
);