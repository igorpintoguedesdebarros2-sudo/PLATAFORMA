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

const PORT = process.env.PORT || 10000;

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
// VALIDAÇÃO
// =====================================================

if (!STRIPE_SECRET_KEY) {

    console.error(
        "ERRO: STRIPE_SECRET_KEY não configurada."
    );

    process.exit(1);
}

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

const apps = getApps();

if (apps.length > 0) {

    firebaseApp = apps[0];

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
// express.raw() precisa vir antes de express.json().
//
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
                "Assinatura Stripe inválida:",
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
                    "======================================"
                );

                console.log(
                    "CHECKOUT CONCLUÍDO"
                );

                console.log(
                    "Session:",
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

                console.log(
                    "Pagamento:",
                    session.payment_status
                );

                // =================================================
                // ATUALIZAR PEDIDO
                // =================================================

                if (pedidoId) {

                    await db
                        .collection(
                            "pedidos"
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

                    // =================================================
                    // PAGAMENTOS
                    // =================================================

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
                        "Pagamento atualizado no Firestore."
                    );
                }

                console.log(
                    "======================================"
                );
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

                const metadata =
                    session.metadata || {};

                const pedidoId =
                    metadata.pedidoId ||
                    "";

                if (pedidoId) {

                    await db
                        .collection(
                            "pedidos"
                        )
                        .doc(
                            pedidoId
                        )
                        .set(
                            {

                                pago:
                                    false,

                                paymentStatus:
                                    "expired",

                                atualizadoEm:
                                    FieldValue
                                        .serverTimestamp()

                            },

                            {
                                merge: true
                            }
                        );
                }

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

                    recebido:
                        false,

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

            ok:
                true,

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

            ok:
                true,

            status:
                "online",

            timestamp:
                new Date().toISOString()

        });
    }
);

// =====================================================
// CONFIGURAÇÃO DOS CURSOS
// =====================================================
//
// Firestore:
//
// cursos_config
//
// Documento:
//
// cursos_config/NR1
//
// Exemplo:
//
// {
//     nome: "NR1",
//     categoria: "EAD",
//     descricao: "Curso completo de NR1",
//     valor: 49.90,
//     senhaCurso: "NR1-2026-ABC",
//     linkCurso: "https://...",
//     usosRestantes: 1,
//     ativo: true
// }
//
// =====================================================

async function buscarConfiguracaoCurso(
    curso
) {

    if (!curso) {
        return null;
    }

    try {

        const documento =
            await db
                .collection(
                    "cursos_config"
                )
                .doc(
                    curso
                )
                .get();

        if (!documento.exists) {

            console.warn(
                "Curso não encontrado:",
                curso
            );

            return null;
        }

        return {

            id:
                documento.id,

            ...documento.data()

        };

    } catch (error) {

        console.error(
            "Erro buscando configuração do curso:",
            error
        );

        return null;
    }
}

// =====================================================
// USAR SENHA DO CURSO
// =====================================================
//
// POST:
//
// /usar-senha-curso
//
// Recebe:
//
// {
//     senha: "NR1-2026-ABC",
//     usuarioId: "UID_DO_FIREBASE"
// }
//
// O servidor:
//
// 1. Procura os pedidos do usuário.
// 2. Verifica pagamento.
// 3. Verifica senha.
// 4. Verifica usos restantes.
// 5. Diminui um uso.
// 6. Libera o acesso.
//
// =====================================================

app.post(
    "/usar-senha-curso",

    async (req, res) => {

        try {

            console.log(
                "======================================"
            );

            console.log(
                "VALIDAÇÃO DE SENHA DE CURSO"
            );

            const {
                senha,
                usuarioId
            } =
                req.body || {};

            // =================================================
            // VALIDAR SENHA
            // =================================================

            const senhaInformada =
                String(
                    senha || ""
                ).trim();

            if (!senhaInformada) {

                return res
                    .status(400)
                    .json({

                        valido:
                            false,

                        erro:
                            "Senha do curso não informada."

                    });
            }

            // =================================================
            // VALIDAR USUÁRIO
            // =================================================

            const usuarioIdInformado =
                String(
                    usuarioId || ""
                ).trim();

            if (!usuarioIdInformado) {

                return res
                    .status(400)
                    .json({

                        valido:
                            false,

                        erro:
                            "usuarioId não informado."

                    });
            }

            console.log(
                "Usuário:",
                usuarioIdInformado
            );

            console.log(
                "Senha recebida."
            );

            // =================================================
            // BUSCAR PEDIDOS DO USUÁRIO
            // =================================================

            const pedidosSnapshot =
                await db
                    .collection(
                        "pedidos"
                    )
                    .where(
                        "usuarioId",
                        "==",
                        usuarioIdInformado
                    )
                    .get();

            if (
                pedidosSnapshot.empty
            ) {

                console.warn(
                    "Nenhum pedido encontrado para o usuário."
                );

                return res
                    .status(404)
                    .json({

                        valido:
                            false,

                        erro:
                            "Nenhum curso encontrado para este usuário."

                    });
            }

            // =================================================
            // PROCURAR PEDIDO COM A SENHA
            // =================================================

            let pedidoEncontrado =
                null;

            let pedidoIdEncontrado =
                null;

            for (
                const documento
                of pedidosSnapshot.docs
            ) {

                const pedido =
                    documento.data() || {};

                const senhaBanco =
                    String(
                        pedido.senhaCurso || ""
                    ).trim();

                const pago =
                    pedido.pago === true;

                if (
                    senhaBanco ===
                    senhaInformada &&
                    pago
                ) {

                    pedidoEncontrado =
                        pedido;

                    pedidoIdEncontrado =
                        documento.id;

                    break;
                }
            }

            // =================================================
            // SENHA NÃO ENCONTRADA
            // =================================================

            if (
                !pedidoEncontrado
            ) {

                console.warn(
                    "Senha inválida ou curso não pago."
                );

                return res
                    .status(401)
                    .json({

                        valido:
                            false,

                        erro:
                            "Senha inválida ou inexistente."

                    });
            }

            // =================================================
            // DADOS DO PEDIDO
            // =================================================

            const curso =
                pedidoEncontrado.curso ||
                "";

            const categoria =
                pedidoEncontrado.categoria ||
                "EAD";

            const descricao =
                pedidoEncontrado.descricao ||
                "Curso adquirido na plataforma.";

            const linkCurso =
                pedidoEncontrado.linkCurso ||
                "";

            const usosAtuais =
                Number(
                    pedidoEncontrado.usosRestantes
                );

            // =================================================
            // VALIDAR USOS
            // =================================================

            if (
                !Number.isFinite(
                    usosAtuais
                )
            ) {

                return res
                    .status(500)
                    .json({

                        valido:
                            false,

                        erro:
                            "Quantidade de usos do curso não configurada."

                    });
            }

            if (
                usosAtuais <= 0
            ) {

                console.warn(
                    "Senha sem usos restantes."
                );

                return res
                    .status(403)
                    .json({

                        valido:
                            false,

                        erro:
                            "Esta senha não possui mais usos disponíveis."

                    });
            }

            // =================================================
            // DIMINUIR UM USO
            // =================================================
            //
            // Usamos transaction para evitar problemas
            // caso duas requisições tentem consumir
            // a mesma senha ao mesmo tempo.
            //
            // =================================================

            const pedidoRef =
                db
                    .collection(
                        "pedidos"
                    )
                    .doc(
                        pedidoIdEncontrado
                    );

            let usosRestantesFinal;

            await db.runTransaction(
                async (transaction) => {

                    const documentoAtual =
                        await transaction.get(
                            pedidoRef
                        );

                    if (
                        !documentoAtual.exists
                    ) {

                        throw new Error(
                            "Pedido não encontrado durante a validação."
                        );
                    }

                    const pedidoAtual =
                        documentoAtual.data() || {};

                    const usos =
                        Number(
                            pedidoAtual.usosRestantes
                        );

                    if (
                        !Number.isFinite(
                            usos
                        ) ||
                        usos <= 0
                    ) {

                        throw new Error(
                            "Esta senha não possui mais usos disponíveis."
                        );
                    }

                    const novoValor =
                        usos - 1;

                    transaction.update(
                        pedidoRef,
                        {

                            usosRestantes:
                                novoValor,

                            ultimoAcessoEm:
                                FieldValue
                                    .serverTimestamp(),

                            atualizadoEm:
                                FieldValue
                                    .serverTimestamp()

                        }
                    );

                    usosRestantesFinal =
                        novoValor;
                }
            );

            // =================================================
            // REGISTRAR ACESSO
            // =================================================

            await db
                .collection(
                    "acessos_cursos"
                )
                .add({

                    pedidoId:
                        pedidoIdEncontrado,

                    usuarioId:
                        usuarioIdInformado,

                    curso:
                        curso,

                    categoria:
                        categoria,

                    autorizado:
                        true,

                    usadoEm:
                        FieldValue
                            .serverTimestamp()

                });

            // =================================================
            // ATUALIZAR PAGAMENTO
            // =================================================

            await db
                .collection(
                    "pagamentos"
                )
                .doc(
                    pedidoIdEncontrado
                )
                .set(
                    {

                        ultimoAcessoEm:
                            FieldValue
                                .serverTimestamp(),

                        usosRestantes:
                            usosRestantesFinal

                    },

                    {
                        merge:
                            true
                    }
                );

            // =================================================
            // RESULTADO
            // =================================================

            console.log(
                "ACESSO AUTORIZADO"
            );

            console.log(
                "Pedido:",
                pedidoIdEncontrado
            );

            console.log(
                "Curso:",
                curso
            );

            console.log(
                "Usuário:",
                usuarioIdInformado
            );

            console.log(
                "Usos restantes:",
                usosRestantesFinal
            );

            console.log(
                "======================================"
            );

            return res.json({

                valido:
                    true,

                pedidoId:
                    pedidoIdEncontrado,

                usuarioId:
                    usuarioIdInformado,

                curso:
                    curso,

                categoria:
                    categoria,

                descricao:
                    descricao,

                linkCurso:
                    linkCurso,

                usosRestantes:
                    usosRestantesFinal,

                autorizadoEm:
                    new Date()
                        .toISOString()

            });

        } catch (error) {

            console.error(
                "======================================"
            );

            console.error(
                "ERRO AO USAR SENHA DO CURSO"
            );

            console.error(
                error
            );

            console.error(
                "======================================"
            );

            return res
                .status(500)
                .json({

                    valido:
                        false,

                    erro:
                        error.message ||
                        "Erro interno ao validar senha."

                });
        }
    }
);

// =====================================================
// CRIAR PAGAMENTO
// =====================================================

app.post(
    "/criar-pagamento",

    async (req, res) => {

        try {

            const {
                curso,
                pedidoId,
                usuarioId
            } =
                req.body || {};

            // =================================================
            // VALIDAÇÃO
            // =================================================

            if (!curso) {

                return res
                    .status(400)
                    .json({

                        erro:
                            "Curso não informado."

                    });
            }

            if (!pedidoId) {

                return res
                    .status(400)
                    .json({

                        erro:
                            "pedidoId não informado."

                    });
            }

            if (!usuarioId) {

                return res
                    .status(400)
                    .json({

                        erro:
                            "usuarioId não informado."

                    });
            }

            // =================================================
            // BUSCAR CURSO
            // =================================================

            const configuracao =
                await buscarConfiguracaoCurso(
                    curso
                );

            if (!configuracao) {

                return res
                    .status(404)
                    .json({

                        erro:
                            "Curso não cadastrado no servidor."

                    });
            }

            // =================================================
            // VERIFICAR ATIVO
            // =================================================

            if (
                configuracao.ativo === false
            ) {

                return res
                    .status(400)
                    .json({

                        erro:
                            "Este curso não está disponível para compra."

                    });
            }

            // =================================================
            // PREÇO
            // =================================================

            const valor =
                Number(
                    configuracao.valor
                );

            if (
                !Number.isFinite(valor) ||
                valor <= 0
            ) {

                return res
                    .status(400)
                    .json({

                        erro:
                            "Preço do curso não configurado corretamente."

                    });
            }

            const valorCentavos =
                Math.round(
                    valor * 100
                );

            // =================================================
            // CRIAR PEDIDO
            // =================================================

            await db
                .collection(
                    "pedidos"
                )
                .doc(
                    pedidoId
                )
                .set({

                    pedidoId:
                        pedidoId,

                    usuarioId:
                        usuarioId,

                    curso:
                        curso,

                    categoria:
                        configuracao.categoria ||
                        "EAD",

                    descricao:
                        configuracao.descricao ||
                        "Curso adquirido na plataforma.",

                    valor:
                        valor,

                    senhaCurso:
                        configuracao.senhaCurso ||
                        "",

                    linkCurso:
                        configuracao.linkCurso ||
                        "",

                    usosRestantes:
                        Number.isFinite(
                            Number(
                                configuracao.usosRestantes
                            )
                        )
                            ? Number(
                                configuracao.usosRestantes
                            )
                            : 0,

                    pago:
                        false,

                    paymentStatus:
                        "pending",

                    criadoEm:
                        FieldValue
                            .serverTimestamp(),

                    atualizadoEm:
                        FieldValue
                            .serverTimestamp()

                });

            // =================================================
            // CRIAR CHECKOUT STRIPE
            // =================================================

            const session =
                await stripe
                    .checkout
                    .sessions
                    .create({

                        mode:
                            "payment",

                        payment_method_types:
                            [
                                "card"
                            ],

                        line_items:
                            [

                                {

                                    price_data:
                                        {

                                            currency:
                                                "brl",

                                            product_data:
                                                {

                                                    name:
                                                        curso,

                                                    description:
                                                        configuracao.descricao ||
                                                        "Curso online."

                                                },

                                            unit_amount:
                                                valorCentavos

                                        },

                                    quantity:
                                        1

                                }

                            ],

                        client_reference_id:
                            usuarioId,

                        metadata:
                            {

                                pedidoId:
                                    pedidoId,

                                usuarioId:
                                    usuarioId,

                                curso:
                                    curso,

                                categoria:
                                    configuracao.categoria ||
                                    "EAD"

                            },

                        success_url:
                            "https://igorpintoguedesdebarros2-sudo.github.io/PLATAFORMA/sucesso.html?session_id={CHECKOUT_SESSION_ID}",

                        cancel_url:
                            "https://igorpintoguedesdebarros2-sudo.github.io/PLATAFORMA/pagamento.html"

                    });

            // =================================================
            // SALVAR SESSION ID
            // =================================================

            await db
                .collection(
                    "pedidos"
                )
                .doc(
                    pedidoId
                )
                .set(
                    {

                        sessionId:
                            session.id,

                        atualizadoEm:
                            FieldValue
                                .serverTimestamp()

                    },

                    {
                        merge:
                            true
                    }
                );

            console.log(
                "Pagamento criado:",
                session.id
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
                "Valor:",
                valor
            );

            return res.json({

                sucesso:
                    true,

                id:
                    session.id,

                sessionId:
                    session.id,

                pedidoId:
                    pedidoId

            });

        } catch (error) {

            console.error(
                "Erro em /criar-pagamento:",
                error
            );

            return res
                .status(500)
                .json({

                    sucesso:
                        false,

                    erro:
                        error.message ||
                        "Erro ao criar pagamento."

                });
        }
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

            if (!sessionId) {

                return res
                    .status(400)
                    .json({

                        valido:
                            false,

                        pago:
                            false,

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

                        valido:
                            false,

                        pago:
                            false,

                        erro:
                            "Sessão Stripe não encontrada."

                    });
            }

            const pago =
                session.payment_status ===
                "paid";

            const metadata =
                session.metadata || {};

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
                "Curso adquirido na plataforma.";

            let senhaCurso =
                "";

            let usosRestantes =
                0;

            let linkCurso =
                "";

            let valor =
                0;

            // =================================================
            // BUSCAR PEDIDO
            // =================================================

            if (pedidoId) {

                const pedidoRef =
                    await db
                        .collection(
                            "pedidos"
                        )
                        .doc(
                            pedidoId
                        )
                        .get();

                if (
                    pedidoRef.exists
                ) {

                    const pedido =
                        pedidoRef.data() ||
                        {};

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
                        "";

                    linkCurso =
                        pedido.linkCurso ||
                        "";

                    valor =
                        Number(
                            pedido.valor
                        ) || 0;

                    const usos =
                        Number(
                            pedido.usosRestantes
                        );

                    if (
                        Number.isFinite(
                            usos
                        )
                    ) {

                        usosRestantes =
                            usos;
                    }
                }
            }

            // =================================================
            // PAGAMENTO
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
                                curso,

                            categoria:
                                categoria,

                            valor:
                                valor,

                            pago:
                                pago,

                            paymentStatus:
                                session.payment_status,

                            atualizadoEm:
                                FieldValue
                                    .serverTimestamp()

                        },

                        {
                            merge:
                                true
                        }
                    );
            }

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
                    pago
                        ? senhaCurso
                        : "",

                usosRestantes:
                    pago
                        ? usosRestantes
                        : 0,

                linkCurso:
                    pago
                        ? linkCurso
                        : "",

                valor:
                    valor,

                paymentStatus:
                    session.payment_status

            };

            console.log(
                "======================================"
            );

            console.log(
                "RESULTADO"
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
                "Pagamento:",
                pago
            );

            console.log(
                "Senha:",
                pago && senhaCurso
                    ? "ENCONTRADA"
                    : "NÃO ENCONTRADA"
            );

            console.log(
                "Link:",
                pago && linkCurso
                    ? "ENCONTRADO"
                    : "NÃO ENCONTRADO"
            );

            console.log(
                "Usos:",
                usosRestantes
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

            if (
                error &&
                (
                    error.code ===
                    "StripeInvalidRequestError" ||

                    error.statusCode ===
                    404
                )
            ) {

                return res
                    .status(404)
                    .json({

                        valido:
                            false,

                        pago:
                            false,

                        erro:
                            "Sessão Stripe não encontrada."

                    });
            }

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
            } =
                req.body || {};

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
            // PEGAR PEDIDO
            // =================================================

            const pedidoRef =
                await db
                    .collection(
                        "pedidos"
                    )
                    .doc(
                        pedidoId
                    )
                    .get();

            if (
                !pedidoRef.exists
            ) {

                return res
                    .status(404)
                    .json({

                        sucesso:
                            false,

                        erro:
                            "Pedido não encontrado."

                    });
            }

            const pedido =
                pedidoRef.data();

            // =================================================
            // VERIFICAR USUÁRIO
            // =================================================

            if (
                pedido.usuarioId !==
                usuarioId
            ) {

                return res
                    .status(403)
                    .json({

                        sucesso:
                            false,

                        erro:
                            "Este pedido pertence a outro usuário."

                    });
            }

            // =================================================
            // VERIFICAR PAGAMENTO
            // =================================================

            if (
                pedido.pago !== true
            ) {

                return res
                    .status(400)
                    .json({

                        sucesso:
                            false,

                        erro:
                            "O curso ainda não foi pago."

                    });
            }

            // =================================================
            // VERIFICAR CATEGORIA
            // =================================================

            if (
                String(
                    pedido.categoria ||
                    ""
                ).toLowerCase() !==
                "presencial"
            ) {

                return res
                    .status(400)
                    .json({

                        sucesso:
                            false,

                        erro:
                            "Este curso não é presencial."

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
                    .limit(
                        1
                    )
                    .get();

            if (
                !existente.empty
            ) {

                return res
                    .status(409)
                    .json({

                        sucesso:
                            false,

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

                curso:
                    pedido.curso ||
                    "",

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

            // =================================================
            // ATUALIZAR PEDIDO
            // =================================================

            await db
                .collection(
                    "pedidos"
                )
                .doc(
                    pedidoId
                )
                .set(
                    {

                        agendamento:
                            {

                                agendamentoId:
                                    referencia.id,

                                data:
                                    data,

                                horario:
                                    horario,

                                status:
                                    "agendado"

                            },

                        atualizadoEm:
                            FieldValue
                                .serverTimestamp()

                    },

                    {
                        merge:
                            true
                    }
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

        } catch (error) {

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
// 404
// =====================================================

app.use(
    (req, res) => {

        console.warn(
            "Rota não encontrada:",
            req.method,
            req.originalUrl
        );

        res
            .status(404)
            .json({

                ok:
                    false,

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

                ok:
                    false,

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
            "Rota /usar-senha-curso: OK"
        );

        console.log(
            "Servidor online."
        );

        console.log(
            "======================================"
        );
    }
);