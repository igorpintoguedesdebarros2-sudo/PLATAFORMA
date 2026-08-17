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
// VARIÁVEIS DO AMBIENTE
// =====================================================

const STRIPE_SECRET_KEY =
    process.env.STRIPE_SECRET_KEY;

const STRIPE_WEBHOOK_SECRET =
    process.env.STRIPE_WEBHOOK_SECRET;

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
// CORS
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
// O webhook precisa receber o corpo RAW.
// Por isso esta rota vem ANTES do express.json().
// =====================================================

app.post(
    "/webhook-stripe",
    express.raw({
        type: "application/json"
    }),
    async (req, res) => {

        if (!STRIPE_WEBHOOK_SECRET) {

            console.error(
                "STRIPE_WEBHOOK_SECRET não configurada."
            );

            return res
                .status(500)
                .send(
                    "Webhook Stripe não configurado."
                );
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
                    STRIPE_WEBHOOK_SECRET
                );

        } catch (error) {

            console.error(
                "Erro na assinatura do webhook:",
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
                "Webhook recebido:",
                evento.type
            );

            // =================================================
            // CHECKOUT CONCLUÍDO
            // =================================================

            if (
                evento.type ===
                "checkout.session.completed"
            ) {

                const session =
                    evento.data.object;

                const metadata =
                    session.metadata || {};

                const pedidoId =
                    metadata.pedidoId ||
                    metadata.pedido ||
                    "";

                const usuarioId =
                    metadata.usuarioId ||
                    metadata.userId ||
                    session.client_reference_id ||
                    "";

                console.log(
                    "Checkout concluído:",
                    session.id
                );

                console.log(
                    "Pedido:",
                    pedidoId
                );

                console.log(
                    "Usuário:",
                    usuarioId
                );

                // =================================================
                // SALVAR PAGAMENTO
                // =================================================

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
                                    usuarioId,

                                curso:
                                    metadata.curso ||
                                    "",

                                categoria:
                                    metadata.categoria ||
                                    "EAD",

                                descricao:
                                    metadata.descricao ||
                                    "",

                                pago:
                                    session.payment_status ===
                                    "paid",

                                paymentStatus:
                                    session.payment_status,

                                atualizadoEm:
                                    FieldValue
                                        .serverTimestamp()

                            },
                            {
                                merge: true
                            }
                        );

                    console.log(
                        "Pagamento salvo:",
                        pedidoId
                    );
                }
            }

            // =================================================
            // CHECKOUT EXPIRADO
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
            // PAYMENT INTENT
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
                "Erro processando webhook:",
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
// BUSCAR PEDIDO NO FIRESTORE
// =====================================================
//
// Esta função tenta localizar o pedido em:
//
// 1. pagamentos/{pedidoId}
// 2. solicitacoes_cursos/{pedidoId}
// 3. cursos/{pedidoId}
//
// Isso permite que o backend encontre senha,
// link e usos mesmo que eles não estejam na Stripe.
// =====================================================

async function buscarDadosPedido(
    pedidoId
) {

    if (!pedidoId) {

        return null;
    }

    console.log(
        "Buscando dados do pedido:",
        pedidoId
    );

    // =================================================
    // 1. PAGAMENTOS
    // =================================================

    try {

        const pagamento =
            await db
                .collection(
                    "pagamentos"
                )
                .doc(
                    pedidoId
                )
                .get();

        if (
            pagamento.exists
        ) {

            console.log(
                "Pedido encontrado em pagamentos."
            );

            return {

                id:
                    pagamento.id,

                ...pagamento.data()
            };
        }

    } catch (error) {

        console.error(
            "Erro buscando pagamentos:",
            error
        );
    }

    // =================================================
    // 2. SOLICITACOES_CURSO
    // =================================================

    try {

        const solicitacao =
            await db
                .collection(
                    "solicitacoes_cursos"
                )
                .doc(
                    pedidoId
                )
                .get();

        if (
            solicitacao.exists
        ) {

            console.log(
                "Pedido encontrado em solicitacoes_cursos."
            );

            return {

                id:
                    solicitacao.id,

                ...solicitacao.data()
            };
        }

    } catch (error) {

        console.error(
            "Erro buscando solicitacoes_cursos:",
            error
        );
    }

    // =================================================
    // 3. CURSOS
    // =================================================

    try {

        const curso =
            await db
                .collection(
                    "cursos"
                )
                .doc(
                    pedidoId
                )
                .get();

        if (
            curso.exists
        ) {

            console.log(
                "Pedido encontrado em cursos."
            );

            return {

                id:
                    curso.id,

                ...curso.data()
            };
        }

    } catch (error) {

        console.error(
            "Erro buscando cursos:",
            error
        );
    }

    // =================================================
    // NÃO ENCONTRADO
    // =================================================

    console.warn(
        "Pedido não encontrado no Firestore:",
        pedidoId
    );

    return null;
}

// =====================================================
// PEGAR PRIMEIRO VALOR VÁLIDO
// =====================================================

function primeiroValor(
    ...valores
) {

    for (
        const valor
        of valores
    ) {

        if (
            valor !== undefined &&
            valor !== null &&
            String(valor).trim() !== ""
        ) {

            return valor;
        }
    }

    return "";
}

// =====================================================
// CONSULTAR PAGAMENTO
// =====================================================

app.get(
    "/consultar-pagamento",
    async (req, res) => {

        try {

            const sessionId = String(
                req.query.session_id || ""
            ).trim();

            if (!sessionId) {

                return res.status(400).json({

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
                await stripe.checkout.sessions.retrieve(
                    sessionId
                );

            if (!session) {

                return res.status(404).json({

                    valido: false,
                    pago: false,

                    erro:
                        "Sessão Stripe não encontrada."

                });

            }

            // =================================================
            // STATUS
            // =================================================

            const pago =
                session.payment_status === "paid";

            // =================================================
            // METADATA STRIPE
            // =================================================

            const metadata =
                session.metadata || {};

            // =================================================
            // DADOS BÁSICOS
            // =================================================

            const usuarioId =
                metadata.usuarioId ||
                metadata.userId ||
                session.client_reference_id ||
                "";

            const pedidoId =
                metadata.pedidoId ||
                metadata.pedido ||
                "";

            let curso =
                metadata.curso ||
                "";

            let categoria =
                metadata.categoria ||
                "EAD";

            let descricao =
                metadata.descricao ||
                "Curso adquirido na plataforma.";

            let senhaCurso =
                metadata.senhaCurso ||
                metadata.senha ||
                metadata.senhaOficial ||
                metadata.senhaAcesso ||
                "";

            let usosRestantes =
                Number(metadata.usosRestantes);

            let linkCurso =
                metadata.linkCurso ||
                "";

            // =================================================
            // VALORES PADRÃO
            // =================================================

            if (!Number.isFinite(usosRestantes)) {

                usosRestantes = 0;

            }

            // =================================================
            // BUSCAR PEDIDO NO FIRESTORE
            // =================================================

            if (pedidoId) {

                console.log(
                    "Procurando pedido no Firestore:",
                    pedidoId
                );

                // =================================================
                // COLEÇÃO pedidos
                // =================================================

                try {

                    const pedidoRef =
                        await db
                            .collection("pedidos")
                            .doc(pedidoId)
                            .get();

                    if (pedidoRef.exists) {

                        const pedido =
                            pedidoRef.data() || {};

                        console.log(
                            "Pedido encontrado em pedidos:",
                            pedido
                        );

                        curso =
                            pedido.curso ||
                            curso;

                        categoria =
                            pedido.categoria ||
                            categoria;

                        descricao =
                            pedido.descricao ||
                            descricao;

                        senhaCurso =
                            pedido.senhaCurso ||
                            pedido.senha ||
                            pedido.senhaOficial ||
                            pedido.senhaAcesso ||
                            senhaCurso;

                        linkCurso =
                            pedido.linkCurso ||
                            pedido.link ||
                            linkCurso;

                        const usosPedido =
                            Number(
                                pedido.usosRestantes
                            );

                        if (
                            Number.isFinite(
                                usosPedido
                            )
                        ) {

                            usosRestantes =
                                usosPedido;

                        }

                    }

                }
                catch (error) {

                    console.warn(
                        "Erro ao consultar coleção pedidos:",
                        error.message
                    );

                }

                // =================================================
                // COLEÇÃO pagamentos
                // =================================================

                try {

                    const pagamentoRef =
                        await db
                            .collection("pagamentos")
                            .doc(pedidoId)
                            .get();

                    if (pagamentoRef.exists) {

                        const pagamento =
                            pagamentoRef.data() || {};

                        console.log(
                            "Pagamento encontrado no Firestore:",
                            pagamento
                        );

                        curso =
                            pagamento.curso ||
                            curso;

                        categoria =
                            pagamento.categoria ||
                            categoria;

                        descricao =
                            pagamento.descricao ||
                            descricao;

                        senhaCurso =
                            pagamento.senhaCurso ||
                            pagamento.senha ||
                            pagamento.senhaOficial ||
                            pagamento.senhaAcesso ||
                            senhaCurso;

                        linkCurso =
                            pagamento.linkCurso ||
                            pagamento.link ||
                            linkCurso;

                        const usosPagamento =
                            Number(
                                pagamento.usosRestantes
                            );

                        if (
                            Number.isFinite(
                                usosPagamento
                            )
                        ) {

                            usosRestantes =
                                usosPagamento;

                        }

                    }

                }
                catch (error) {

                    console.warn(
                        "Erro ao consultar coleção pagamentos:",
                        error.message
                    );

                }

            }

            // =================================================
            // BUSCAR NA COLEÇÃO solicitacoes_cursos
            // =================================================
            //
            // Caso seu sistema antigo tenha salvo o curso
            // nessa coleção.
            //
            // =================================================

            if (pedidoId) {

                try {

                    const snapshot =
                        await db
                            .collection(
                                "solicitacoes_cursos"
                            )
                            .where(
                                "pedidoId",
                                "==",
                                pedidoId
                            )
                            .limit(1)
                            .get();

                    if (!snapshot.empty) {

                        const documento =
                            snapshot.docs[0];

                        const solicitacao =
                            documento.data() || {};

                        console.log(
                            "Solicitação encontrada:",
                            solicitacao
                        );

                        curso =
                            solicitacao.curso ||
                            curso;

                        categoria =
                            solicitacao.categoria ||
                            categoria;

                        descricao =
                            solicitacao.descricao ||
                            descricao;

                        senhaCurso =
                            solicitacao.senhaCurso ||
                            solicitacao.senha ||
                            solicitacao.senhaOficial ||
                            solicitacao.senhaAcesso ||
                            senhaCurso;

                        linkCurso =
                            solicitacao.linkCurso ||
                            solicitacao.link ||
                            linkCurso;

                        const usosSolicitacao =
                            Number(
                                solicitacao.usosRestantes
                            );

                        if (
                            Number.isFinite(
                                usosSolicitacao
                            )
                        ) {

                            usosRestantes =
                                usosSolicitacao;

                        }

                    }

                }
                catch (error) {

                    console.warn(
                        "Erro ao consultar solicitacoes_cursos:",
                        error.message
                    );

                }

            }

            // =================================================
            // RESULTADO FINAL
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

            // =================================================
            // LOG
            // =================================================

            console.log(
                "======================================"
            );

            console.log(
                "RESULTADO FINAL"
            );

            console.log(
                "Curso:",
                curso
            );

            console.log(
                "Pedido:",
                pedidoId
            );

            console.log(
                "Usuário:",
                usuarioId
            );

            console.log(
                "Pagamento:",
                pago
            );

            console.log(
                "Senha:",
                senhaCurso
                    ? "ENCONTRADA"
                    : "NÃO ENCONTRADA"
            );

            console.log(
                "Usos:",
                usosRestantes
            );

            console.log(
                "Link:",
                linkCurso
                    ? "ENCONTRADO"
                    : "NÃO ENCONTRADO"
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

            if (
                error &&
                (
                    error.code ===
                    "StripeInvalidRequestError"

                    ||

                    error.statusCode === 404
                )
            ) {

                return res.status(404).json({

                    valido: false,

                    pago: false,

                    erro:
                        "Sessão Stripe não encontrada."

                });

            }

            return res.status(500).json({

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
            // VERIFICAR DUPLICIDADE
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
            // SALVAR
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
// ERRO GLOBAL
// =====================================================

app.use(
    (
        error,
        req,
        res,
        next
    ) => {

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
// INICIAR
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
