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

const firebaseConfig = require("./firebase-admin.json");

const serviceAccount = {
    project_id: firebaseConfig.project_id,

    private_key: firebaseConfig.FIREBASE_PRIVATE_KEY
        ? firebaseConfig.FIREBASE_PRIVATE_KEY.replace(/\\n/g, "\n")
        : undefined,

    client_email: firebaseConfig.FIREBASE_CLIENT_EMAIL
};

// =======================
// VALIDAR FIREBASE
// =======================

if (!serviceAccount.private_key) {
    console.error("ERRO: FIREBASE_PRIVATE_KEY não encontrada.");
    process.exit(1);
}

if (!serviceAccount.client_email) {
    console.error("ERRO: FIREBASE_CLIENT_EMAIL não encontrada.");
    process.exit(1);
}

// =======================
// INICIALIZAR FIREBASE
// =======================

initializeApp({
    credential: cert(serviceAccount),
    databaseURL: "https://proje-79338-default-rtdb.firebaseio.com"
});

const db = getDatabase();

// =======================
// STRIPE
// =======================

if (!process.env.STRIPE_SECRET_KEY) {
    console.error("ERRO: STRIPE_SECRET_KEY não encontrada no .env.");
    process.exit(1);
}

const stripe = Stripe(process.env.STRIPE_SECRET_KEY);

// =======================
// EXPRESS
// =======================

const app = express();

app.use(cors());
app.use(express.json());

// =======================
// CURSOS E PREÇOS FIXOS
// =======================

const cursos = {
    "HTML Completo": {
        valor: 49.90,
        link: "https://seusite.com/cursos/html"
    },

    "CSS Completo": {
        valor: 39.90,
        link: "https://seusite.com/cursos/css"
    },

    "JavaScript": {
        valor: 59.90,
        link: "https://seusite.com/cursos/javascript"
    },

    "Python": {
        valor: 69.90,
        link: "https://seusite.com/cursos/python"
    },

    "Firebase": {
        valor: 79.90,
        link: "https://seusite.com/cursos/firebase"
    }
};

// =======================
// CRIAR PAGAMENTO
// =======================

app.post("/criar-pagamento", async (req, res) => {

    const {
        curso,
        pedidoId,
        usuarioId
    } = req.body;

    if (!curso) {
        return res.status(400).json({
            erro: "Curso não informado."
        });
    }

    const cursoSelecionado = cursos[curso];

    if (!cursoSelecionado) {
        return res.status(400).json({
            erro: "Curso inválido."
        });
    }

    const idPedido =
        pedidoId || `pedido_${Date.now()}`;

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
                                    cursoSelecionado.valor * 100
                                )
                        },

                        quantity: 1
                    }
                ],

                mode: "payment",

                metadata: {

                    pedidoId: String(idPedido),

                    usuarioId: usuarioId
                        ? String(usuarioId)
                        : "",

                    curso: String(curso)
                },

                success_url:
                    "https://igorpintoguedesdebarros2-sudo.github.io/PLATAFORMA/sucesso.html?session_id={CHECKOUT_SESSION_ID}",

                cancel_url:
                    "https://igorpintoguedesdebarros2-sudo.github.io/PLATAFORMA/cancelado.html"
            });

        res.json({
            id: session.id
        });

    } catch (error) {

        console.error(
            "Erro criar pagamento:",
            error.message
        );

        res.status(500).json({
            erro: error.message
        });
    }
});

// =======================
// VERIFICAR PAGAMENTO
// =======================

app.get("/verificar-pagamento", async (req, res) => {

    const {
        session_id
    } = req.query;

    if (!session_id) {
        return res.status(400).json({
            erro: "session_id não informado."
        });
    }

    try {

        const session =
            await stripe.checkout.sessions.retrieve(
                session_id
            );

        if (
            session.payment_status !== "paid"
        ) {

            return res.json({

                pago: false,

                status:
                    session.payment_status

            });
        }

        const metadata =
            session.metadata || {};

        const curso =
            metadata.curso || "";

        const pedidoId =
            metadata.pedidoId || "";

        const usuarioId =
            metadata.usuarioId || "";

        const cursoSelecionado =
            cursos[curso];

        if (!cursoSelecionado) {

            return res.status(400).json({
                erro: "Curso não encontrado."
            });
        }

        res.json({

            pago: true,

            curso: curso,

            valor:
                cursoSelecionado.valor,

            pedidoId:
                pedidoId,

            usuarioId:
                usuarioId,

            linkCurso:
                cursoSelecionado.link,

            pagamentoId:
                session.id,

            dataPagamento:
                new Date().toISOString()
        });

    } catch (error) {

        console.error(
            "Erro verificar pagamento:",
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