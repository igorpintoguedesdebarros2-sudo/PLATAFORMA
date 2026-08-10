const express = require("express");
const cors = require("cors");
const Stripe = require("stripe");
require("dotenv").config();

const {
    initializeApp,
    cert
} = require("firebase-admin/app");

const {
    getDatabase
} = require("firebase-admin/database");


// =======================
// FIREBASE
// =======================

const firebaseConfig =
    require("./firebase-admin.json");


// Adaptar os nomes do seu JSON
const serviceAccount = {

    project_id:
        firebaseConfig.project_id,

    private_key:
        firebaseConfig.FIREBASE_PRIVATE_KEY
            ? firebaseConfig.FIREBASE_PRIVATE_KEY.replace(/\\n/g, "\n")
            : undefined,

    client_email:
        firebaseConfig.FIREBASE_CLIENT_EMAIL

};


// Verificação básica
if (!serviceAccount.private_key) {

    console.error(
        "ERRO: FIREBASE_PRIVATE_KEY não encontrada."
    );

    process.exit(1);
}


if (!serviceAccount.client_email) {

    console.error(
        "ERRO: FIREBASE_CLIENT_EMAIL não encontrada."
    );

    process.exit(1);
}


// Inicializar Firebase
initializeApp({

    credential:
        cert(serviceAccount),

    databaseURL:
        "https://proje-79338-default-rtdb.firebaseio.com"

});


const db =
    getDatabase();


// =======================
// STRIPE
// =======================

if (!process.env.STRIPE_SECRET_KEY) {

    console.error(
        "ERRO: STRIPE_SECRET_KEY não encontrada no .env."
    );

    process.exit(1);
}


const stripe =
    Stripe(
        process.env.STRIPE_SECRET_KEY
    );


// =======================
// EXPRESS
// =======================

const app =
    express();

app.use(
    cors()
);

app.use(
    express.json()
);


// =======================
// CRIAR PAGAMENTO STRIPE
// =======================

app.post(
    "/criar-pagamento",
    async (req, res) => {

        const {
            curso,
            valor,
            pedidoId,
            usuarioId
        } = req.body;


        // =======================
        // VALIDAR DADOS
        // =======================

        if (
            !curso ||
            !valor ||
            !pedidoId
        ) {

            return res
                .status(400)
                .json({

                    erro:
                        "Dados incompletos"

                });

        }


        // Validar valor
        const valorNumerico =
            Number(valor);


        if (
            !Number.isFinite(
                valorNumerico
            ) ||
            valorNumerico <= 0
        ) {

            return res
                .status(400)
                .json({

                    erro:
                        "Valor inválido"

                });

        }


        // =======================
        // CRIAR CHECKOUT
        // =======================

        try {

            const session =
                await stripe
                    .checkout
                    .sessions
                    .create({

                        payment_method_types: [
                            "card"
                        ],


                        line_items: [

                            {

                                price_data: {

                                    currency:
                                        "brl",


                                    product_data: {

                                        name:
                                            curso

                                    },


                                    unit_amount:
                                        Math.round(
                                            valorNumerico * 100
                                        )

                                },


                                quantity:
                                    1

                            }

                        ],


                        mode:
                            "payment",


                        // =======================
                        // METADATA
                        // =======================

                        metadata: {

                            pedidoId:
                                String(
                                    pedidoId
                                ),

                            usuarioId:
                                usuarioId
                                    ? String(
                                        usuarioId
                                    )
                                    : "",

                            curso:
                                String(
                                    curso
                                )

                        },


                        // =======================
                        // SUCESSO
                        // =======================

                        success_url:
                            "https://igorpintoguedesdebarros2-sudo.github.io/PLATAFORMA/sucesso.html?session_id={CHECKOUT_SESSION_ID}",


                        // =======================
                        // CANCELAMENTO
                        // =======================

                        cancel_url:
                            "https://igorpintoguedesdebarros2-sudo.github.io/PLATAFORMA/cancelado.html"

                    });


            // =======================
            // RETORNAR SESSION ID
            // =======================

            res.json({

                id:
                    session.id

            });


        }
        catch (error) {

            console.error(
                "Erro criar pagamento:",
                error.message
            );


            res
                .status(500)
                .json({

                    erro:
                        error.message

                });

        }

    }
);


// =======================
// TESTE DA API
// =======================

app.get(
    "/",
    (req, res) => {

        res.json({

            status:
                "online",

            mensagem:
                "API Plataforma funcionando"

        });

    }
);


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
