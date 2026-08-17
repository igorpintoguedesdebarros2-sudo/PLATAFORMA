import express from "express";
import cors from "cors";
import Stripe from "stripe";

import {
    cert,
    getApps,
    initializeApp
} from "firebase-admin/app";

import {
    FieldValue,
    getFirestore
} from "firebase-admin/firestore";

// =====================================================
// CONFIGURAÇÃO
// =====================================================

const app = express();

const PORT =
    process.env.PORT || 10000;

// =====================================================
// VALIDAR VARIÁVEIS DO AMBIENTE
// =====================================================

const STRIPE_SECRET_KEY =
    process.env.STRIPE_SECRET_KEY;

const FIREBASE_PROJECT_ID =
    process.env.FIREBASE_PROJECT_ID;

const FIREBASE_CLIENT_EMAIL =
    process.env.FIREBASE_CLIENT_EMAIL;

const FIREBASE_PRIVATE_KEY =
    process.env.FIREBASE_PRIVATE_KEY;

// =====================================================
// VALIDAR STRIPE
// =====================================================

if (!STRIPE_SECRET_KEY) {

    console.error(
        "ERRO: STRIPE_SECRET_KEY não configurada."
    );

    process.exit(1);
}

// =====================================================
// VALIDAR FIREBASE
// =====================================================

if (!FIREBASE_PROJECT_ID) {

    console.error(
        "ERRO: FIREBASE_PROJECT_ID não configurada."
    );

    process.exit(1);
}

if (!FIREBASE_CLIENT_EMAIL) {

    console.error(
        "ERRO: FIREBASE_CLIENT_EMAIL não configurada."
    );

    process.exit(1);
}

if (!FIREBASE_PRIVATE_KEY) {

    console.error(
        "ERRO: FIREBASE_PRIVATE_KEY não configurada."
    );

    process.exit(1);
}

// =====================================================
// STRIPE
// =====================================================

const stripe =
    new Stripe(
        STRIPE_SECRET_KEY
    );

// =====================================================
// FIREBASE ADMIN
// =====================================================
//
// Firebase Admin SDK 14.x
//
// NÃO usar:
// admin.apps.length
//
// Usamos:
// getApps()
// initializeApp()
// getFirestore()
//
// =====================================================

let firebaseApp;

const apps =
    getApps();

if (apps.length > 0) {

    firebaseApp =
        apps[0];

    console.log(
        "Firebase Admin já estava inicializado."
    );

} else {

    const privateKey =
        FIREBASE_PRIVATE_KEY
            .replace(/\\n/g, "\n");

    firebaseApp =
        initializeApp({

            credential:
                cert({

                    projectId:
                        FIREBASE_PROJECT_ID,

                    clientEmail:
                        FIREBASE_CLIENT_EMAIL,

                    privateKey:
                        privateKey
                })
        });

    console.log(
        "Firebase Admin inicializado."
    );
}

// =====================================================
// FIRESTORE
// =====================================================

const db =
    getFirestore(
        firebaseApp
    );

// =====================================================
// MIDDLEWARE
// =====================================================

app.use(
    cors({
        origin: "*"
    })
);

// =====================================================
// WEBHOOK STRIPE
// =====================================================
//
// IMPORTANTE:
//
// O webhook precisa do corpo RAW.
//
// Por isso esta rota fica ANTES de
// express.json().
//
// =====================================================

app.post(
    "/webhook-stripe",
    express.raw({
        type: "application/json"
    }),
    async (req, res) => {

        const webhookSecret =
            process.env.STRIPE_WEBHOOK_SECRET;

        if (!webhookSecret) {

            console.error(
                "STRIPE_WEBHOOK_SECRET não configurada."
            );

            return res
                .status(500)
                .send("Webhook não configurado.");
        }

        const assinatura =
            req.headers[
                "stripe-signature"
            ];

        if (!assinatura) {

            return res
                .status(400)
                .send(
                    "Assinatura Stripe ausente."
                );
        }

        let evento;

        try {

            evento =
                stripe.webhooks.constructEvent(
                    req.body,
                    assinatura,
                    webhookSecret
                );

        } catch (error) {

            console.error(
                "Assinatura do webhook inválida:",
                error.message
            );

            return res
                .status(400)
                .send(
                    `Webhook Error: ${error.message}`
                );
        }

        try {

            console.log(
                "Webhook Stripe recebido:",
                evento.type
            );

            // =================================================
            // PAGAMENTO CONCLUÍDO
            // =================================================

            if (
                evento.type ===
                "checkout.session.completed"
            ) {

                const session =
                    evento.data.object;

                console.log(
                    "Checkout concluído:",
                    session.id
                );

                console.log(
                    "Pagamento:",
                    session.payment_status
                );

                console.log(
                    "Metadata:",
                    session.metadata || {}
                );

                // ---------------------------------------------
                // Se quiser salvar o pagamento no Firestore
                // ---------------------------------------------

                const metadata =
                    session.metadata || {};

                const pedidoId =
                    metadata.pedidoId ||
                    metadata.pedido ||
                    "";

                if (pedidoId) {

                    await db
                        .collection(
                            "pagamentos"
                        )
                        .doc(
                            pedidoId
                        )
                        .set(
                            {

                                sessionId:
                                    session.id,

                                pedidoId:
                                    pedidoId,

                                usuarioId:
                                    metadata.usuarioId ||
                                    metadata.userId ||
                                    session.client_reference_id ||
                                    "",

                                curso:
                                    metadata.curso ||
                                    "",

                                categoria:
                                    metadata.categoria ||
                                    "EAD",

                                pago:
                                    session.payment_status ===
                                    "paid",

                                paymentStatus:
                                    session.payment_status,

                                atualizadoEm:
                                    FieldValue.serverTimestamp()

                            },
                            {
                                merge: true
                            }
                        );

                    console.log(
                        "Pagamento salvo no Firestore:",
                        pedidoId
                    );
                }
            }

            // =================================================
            // PAGAMENTO EXPIRADO
            // =================================================

            if (
                evento.type ===
                "checkout.session.expired"
            ) {

                const session =
                    evento.data.object;

                console.log(
                    "Checkout expirado:",
                    session.id
                );
            }

            // =================================================
            // PAGAMENTO PROCESSADO
            // =================================================

            if (
                evento.type ===
                "payment_intent.succeeded"
            ) {

                const paymentIntent =
                    evento.data.object;

                console.log(
                    "PaymentIntent confirmado:",
                    paymentIntent.id
                );
            }

            return res.json({
                recebido: true
            });

        } catch (error) {

            console.error(
                "Erro ao processar webhook:",
                error
            );

            return res
                .status(500)
                .json({

                    recebido: false,

                    erro:
                        error.message ||
                        "Erro ao processar webhook."
                });
        }
    }
);

// =====================================================
// JSON NORMAL
// =====================================================

app.use(
    express.json()
);

// =====================================================
// ROTA PRINCIPAL
// =====================================================

app.get(
    "/",
    (req, res) => {

        res.json({

            ok: true,

            servidor:
                "Plataforma",

            status:
                "online",

            firebase:
                "conectado",

            stripe:
                "configurada"
        });
    }
);

// =====================================================
// HEALTH CHECK
// =====================================================

app.get(
    "/health",
    (req, res) => {

        res.json({

            ok: true,

            status:
                "online",

            timestamp:
                new Date().toISOString()
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
                String(
                    req.query.session_id ||
                    ""
                ).trim();

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
            // BUSCAR STRIPE
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
            // STATUS DO PAGAMENTO
            // =================================================

            const pago =
                session.payment_status ===
                "paid";

            // =================================================
            // METADATA
            // =================================================

            const metadata =
                session.metadata ||
                {};

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
            //
            // IMPORTANTE:
            //
            // A senha deve vir do servidor/backend.
            //
            // O frontend não deve gerar senha.
            //
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

            const usosNumero =
                Number(
                    metadata.usosRestantes
                );

            const usosRestantes =
                Number.isFinite(
                    usosNumero
                )
                    ? usosNumero
                    : 0;

            // =================================================
            // RESULTADO
            // =================================================

            const resultado = {

                valido: true,

                pago: pago,

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
                    linkCurso,

                paymentStatus:
                    session.payment_status
            };

            console.log(
                "Resultado:",
                resultado
            );

            console.log(
                "======================================"
            );

            return res.json(
                resultado
            );

        } catch (error) {

            console.error(
                "Erro em /consultar-pagamento:",
                error
            );

            // =================================================
            // SESSION NÃO EXISTE
            // =================================================

            if (
                error &&
                (
                    error.code ===
                    "StripeInvalidRequestError"
                    ||
                    error.statusCode ===
                    404
                )
            ) {

                return res
                    .status(404)
                    .json({

                        valido: false,

                        pago: false,

                        erro:
                            "Sessão Stripe não encontrada."
                    });
            }

            return res
                .status(500)
                .json({

                    valido: false,

                    pago: false,

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

            } = req.body || {};

            // =================================================
            // VALIDAÇÕES
            // =================================================

            if (!pedidoId) {

                return res
                    .status(400)
                    .json({

                        sucesso: false,

                        erro:
                            "pedidoId não informado."
                    });
            }

            if (!usuarioId) {

                return res
                    .status(400)
                    .json({

                        sucesso: false,

                        erro:
                            "usuarioId não informado."
                    });
            }

            if (!data) {

                return res
                    .status(400)
                    .json({

                        sucesso: false,

                        erro:
                            "Data não informada."
                    });
            }

            if (!horario) {

                return res
                    .status(400)
                    .json({

                        sucesso: false,

                        erro:
                            "Horário não informado."
                    });
            }

            // =================================================
            // VERIFICAR SE JÁ EXISTE AGENDAMENTO
            // =================================================

            const existente =
                await db
                    .collection(
                        "agendamentos"
                    )
                    .where(
                        "pedidoId",
                        "==",
                        pedidoId
                    )
                    .limit(1)
                    .get();

            if (
                !existente.empty
            ) {

                return res
                    .status(409)
                    .json({

                        sucesso: false,

                        erro:
                            "Este curso já possui um agendamento."
                    });
            }

            // =================================================
            // CRIAR AGENDAMENTO
            // =================================================

            const agendamento = {

                pedidoId:
                    pedidoId,

                usuarioId:
                    usuarioId,

                data:
                    data,

                horario:
                    horario,

                status:
                    "agendado",

                criadoEm:
                    FieldValue
                        .serverTimestamp()
            };

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

                sucesso: true,

                agendamentoId:
                    referencia.id,

                mensagem:
                    "Curso agendado com sucesso."
            });

        } catch (error) {

            console.error(
                "Erro ao agendar curso:",
                error
            );

            return res
                .status(500)
                .json({

                    sucesso: false,

                    erro:
                        error.message ||
                        "Erro ao salvar agendamento."
                });
        }
    }
);

// =====================================================
// 404
// =====================================================

app.use(
    (req, res) => {

        res
            .status(404)
            .json({

                ok: false,

                erro:
                    "Rota não encontrada."
            });
    }
);

// =====================================================
// TRATAMENTO DE ERROS
// =====================================================

app.use(
    (error, req, res, next) => {

        console.error(
            "Erro não tratado:",
            error
        );

        if (
            res.headersSent
        ) {

            return next(
                error
            );
        }

        res
            .status(500)
            .json({

                ok: false,

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
            "PLATAFORMA BACKEND"
        );

        console.log(
            "======================================"
        );

        console.log(
            `Porta: ${PORT}`
        );

        console.log(
            "Express: OK"
        );

        console.log(
            "Stripe: OK"
        );

        console.log(
            "Firebase Admin: OK"
        );

        console.log(
            "Firestore: OK"
        );

        console.log(
            "Servidor online."
        );

        console.log(
            "======================================"
        );
    }
);