const express = require("express");
const cors = require("cors");
const Stripe = require("stripe");
const dotenv = require("dotenv");
const admin = require("firebase-admin");

// =====================================================
// DOTENV
// =====================================================

dotenv.config();

// =====================================================
// VARIÁVEIS DE AMBIENTE
// =====================================================

const FIREBASE_PROJECT_ID =
    process.env.FIREBASE_PROJECT_ID?.trim();

const FIREBASE_CLIENT_EMAIL =
    process.env.FIREBASE_CLIENT_EMAIL?.trim();

const FIREBASE_PRIVATE_KEY =
    process.env.FIREBASE_PRIVATE_KEY
        ?.replace(/\\n/g, "\n")
        .trim();

const FIREBASE_DATABASE_URL =
    process.env.FIREBASE_DATABASE_URL?.trim();

const STRIPE_SECRET_KEY =
    process.env.STRIPE_SECRET_KEY?.trim();

// =====================================================
// LOG INICIAL
// =====================================================

console.log("======================================");
console.log("INICIANDO API PLATAFORMA");
console.log("======================================");

console.log(
    "FIREBASE_PROJECT_ID:",
    FIREBASE_PROJECT_ID ? "OK" : "AUSENTE"
);

console.log(
    "FIREBASE_CLIENT_EMAIL:",
    FIREBASE_CLIENT_EMAIL ? "OK" : "AUSENTE"
);

console.log(
    "FIREBASE_PRIVATE_KEY:",
    FIREBASE_PRIVATE_KEY ? "OK" : "AUSENTE"
);

console.log(
    "FIREBASE_DATABASE_URL:",
    FIREBASE_DATABASE_URL ? "OK" : "AUSENTE"
);

console.log(
    "STRIPE_SECRET_KEY:",
    STRIPE_SECRET_KEY ? "OK" : "AUSENTE"
);

// =====================================================
// VALIDAR FIREBASE
// =====================================================

if (
    !FIREBASE_PROJECT_ID ||
    !FIREBASE_CLIENT_EMAIL ||
    !FIREBASE_PRIVATE_KEY ||
    !FIREBASE_DATABASE_URL
) {

    console.error("======================================");
    console.error(
        "ERRO: configuração do Firebase incompleta."
    );
    console.error(
        "Verifique:"
    );
    console.error(
        "FIREBASE_PROJECT_ID"
    );
    console.error(
        "FIREBASE_CLIENT_EMAIL"
    );
    console.error(
        "FIREBASE_PRIVATE_KEY"
    );
    console.error(
        "FIREBASE_DATABASE_URL"
    );
    console.error("======================================");

    process.exit(1);
}

// =====================================================
// VALIDAR STRIPE
// =====================================================

if (!STRIPE_SECRET_KEY) {

    console.error("======================================");
    console.error(
        "ERRO: STRIPE_SECRET_KEY não configurada."
    );
    console.error("======================================");

    process.exit(1);
}

// =====================================================
// SERVICE ACCOUNT
// =====================================================

const serviceAccount = {

    projectId:
        FIREBASE_PROJECT_ID,

    clientEmail:
        FIREBASE_CLIENT_EMAIL,

    privateKey:
        FIREBASE_PRIVATE_KEY

};

// =====================================================
// FIREBASE ADMIN
// =====================================================

try {

    if (!admin.apps.length) {

        admin.initializeApp({

            credential:
                admin.credential.cert(
                    serviceAccount
                ),

            databaseURL:
                FIREBASE_DATABASE_URL

        });

        console.log(
            "Firebase Admin inicializado."
        );

    } else {

        console.log(
            "Firebase Admin já estava inicializado."
        );

    }

} catch (error) {

    console.error(
        "ERRO AO INICIALIZAR FIREBASE:"
    );

    console.error(error);

    process.exit(1);
}

// =====================================================
// DATABASE
// =====================================================

const db =
    admin.database();

console.log(
    "Firebase Realtime Database conectado."
);

// =====================================================
// STRIPE
// =====================================================

const stripe =
    Stripe(
        STRIPE_SECRET_KEY
    );

console.log(
    "Stripe inicializado."
);

// =====================================================
// EXPRESS
// =====================================================

const app =
    express();

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
            "PATCH",
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
    express.json({
        limit: "1mb"
    })
);

// =====================================================
// LOG DE REQUISIÇÕES
// =====================================================

app.use(
    (req, res, next) => {

        console.log(
            `[${new Date().toISOString()}]`,
            req.method,
            req.originalUrl
        );

        next();

    }
);

// =====================================================
// CURSOS
// =====================================================

const cursos = {

    "NR1": {

        valor:
            49.90,

        categoria:
            "EAD",

        link:
            "https://igorpintoguedesdebarros2-sudo.github.io/PLATAFORMA/NR1.html"

    },

    "CSS Completo": {

        valor:
            39.90,

        categoria:
            "EAD",

        link:
            "https://igorpintoguedesdebarros2-sudo.github.io/PLATAFORMA/css.html"

    },

    "JavaScript": {

        valor:
            59.90,

        categoria:
            "EAD",

        link:
            "https://igorpintoguedesdebarros2-sudo.github.io/PLATAFORMA/javascript.html"

    },

    "Python": {

        valor:
            69.90,

        categoria:
            "EAD",

        link:
            "https://igorpintoguedesdebarros2-sudo.github.io/PLATAFORMA/python.html"

    },

    "Firebase": {

        valor:
            79.90,

        categoria:
            "EAD",

        link:
            "https://igorpintoguedesdebarros2-sudo.github.io/PLATAFORMA/firebase.html"

    },

    "Python Presencial": {

        valor:
            99.90,

        categoria:
            "Presencial",

        link:
            ""

    }

};

// =====================================================
// FUNÇÃO: GERAR ID DO PEDIDO
// =====================================================

function gerarPedidoId() {

    return (
        `pedido_${Date.now()}_` +
        Math.random()
            .toString(36)
            .substring(2, 10)
    );

}

// =====================================================
// FUNÇÃO: GERAR SENHA DO CURSO
// =====================================================

function gerarSenhaCurso() {

    const caracteres =
        "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789";

    let senha =
        "";

    for (
        let i = 0;
        i < 12;
        i++
    ) {

        const indice =
            Math.floor(
                Math.random() *
                caracteres.length
            );

        senha +=
            caracteres[indice];

    }

    return senha;

}

// =====================================================
// FUNÇÃO: VALIDAR CURSO
// =====================================================

function obterCurso(curso) {

    if (!curso) {

        return null;

    }

    return cursos[curso] || null;

}

// =====================================================
// FUNÇÃO: DATA ATUAL
// =====================================================

function dataAtual() {

    return new Date().toISOString();

}

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
            } = req.body || {};

            console.log("======================================");
            console.log("NOVO PAGAMENTO");
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
            console.log("======================================");

            // =================================================
            // VALIDAR CURSO
            // =================================================

            if (!curso) {

                return res.status(400).json({

                    sucesso:
                        false,

                    erro:
                        "Curso não informado."

                });

            }

            const cursoSelecionado =
                obterCurso(curso);

            if (!cursoSelecionado) {

                return res.status(400).json({

                    sucesso:
                        false,

                    erro:
                        "Curso inválido."

                });

            }

            // =================================================
            // VALIDAR USUÁRIO
            // =================================================

            if (
                !usuarioId ||
                String(usuarioId).trim() === ""
            ) {

                return res.status(400).json({

                    sucesso:
                        false,

                    erro:
                        "Usuário não informado."

                });

            }

            // =================================================
            // ID DO PEDIDO
            // =================================================

            const idPedido =
                pedidoId ||
                gerarPedidoId();

            // =================================================
            // REFERÊNCIA
            // =================================================

            const pedidoRef =
                db.ref(
                    `solicitacoes_cursos/${idPedido}`
                );

            // =================================================
            // VERIFICAR PEDIDO EXISTENTE
            // =================================================

            const pedidoExistenteSnapshot =
                await pedidoRef.once(
                    "value"
                );

            if (
                pedidoExistenteSnapshot.exists()
            ) {

                const pedidoExistente =
                    pedidoExistenteSnapshot.val();

                // ---------------------------------------------
                // Se já existe checkout
                // ---------------------------------------------

                if (
                    pedidoExistente.pagamentoId &&
                    pedidoExistente.status ===
                        "aguardando_pagamento"
                ) {

                    console.log(
                        "Pedido já possui Checkout Stripe."
                    );

                    return res.json({

                        sucesso:
                            true,

                        id:
                            pedidoExistente.pagamentoId,

                        pedidoId:
                            idPedido,

                        curso:
                            pedidoExistente.curso,

                        valor:
                            pedidoExistente.valor,

                        categoria:
                            pedidoExistente.categoria,

                        existente:
                            true

                    });

                }

            }

            // =================================================
            // PEDIDO INICIAL
            // =================================================

            const pedidoInicial = {

                pedidoId:
                    idPedido,

                usuarioId:
                    String(usuarioId),

                curso:
                    curso,

                valor:
                    cursoSelecionado.valor,

                categoria:
                    cursoSelecionado.categoria,

                linkCurso:
                    cursoSelecionado.link,

                status:
                    "aguardando_pagamento",

                pago:
                    false,

                pagamentoId:
                    null,

                senhaCurso:
                    null,

                usosRestantes:
                    null,

                dataPagamento:
                    null,

                agendamento:
                    null,

                criadoEm:
                    dataAtual()

            };

            await pedidoRef.set(
                pedidoInicial
            );

            // =================================================
            // STRIPE CHECKOUT
            // =================================================

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
                                            cursoSelecionado.valor *
                                            100
                                        )

                                },

                                quantity:
                                    1

                            }

                        ],

                        mode:
                            "payment",

                        metadata: {

                            pedidoId:
                                String(
                                    idPedido
                                ),

                            usuarioId:
                                String(
                                    usuarioId
                                ),

                            curso:
                                String(
                                    curso
                                )

                        },

                        success_url:
                            "https://igorpintoguedesdebarros2-sudo.github.io/PLATAFORMA/sucesso.html?session_id={CHECKOUT_SESSION_ID}",

                        cancel_url:
                            "https://igorpintoguedesdebarros2-sudo.github.io/PLATAFORMA/cancelado.html"

                    });

            // =================================================
            // SALVAR SESSION
            // =================================================

            await pedidoRef.update({

                pagamentoId:
                    session.id

            });

            // =================================================
            // RESPOSTA
            // =================================================

            return res.json({

                sucesso:
                    true,

                id:
                    session.id,

                pedidoId:
                    idPedido,

                curso:
                    curso,

                valor:
                    cursoSelecionado.valor,

                categoria:
                    cursoSelecionado.categoria,

                url:
                    session.url || null

            });

        }

        catch (error) {

            console.error("======================================");
            console.error(
                "ERRO CRIAR PAGAMENTO:"
            );
            console.error(error);
            console.error("======================================");

            return res.status(500).json({

                sucesso:
                    false,

                erro:
                    "Não foi possível criar o pagamento.",

                detalhe:
                    error.message

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

            const {
                session_id
            } = req.query;

            console.log("======================================");
            console.log(
                "CONSULTAR PAGAMENTO"
            );
            console.log(
                "Session:",
                session_id
            );
            console.log("======================================");

            // =================================================
            // VALIDAR SESSION
            // =================================================

            if (!session_id) {

                return res.status(400).json({

                    pago:
                        false,

                    erro:
                        "session_id não informado."

                });

            }

            // =================================================
            // BUSCAR STRIPE
            // =================================================

            const session =
                await stripe
                    .checkout
                    .sessions
                    .retrieve(
                        String(session_id)
                    );

            console.log(
                "Payment status:",
                session.payment_status
            );

            // =================================================
            // PAGAMENTO NÃO PAGO
            // =================================================

            if (
                session.payment_status !==
                "paid"
            ) {

                return res.json({

                    pago:
                        false,

                    status:
                        session.payment_status,

                    mensagem:
                        "O pagamento ainda não foi confirmado."

                });

            }

            // =================================================
            // METADATA
            // =================================================

            const metadata =
                session.metadata || {};

            const pedidoId =
                metadata.pedidoId;

            const usuarioId =
                metadata.usuarioId;

            const curso =
                metadata.curso;

            // =================================================
            // VALIDAR METADATA
            // =================================================

            if (
                !pedidoId ||
                !usuarioId ||
                !curso
            ) {

                return res.status(400).json({

                    pago:
                        false,

                    erro:
                        "Metadata do pagamento incompleta."

                });

            }

            // =================================================
            // CURSO
            // =================================================

            const cursoSelecionado =
                obterCurso(curso);

            if (!cursoSelecionado) {

                return res.status(400).json({

                    pago:
                        false,

                    erro:
                        "Curso não encontrado."

                });

            }

            // =================================================
            // PEDIDO
            // =================================================

            const pedidoRef =
                db.ref(
                    `solicitacoes_cursos/${pedidoId}`
                );

            const snapshot =
                await pedidoRef.once(
                    "value"
                );

            // =================================================
            // JÁ PROCESSADO
            // =================================================

            if (snapshot.exists()) {

                const pedido =
                    snapshot.val();

                if (
                    pedido.pago === true
                ) {

                    console.log(
                        "Pagamento já processado."
                    );

                    return res.json({

                        pago:
                            true,

                        curso:
                            pedido.curso,

                        valor:
                            pedido.valor,

                        pedidoId:
                            pedido.pedidoId,

                        usuarioId:
                            pedido.usuarioId,

                        linkCurso:
                            pedido.linkCurso,

                        categoria:
                            pedido.categoria,

                        pagamentoId:
                            pedido.pagamentoId,

                        senhaCurso:
                            pedido.senhaCurso ||
                            null,

                        usosRestantes:
                            pedido.usosRestantes ??
                            null,

                        dataPagamento:
                            pedido.dataPagamento,

                        agendamento:
                            pedido.agendamento ||
                            null

                    });

                }

            }

            // =================================================
            // DATA
            // =================================================

            const dataPagamento =
                dataAtual();

            // =================================================
            // DADOS DO CURSO
            // =================================================

            const dadosCurso = {

                usuarioId:
                    String(usuarioId),

                pedidoId:
                    String(pedidoId),

                curso:
                    curso,

                valor:
                    cursoSelecionado.valor,

                categoria:
                    cursoSelecionado.categoria,

                linkCurso:
                    cursoSelecionado.link,

                pago:
                    true,

                pagamentoId:
                    session.id,

                dataPagamento:
                    dataPagamento,

                agendamento:
                    null,

                status:
                    "pago",

                senhaCurso:
                    null,

                usosRestantes:
                    null

            };

            // =================================================
            // EAD
            // =================================================

            if (
                cursoSelecionado.categoria ===
                "EAD"
            ) {

                dadosCurso.senhaCurso =
                    gerarSenhaCurso();

                dadosCurso.usosRestantes =
                    2;

            }

            // =================================================
            // PRESENCIAL
            // =================================================

            if (
                cursoSelecionado.categoria ===
                "Presencial"
            ) {

                dadosCurso.senhaCurso =
                    null;

                dadosCurso.usosRestantes =
                    null;

            }

            // =================================================
            // SALVAR PEDIDO
            // =================================================

            await pedidoRef.set(
                dadosCurso
            );

            // =================================================
            // SALVAR CURSO DO USUÁRIO
            // =================================================

            const usuarioCursoRef =
                db.ref(
                    `usuarios/${usuarioId}/cursos/${pedidoId}`
                );

            await usuarioCursoRef.set({

                pedidoId:
                    pedidoId,

                nome:
                    curso,

                curso:
                    curso,

                status:
                    "pago",

                categoria:
                    dadosCurso.categoria,

                valor:
                    dadosCurso.valor,

                linkCurso:
                    dadosCurso.linkCurso,

                senhaCurso:
                    dadosCurso.senhaCurso ||
                    null,

                usosRestantes:
                    dadosCurso.usosRestantes ??
                    null,

                pagamentoId:
                    session.id,

                dataPagamento:
                    dataPagamento

            });

            // =================================================
            // SALVAR PAGAMENTO DO USUÁRIO
            // =================================================

            const pagamentoRef =
                db.ref(
                    `usuarios/${usuarioId}/pagamentos/${pedidoId}`
                );

            await pagamentoRef.set({

                pedidoId:
                    pedidoId,

                curso:
                    curso,

                valor:
                    dadosCurso.valor,

                pagamentoId:
                    session.id,

                dataPagamento:
                    dataPagamento

            });

            // =================================================
            // LOG
            // =================================================

            console.log("======================================");
            console.log(
                "PAGAMENTO CONFIRMADO"
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
                "Curso:",
                curso
            );
            console.log(
                "Senha gerada:",
                dadosCurso.senhaCurso
                    ? "SIM"
                    : "NÃO"
            );
            console.log(
                "Usos:",
                dadosCurso.usosRestantes
            );
            console.log("======================================");

            // =================================================
            // RESPOSTA
            // =================================================

            return res.json({

                pago:
                    true,

                curso:
                    dadosCurso.curso,

                valor:
                    dadosCurso.valor,

                pedidoId:
                    dadosCurso.pedidoId,

                usuarioId:
                    dadosCurso.usuarioId,

                linkCurso:
                    dadosCurso.linkCurso,

                categoria:
                    dadosCurso.categoria,

                pagamentoId:
                    dadosCurso.pagamentoId,

                senhaCurso:
                    dadosCurso.senhaCurso ||
                    null,

                usosRestantes:
                    dadosCurso.usosRestantes ??
                    null,

                dataPagamento:
                    dadosCurso.dataPagamento,

                agendamento:
                    dadosCurso.agendamento

            });

        }

        catch (error) {

            console.error("======================================");
            console.error(
                "ERRO CONSULTAR PAGAMENTO"
            );
            console.error(error);
            console.error("======================================");

            return res.status(500).json({

                pago:
                    false,

                erro:
                    "Erro ao consultar pagamento.",

                detalhe:
                    error.message

            });

        }

    }
);

// =====================================================
// VERIFICAR PAGAMENTO
// =====================================================

app.get(
    "/verificar-pagamento",
    async (req, res) => {

        try {

            const {
                session_id
            } = req.query;

            // =================================================
            // VALIDAR
            // =================================================

            if (!session_id) {

                return res.status(400).json({

                    pago:
                        false,

                    erro:
                        "session_id não informado."

                });

            }

            // =================================================
            // STRIPE
            // =================================================

            const session =
                await stripe
                    .checkout
                    .sessions
                    .retrieve(
                        String(session_id)
                    );

            // =================================================
            // RESPOSTA
            // =================================================

            return res.json({

                pago:
                    session.payment_status ===
                    "paid",

                status:
                    session.payment_status,

                sessionId:
                    session.id

            });

        }

        catch (error) {

            console.error(
                "ERRO VERIFICAR:",
                error
            );

            return res.status(500).json({

                pago:
                    false,

                erro:
                    "Erro ao verificar pagamento.",

                detalhe:
                    error.message

            });

        }

    }
);

// =====================================================
// USAR SENHA DO CURSO
// =====================================================
//
// Recebe:
//
// {
//     "senha": "XXXXXXXXXXXX"
// }
//
// A senha possui 2 usos.
//
// A busca é feita em:
//
// solicitacoes_cursos
//
// =====================================================

app.post(
    "/usar-senha-curso",
    async (req, res) => {

        try {

            const {
                senha
            } = req.body || {};

            // =================================================
            // VALIDAR SENHA
            // =================================================

            if (
                senha === undefined ||
                senha === null ||
                String(senha).trim() === ""
            ) {

                return res.status(400).json({

                    valido:
                        false,

                    erro:
                        "Senha não informada."

                });

            }

            const senhaNormalizada =
                String(senha).trim();

            console.log("======================================");
            console.log(
                "TENTATIVA DE ACESSO AO CURSO"
            );
            console.log(
                "Senha recebida:",
                senhaNormalizada
            );
            console.log("======================================");

            // =================================================
            // BUSCAR PEDIDOS
            // =================================================

            const pedidosRef =
                db.ref(
                    "solicitacoes_cursos"
                );

            const snapshot =
                await pedidosRef.once(
                    "value"
                );

            if (!snapshot.exists()) {

                console.log(
                    "Nenhum pedido encontrado."
                );

                return res.json({

                    valido:
                        false,

                    erro:
                        "Nenhum curso encontrado."

                });

            }

            // =================================================
            // PROCURAR SENHA
            // =================================================

            let pedidoEncontrado =
                null;

            snapshot.forEach(
                (item) => {

                    const pedido =
                        item.val();

                    if (
                        pedido &&
                        pedido.senhaCurso &&
                        String(
                            pedido.senhaCurso
                        ).trim() ===
                        senhaNormalizada
                    ) {

                        pedidoEncontrado = {

                            id:
                                item.key,

                            ...pedido

                        };

                    }

                }
            );

            // =================================================
            // SENHA NÃO ENCONTRADA
            // =================================================

            if (!pedidoEncontrado) {

                console.log(
                    "Senha inválida ou inexistente."
                );

                return res.json({

                    valido:
                        false,

                    erro:
                        "Senha inválida ou inexistente."

                });

            }

            console.log(
                "Senha encontrada:",
                pedidoEncontrado.id
            );

            // =================================================
            // VERIFICAR PAGAMENTO
            // =================================================

            if (
                pedidoEncontrado.pago !==
                true
            ) {

                return res.json({

                    valido:
                        false,

                    erro:
                        "Este curso ainda não foi pago."

                });

            }

            // =================================================
            // VERIFICAR CATEGORIA
            // =================================================

            if (
                pedidoEncontrado.categoria !==
                "EAD"
            ) {

                return res.json({

                    valido:
                        false,

                    erro:
                        "Esta senha não pertence a um curso EAD."

                });

            }

            // =================================================
            // REFERÊNCIA DO PEDIDO
            // =================================================

            const pedidoRef =
                db.ref(
                    `solicitacoes_cursos/${pedidoEncontrado.id}`
                );

            // =================================================
            // TRANSACTION
            // =================================================
            //
            // Isso evita que dois acessos simultâneos
            // consumam o mesmo uso de forma incorreta.
            //
            // =================================================

            let acessoAutorizado =
                false;

            let usosAntes =
                0;

            let usosDepois =
                0;

            await pedidoRef.transaction(
                (pedidoAtual) => {

                    if (!pedidoAtual) {

                        return;

                    }

                    // -----------------------------------------
                    // Verificar senha novamente
                    // -----------------------------------------

                    if (
                        !pedidoAtual.senhaCurso ||
                        String(
                            pedidoAtual.senhaCurso
                        ).trim() !==
                        senhaNormalizada
                    ) {

                        return;

                    }

                    // -----------------------------------------
                    // Verificar pagamento
                    // -----------------------------------------

                    if (
                        pedidoAtual.pago !==
                        true
                    ) {

                        return;

                    }

                    // -----------------------------------------
                    // Verificar categoria
                    // -----------------------------------------

                    if (
                        pedidoAtual.categoria !==
                        "EAD"
                    ) {

                        return;

                    }

                    // -----------------------------------------
                    // Usos
                    // -----------------------------------------

                    const usosAtuais =
                        Number(
                            pedidoAtual.usosRestantes
                        );

                    if (
                        !Number.isFinite(
                            usosAtuais
                        ) ||
                        usosAtuais <= 0
                    ) {

                        return;

                    }

                    // -----------------------------------------
                    // Guardar valores
                    // -----------------------------------------

                    usosAntes =
                        usosAtuais;

                    usosDepois =
                        usosAtuais - 1;

                    // -----------------------------------------
                    // Atualizar
                    // -----------------------------------------

                    pedidoAtual.usosRestantes =
                        usosDepois;

                    // -----------------------------------------
                    // Autorizar
                    // -----------------------------------------

                    acessoAutorizado =
                        true;

                    return pedidoAtual;

                }
            );

            // =================================================
            // VERIFICAR RESULTADO DA TRANSACTION
            // =================================================

            if (!acessoAutorizado) {

                // ---------------------------------------------
                // Buscar novamente para saber o motivo
                // ---------------------------------------------

                const verificacao =
                    await pedidoRef.once(
                        "value"
                    );

                const pedidoAtual =
                    verificacao.exists()
                        ? verificacao.val()
                        : null;

                if (!pedidoAtual) {

                    return res.json({

                        valido:
                            false,

                        erro:
                            "Curso não encontrado."

                    });

                }

                if (
                    pedidoAtual.pago !==
                    true
                ) {

                    return res.json({

                        valido:
                            false,

                        erro:
                            "Este curso ainda não foi pago."

                    });

                }

                const usosAtuais =
                    Number(
                        pedidoAtual.usosRestantes
                    );

                if (
                    !Number.isFinite(
                        usosAtuais
                    ) ||
                    usosAtuais <= 0
                ) {

                    console.log(
                        "Senha esgotada."
                    );

                    return res.json({

                        valido:
                            false,

                        erro:
                            "Esta senha já foi utilizada 2 vezes e não possui mais usos."

                    });

                }

                return res.json({

                    valido:
                        false,

                    erro:
                        "Não foi possível validar a senha."

                });

            }

            // =================================================
            // ATUALIZAR CURSO DO USUÁRIO
            // =================================================

            if (
                pedidoEncontrado.usuarioId
            ) {

                const usuarioCursoRef =
                    db.ref(
                        `usuarios/${pedidoEncontrado.usuarioId}/cursos/${pedidoEncontrado.id}`
                    );

                await usuarioCursoRef.update({

                    usosRestantes:
                        usosDepois

                });

            }

            // =================================================
            // LOG
            // =================================================

            console.log("======================================");
            console.log(
                "ACESSO AUTORIZADO"
            );
            console.log(
                "Curso:",
                pedidoEncontrado.curso
            );
            console.log(
                "Pedido:",
                pedidoEncontrado.id
            );
            console.log(
                "Usuário:",
                pedidoEncontrado.usuarioId
            );
            console.log(
                "Usos anteriores:",
                usosAntes
            );
            console.log(
                "Usos restantes:",
                usosDepois
            );
            console.log("======================================");

            // =================================================
            // RESPOSTA
            // =================================================

            return res.json({

                valido:
                    true,

                mensagem:
                    "Acesso autorizado.",

                pedidoId:
                    pedidoEncontrado.id,

                usuarioId:
                    pedidoEncontrado.usuarioId,

                curso:
                    pedidoEncontrado.curso,

                categoria:
                    pedidoEncontrado.categoria,

                linkCurso:
                    pedidoEncontrado.linkCurso,

                usosRestantes:
                    usosDepois

            });

        }

        catch (error) {

            console.error("======================================");
            console.error(
                "ERRO USAR SENHA"
            );
            console.error(error);
            console.error("======================================");

            return res.status(500).json({

                valido:
                    false,

                erro:
                    "Erro interno ao validar a senha.",

                detalhe:
                    error.message

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
            // VALIDAR
            // =================================================

            if (
                !pedidoId ||
                !usuarioId ||
                !data ||
                !horario
            ) {

                return res.status(400).json({

                    sucesso:
                        false,

                    erro:
                        "Dados do agendamento incompletos."

                });

            }

            // =================================================
            // PEDIDO
            // =================================================

            const pedidoRef =
                db.ref(
                    `solicitacoes_cursos/${pedidoId}`
                );

            const snapshot =
                await pedidoRef.once(
                    "value"
                );

            if (!snapshot.exists()) {

                return res.status(404).json({

                    sucesso:
                        false,

                    erro:
                        "Pedido não encontrado."

                });

            }

            const curso =
                snapshot.val();

            // =================================================
            // USUÁRIO
            // =================================================

            if (
                String(
                    curso.usuarioId
                ) !==
                String(
                    usuarioId
                )
            ) {

                return res.status(403).json({

                    sucesso:
                        false,

                    erro:
                        "Este pedido pertence a outro usuário."

                });

            }

            // =================================================
            // CATEGORIA
            // =================================================

            if (
                curso.categoria !==
                "Presencial"
            ) {

                return res.status(400).json({

                    sucesso:
                        false,

                    erro:
                        "Este curso não é presencial."

                });

            }

            // =================================================
            // PAGAMENTO
            // =================================================

            if (
                curso.pago !==
                true
            ) {

                return res.status(400).json({

                    sucesso:
                        false,

                    erro:
                        "O curso ainda não foi pago."

                });

            }

            // =================================================
            // AGENDAMENTO EXISTENTE
            // =================================================

            if (
                curso.agendamento
            ) {

                return res.status(400).json({

                    sucesso:
                        false,

                    erro:
                        "Este curso já possui um agendamento."

                });

            }

            // =================================================
            // AGENDAMENTO
            // =================================================

            const agendamento = {

                usuarioId:
                    String(
                        usuarioId
                    ),

                pedidoId:
                    String(
                        pedidoId
                    ),

                curso:
                    curso.curso,

                categoria:
                    "Presencial",

                data:
                    data,

                horario:
                    horario,

                status:
                    "agendado",

                criadoEm:
                    dataAtual()

            };

            // =================================================
            // SALVAR AGENDAMENTO
            // =================================================

            const agendamentoRef =
                db.ref(
                    `agendamentos/${pedidoId}`
                );

            await agendamentoRef.set(
                agendamento
            );

            // =================================================
            // ATUALIZAR PEDIDO
            // =================================================

            await pedidoRef.update({

                agendamento:
                    agendamento

            });

            // =================================================
            // RESPOSTA
            // =================================================

            return res.json({

                sucesso:
                    true,

                agendamento:
                    agendamento

            });

        }

        catch (error) {

            console.error(
                "ERRO AGENDAR CURSO:",
                error
            );

            return res.status(500).json({

                sucesso:
                    false,

                erro:
                    "Erro ao salvar o agendamento.",

                detalhe:
                    error.message

            });

        }

    }
);

// =====================================================
// LISTAR CURSOS
// =====================================================

app.get(
    "/cursos",
    (req, res) => {

        return res.json({

            sucesso:
                true,

            cursos:
                cursos

        });

    }
);

// =====================================================
// TESTE DA API
// =====================================================

app.get(
    "/",
    (req, res) => {

        return res.json({

            status:
                "online",

            mensagem:
                "API Plataforma funcionando",

            sistema:
                "Pagamento direto pelo Stripe",

            firebase:
                "Realtime Database",

            administradorDefinePreco:
                false,

            fluxo:
                "Escolher curso → Pagar → Pagamento confirmado → Senha gerada → Acessar curso"

        });

    }
);

// =====================================================
// TESTAR FIREBASE
// =====================================================

app.get(
    "/teste-firebase",
    async (req, res) => {

        try {

            const testeRef =
                db.ref(
                    "teste_servidor"
                );

            const dadosTeste = {

                funcionando:
                    true,

                data:
                    dataAtual()

            };

            await testeRef.set(
                dadosTeste
            );

            const snapshot =
                await testeRef.once(
                    "value"
                );

            return res.json({

                sucesso:
                    true,

                firebase:
                    snapshot.val()

            });

        }

        catch (error) {

            console.error(
                "ERRO TESTE FIREBASE:",
                error
            );

            return res.status(500).json({

                sucesso:
                    false,

                erro:
                    error.message

            });

        }

    }
);

// =====================================================
// HEALTH CHECK
// =====================================================

app.get(
    "/health",
    async (req, res) => {

        try {

            const testeRef =
                db.ref(
                    "healthcheck"
                );

            await testeRef.set({

                online:
                    true,

                timestamp:
                    dataAtual()

            });

            return res.json({

                status:
                    "healthy",

                firebase:
                    "connected",

                stripe:
                    "configured",

                timestamp:
                    dataAtual()

            });

        }

        catch (error) {

            return res.status(500).json({

                status:
                    "unhealthy",

                firebase:
                    "error",

                erro:
                    error.message

            });

        }

    }
);

// =====================================================
// 404
// =====================================================

app.use(
    (req, res) => {

        return res.status(404).json({

            erro:
                "Endpoint não encontrado.",

            rota:
                req.originalUrl,

            metodo:
                req.method

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
            "======================================"
        );

        console.error(
            "ERRO EXPRESS:"
        );

        console.error(
            error
        );

        console.error(
            "======================================"
        );

        return res.status(500).json({

            erro:
                "Erro interno do servidor.",

            detalhe:
                error.message

        });

    }
);

// =====================================================
// PORTA
// =====================================================

const PORT =
    process.env.PORT || 3000;

// =====================================================
// SERVIDOR
// =====================================================

app.listen(
    PORT,
    () => {

        console.log("======================================");
        console.log(
            "API PLATAFORMA ONLINE"
        );
        console.log(
            "Porta:",
            PORT
        );
        console.log(
            "Firebase:",
            FIREBASE_PROJECT_ID
        );
        console.log(
            "Database:",
            FIREBASE_DATABASE_URL
        );
        console.log(
            "Stripe:",
            STRIPE_SECRET_KEY.startsWith(
                "sk_test_"
            )
                ? "MODO TESTE"
                : "MODO PRODUÇÃO"
        );
        console.log("======================================");

    }
);