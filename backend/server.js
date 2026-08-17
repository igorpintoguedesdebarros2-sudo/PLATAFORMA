import express from "express";
import cors from "cors";
import Stripe from "stripe";

import {
    initializeApp,
    getApps,
    cert
} from "firebase-admin/app";

import {
    getFirestore,
    FieldValue
} from "firebase-admin/firestore";

// =====================================================
// CONFIGURAÇÃO
// =====================================================

const app = express();

const PORT =
    process.env.PORT || 10000;

// =====================================================
// STRIPE
// =====================================================

if (!process.env.STRIPE_SECRET_KEY) {

    console.error(
        "ERRO: STRIPE_SECRET_KEY não configurada."
    );
}

const stripe =
    new Stripe(
        process.env.STRIPE_SECRET_KEY
    );

// =====================================================
// FIREBASE ADMIN
// =====================================================

const firebasePrivateKey =
    process.env.FIREBASE_PRIVATE_KEY
        ?.replace(/\\n/g, "\n");

if (
    !process.env.FIREBASE_PROJECT_ID ||
    !process.env.FIREBASE_CLIENT_EMAIL ||
    !firebasePrivateKey
) {

    console.error(
        "ERRO: variáveis do Firebase Admin não configuradas."
    );

} else {

    if (!getApps().length) {

        initializeApp({

            credential:
                cert({

                    projectId:
                        process.env.FIREBASE_PROJECT_ID,

                    clientEmail:
                        process.env.FIREBASE_CLIENT_EMAIL,

                    privateKey:
                        firebasePrivateKey

                })

        });

        console.log(
            "Firebase Admin inicializado."
        );

    } else {

        console.log(
            "Firebase Admin já estava inicializado."
        );
    }
}

const db =
    getFirestore();

// =====================================================
// CORS
// =====================================================

app.use(

    cors({

        origin: "*",

        methods: [
            "GET",
            "POST",
            "PUT",
            "DELETE",
            "OPTIONS"
        ],

        allowedHeaders: [
            "Content-Type",
            "Authorization"
        ]

    })

);

// =====================================================
// JSON
// =====================================================

app.use(
    express.json()
);

// =====================================================
// TESTE DO SERVIDOR
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

// =====================================================
// CONSULTAR PAGAMENTO
// =====================================================

app.get(
    "/consultar-pagamento",
    async (req, res) => {

        try {

            const sessionId =
                req.query.session_id;

            // =================================================
            // VALIDAR SESSION ID
            // =================================================

            if (!sessionId) {

                return res
                    .status(400)
                    .json({

                        valido: false,

                        pago: false,

                        erro:
                            "session_id não informado."

                    });

            }

            console.log(
                "======================================"
            );

            console.log(
                "CONSULTANDO PAGAMENTO"
            );

            console.log(
                "Session:",
                sessionId
            );

            // =================================================
            // STRIPE
            // =================================================

            const session =
                await stripe
                    .checkout
                    .sessions
                    .retrieve(
                        sessionId
                    );

            if (!session) {

                return res
                    .status(404)
                    .json({

                        valido: false,

                        pago: false,

                        erro:
                            "Sessão de pagamento não encontrada."

                    });

            }

            // =================================================
            // PAGAMENTO
            // =================================================

            const pago =
                session.payment_status ===
                "paid";

            // =================================================
            // METADATA
            // =================================================

            const metadata =
                session.metadata || {};

            // =================================================
            // USUÁRIO
            // =================================================

            const usuarioId =
                metadata.usuarioId ||
                metadata.userId ||
                session.client_reference_id ||
                "";

            // =================================================
            // PEDIDO
            // =================================================

            const pedidoId =
                metadata.pedidoId ||
                metadata.pedido ||
                "";

            // =================================================
            // CURSO
            // =================================================

            const curso =
                metadata.curso ||
                "";

            // =================================================
            // CATEGORIA
            // =================================================

            const categoria =
                metadata.categoria ||
                "EAD";

            // =================================================
            // DESCRIÇÃO
            // =================================================

            const descricao =
                metadata.descricao ||
                "Curso adquirido na plataforma.";

            // =================================================
            // LINK
            // =================================================

            const linkCurso =
                metadata.linkCurso ||
                "";

            // =================================================
            // SENHA
            // =================================================

            const senhaCurso =
                metadata.senhaCurso ||
                metadata.senha ||
                metadata.senhaOficial ||
                metadata.senhaAcesso ||
                "";

            // =================================================
            // USOS
            // =================================================

            const usosRestantesNumero =
                Number(
                    metadata.usosRestantes
                );

            const usosRestantes =
                Number.isFinite(
                    usosRestantesNumero
                )
                    ? usosRestantesNumero
                    : 0;

            // =================================================
            // RESULTADO
            // =================================================

            const resultado = {

                valido:
                    true,

                pago:
                    pago,

                sessionId:
                    session.id,

                pedidoId:
                    pedidoId,

                usuarioId:
                    usuarioId,

                curso:
                    curso,

                categoria:
                    categoria,

                descricao:
                    descricao,

                senhaCurso:
                    senhaCurso,

                usosRestantes:
                    usosRestantes,

                linkCurso:
                    linkCurso

            };

            // =================================================
            // LOG
            // =================================================

            console.log(
                "Pagamento consultado:"
            );

            console.log(
                "Pago:",
                pago
            );

            console.log(
                "Usuário:",
                usuarioId
            );

            console.log(
                "Pedido:",
                pedidoId
            );

            console.log(
                "Curso:",
                curso
            );

            console.log(
                "Categoria:",
                categoria
            );

            console.log(
                "Senha:",
                senhaCurso
                    ? "ENVIADA"
                    : "NÃO INFORMADA"
            );

            console.log(
                "Usos:",
                usosRestantes
            );

            console.log(
                "Link:",
                linkCurso
            );

            console.log(
                "======================================"
            );

            return res.json(
                resultado
            );

        }
        catch (error) {

            console.error(
                "Erro em /consultar-pagamento:",
                error
            );

            return res
                .status(500)
                .json({

                    valido:
                        false,

                    pago:
                        false,

                    erro:
                        error.message ||
                        "Erro interno do servidor."

                });

        }

    }
);

// =====================================================
// AGENDAR CURSO PRESENCIAL
// =====================================================

app.post(
    "/agendar-curso",
    async (req, res) => {

        try {

            const {

                pedidoId,

                usuarioId,

                data,

                horario

            } = req.body;

            // =================================================
            // VALIDAÇÕES
            // =================================================

            if (!pedidoId) {

                return res
                    .status(400)
                    .json({

                        sucesso:
                            false,

                        erro:
                            "pedidoId não informado."

                    });

            }

            if (!usuarioId) {

                return res
                    .status(400)
                    .json({

                        sucesso:
                            false,

                        erro:
                            "usuarioId não informado."

                    });

            }

            if (!data) {

                return res
                    .status(400)
                    .json({

                        sucesso:
                            false,

                        erro:
                            "Data não informada."

                    });

            }

            if (!horario) {

                return res
                    .status(400)
                    .json({

                        sucesso:
                            false,

                        erro:
                            "Horário não informado."

                    });

            }

            // =================================================
            // CRIAR AGENDAMENTO
            // =================================================

            const agendamento = {

                pedidoId:
                    String(
                        pedidoId
                    ),

                usuarioId:
                    String(
                        usuarioId
                    ),

                data:
                    String(
                        data
                    ),

                horario:
                    String(
                        horario
                    ),

                status:
                    "agendado",

                criadoEm:
                    FieldValue
                        .serverTimestamp()

            };

            // =================================================
            // FIRESTORE
            // =================================================

            const referencia =
                await db
                    .collection(
                        "agendamentos"
                    )
                    .add(
                        agendamento
                    );

            console.log(
                "Agendamento criado:",
                referencia.id
            );

            return res.json({

                sucesso:
                    true,

                agendamentoId:
                    referencia.id,

                mensagem:
                    "Curso agendado com sucesso."

            });

        }
        catch (error) {

            console.error(
                "Erro ao agendar curso:",
                error
            );

            return res
                .status(500)
                .json({

                    sucesso:
                        false,

                    erro:
                        error.message ||
                        "Erro ao salvar agendamento."

                });

        }

    }
);

// =====================================================
// WEBHOOK STRIPE
// =====================================================
//
// Não estamos ativando o webhook nesta versão.
//
// Quando for ativá-lo, NÃO coloque a rota depois
// de express.json(), porque a Stripe precisa do
// corpo bruto da requisição.
//
// =====================================================

// =====================================================
// TRATAMENTO DE ROTA NÃO ENCONTRADA
// =====================================================

app.use(
    (req, res) => {

        res
            .status(404)
            .json({

                erro:
                    "Rota não encontrada.",

                rota:
                    req.originalUrl

            });

    }
);

// =====================================================
// TRATAMENTO GLOBAL DE ERROS
// =====================================================

app.use(
    (error, req, res, next) => {

        console.error(
            "Erro não tratado:",
            error
        );

        res
            .status(500)
            .json({

                erro:
                    "Erro interno do servidor."

            });

    }
);

// =====================================================
// INICIAR SERVIDOR
// =====================================================

app.listen(
    PORT,
    () => {

        console.log(
            "======================================"
        );

        console.log(
            "SERVIDOR DA PLATAFORMA"
        );

        console.log(
            `Porta: ${PORT}`
        );

        console.log(
            "Stripe: configurada"
        );

        console.log(
            "Firebase Admin: configurado"
        );

        console.log(
            "======================================"
        );

    }
);
