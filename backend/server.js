const express = require("express");
const cors = require("cors");
const Stripe = require("stripe");
const dotenv = require("dotenv");

dotenv.config();

// =====================================================
// VARIÁVEIS DO .ENV
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

const STRIPE_WEBHOOK_SECRET =
    process.env.STRIPE_WEBHOOK_SECRET?.trim();

// =====================================================
// VALIDAR CONFIGURAÇÃO
// =====================================================

if (
    !FIREBASE_PROJECT_ID ||
    !FIREBASE_CLIENT_EMAIL ||
    !FIREBASE_PRIVATE_KEY ||
    !FIREBASE_DATABASE_URL
) {
    console.error("ERRO: configuração do Firebase incompleta.");
    process.exit(1);
}

if (!STRIPE_SECRET_KEY) {
    console.error("ERRO: STRIPE_SECRET_KEY não configurada.");
    process.exit(1);
}

// =====================================================
// FIREBASE ADMIN
// =====================================================

const {
    getApps,
    initializeApp,
    cert
} = require("firebase-admin/app");

const {
    getDatabase,
    ref,
    get,
    set,
    update
} = require("firebase-admin/database");

// =====================================================
// SERVICE ACCOUNT
// =====================================================

const serviceAccount = {
    project_id: FIREBASE_PROJECT_ID,
    client_email: FIREBASE_CLIENT_EMAIL,
    private_key: FIREBASE_PRIVATE_KEY
};

// =====================================================
// FIREBASE APP
// =====================================================

let firebaseApp;

if (getApps().length === 0) {

    firebaseApp = initializeApp({
        credential: cert(serviceAccount),
        databaseURL: FIREBASE_DATABASE_URL
    });

    console.log("Firebase Admin inicializado.");

} else {

    firebaseApp = getApps()[0];

    console.log("Firebase Admin já estava inicializado.");
}

// =====================================================
// DATABASE
// =====================================================

const db = getDatabase(firebaseApp);

console.log("Firebase Realtime Database conectado.");

console.log("Firebase database:", typeof db);
console.log("Firebase ref:", typeof ref);
console.log("Firebase get:", typeof get);
console.log("Firebase set:", typeof set);
console.log("Firebase update:", typeof update);

// =====================================================
// STRIPE
// =====================================================

const stripe = Stripe(STRIPE_SECRET_KEY);

// =====================================================
// EXPRESS
// =====================================================

const app = express();

app.use(cors());

app.use(express.json());

// =====================================================
// CURSOS
// =====================================================

const cursos = {

    "HTML Completo": {
        valor: 49.90,
        categoria: "EAD",
        link: "https://seusite.com/cursos/html"
    },

    "CSS Completo": {
        valor: 39.90,
        categoria: "EAD",
        link: "https://seusite.com/cursos/css"
    },

    "JavaScript": {
        valor: 59.90,
        categoria: "EAD",
        link: "https://seusite.com/cursos/javascript"
    },

    "Python": {
        valor: 69.90,
        categoria: "EAD",
        link: "https://seusite.com/cursos/python"
    },

    "Firebase": {
        valor: 79.90,
        categoria: "EAD",
        link: "https://seusite.com/cursos/firebase"
    },

    "Python Presencial": {
        valor: 99.90,
        categoria: "Presencial",
        link: ""
    }

};

// =====================================================
// GERAR SENHA EAD
// =====================================================

function gerarSenhaCurso() {

    const caracteres =
        "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789";

    let senha = "";

    for (let i = 0; i < 12; i++) {

        const indice =
            Math.floor(
                Math.random() * caracteres.length
            );

        senha += caracteres[indice];
    }

    return senha;
}

// =====================================================
// CRIAR PAGAMENTO
// =====================================================

app.post("/criar-pagamento", async (req, res) => {

    try {

        const {
            curso,
            pedidoId,
            usuarioId
        } = req.body || {};

        console.log("======================================");
        console.log("NOVO PAGAMENTO");
        console.log("Curso:", curso);
        console.log("Pedido:", pedidoId);
        console.log("Usuário:", usuarioId);
        console.log("======================================");

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

        if (!usuarioId) {

            return res.status(400).json({
                erro: "Usuário não informado."
            });
        }

        const idPedido =
            pedidoId ||
            `pedido_${Date.now()}_${Math.random()
                .toString(36)
                .substring(2, 8)}`;

        // =================================================
        // CRIAR REGISTRO INICIAL
        // =================================================

        const pedidoInicial = {

            pedidoId: idPedido,

            usuarioId: usuarioId,

            curso: curso,

            valor: cursoSelecionado.valor,

            categoria: cursoSelecionado.categoria,

            linkCurso: cursoSelecionado.link,

            status: "aguardando_pagamento",

            pago: false,

            pagamentoId: null,

            dataPagamento: null

        };

        await set(
            ref(
                db,
                `solicitacoes_cursos/${idPedido}`
            ),
            pedidoInicial
        );

        // =================================================
        // STRIPE CHECKOUT
        // =================================================

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

                    usuarioId: String(usuarioId),

                    curso: String(curso)

                },

                success_url:
                    "https://igorpintoguedesdebarros2-sudo.github.io/PLATAFORMA/sucesso.html?session_id={CHECKOUT_SESSION_ID}",

                cancel_url:
                    "https://igorpintoguedesdebarros2-sudo.github.io/PLATAFORMA/cancelado.html"

            });

        // =================================================
        // SALVAR ID DA STRIPE
        // =================================================

        await update(
            ref(
                db,
                `solicitacoes_cursos/${idPedido}`
            ),
            {

                pagamentoId:
                    session.id

            }
        );

        return res.json({

            sucesso: true,

            id: session.id,

            pedidoId: idPedido,

            curso: curso,

            valor: cursoSelecionado.valor,

            categoria: cursoSelecionado.categoria

        });

    }

    catch (error) {

        console.error(
            "ERRO STRIPE:",
            error
        );

        return res.status(500).json({

            erro:
                "Não foi possível criar o pagamento.",

            detalhe:
                error.message

        });
    }

});

// =====================================================
// CONSULTAR PAGAMENTO
// =====================================================
// Este é o endpoint usado pelo sucesso.js
// =====================================================

app.get("/consultar-pagamento", async (req, res) => {

    try {

        const {
            session_id
        } = req.query;

        if (!session_id) {

            return res.status(400).json({

                pago: false,

                erro:
                    "session_id não informado."

            });
        }

        console.log("======================================");
        console.log("CONSULTANDO PAGAMENTO");
        console.log("Session:", session_id);

        // =================================================
        // BUSCAR STRIPE
        // =================================================

        const session =
            await stripe.checkout.sessions.retrieve(
                session_id
            );

        console.log(
            "Payment status:",
            session.payment_status
        );

        // =================================================
        // PAGAMENTO AINDA NÃO PAGO
        // =================================================

        if (
            session.payment_status !== "paid"
        ) {

            return res.json({

                pago: false,

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

        if (
            !pedidoId ||
            !usuarioId ||
            !curso
        ) {

            return res.status(400).json({

                pago: false,

                erro:
                    "Metadata do pagamento incompleta."

            });
        }

        // =================================================
        // CURSO
        // =================================================

        const cursoSelecionado =
            cursos[curso];

        if (!cursoSelecionado) {

            return res.status(400).json({

                pago: false,

                erro:
                    "Curso não encontrado."

            });
        }

        // =================================================
        // REFERÊNCIA DO PEDIDO
        // =================================================

        const pedidoRef =
            ref(
                db,
                `solicitacoes_cursos/${pedidoId}`
            );

        const snapshot =
            await get(pedidoRef);

        // =================================================
        // SE JÁ EXISTIR
        // =================================================

        if (snapshot.exists()) {

            const pedido =
                snapshot.val();

            // ---------------------------------------------
            // SEGURANÇA
            // ---------------------------------------------

            if (
                pedido.usuarioId &&
                String(pedido.usuarioId) !==
                String(usuarioId)
            ) {

                return res.status(403).json({

                    pago: false,

                    erro:
                        "Este pagamento pertence a outro usuário."

                });
            }

            // ---------------------------------------------
            // JÁ PROCESSADO
            // ---------------------------------------------

            if (
                pedido.pago === true
            ) {

                console.log(
                    "Pagamento já processado."
                );

                return res.json({

                    pago: true,

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
                        pedido.senhaCurso || null,

                    usosRestantes:
                        pedido.usosRestantes ?? null,

                    dataPagamento:
                        pedido.dataPagamento,

                    agendamento:
                        pedido.agendamento || null

                });
            }
        }

        // =================================================
        // CRIAR DADOS DO CURSO
        // =================================================

        const dadosCurso = {

            usuarioId:
                usuarioId,

            pedidoId:
                pedidoId,

            curso:
                curso,

            valor:
                cursoSelecionado.valor,

            categoria:
                cursoSelecionado.categoria,

            linkCurso:
                cursoSelecionado.link,

            status:
                "liberado",

            pago:
                true,

            pagamentoId:
                session.id,

            dataPagamento:
                new Date().toISOString(),

            agendamento:
                null

        };

        // =================================================
        // EAD
        // =================================================

        if (
            cursoSelecionado.categoria === "EAD"
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
            cursoSelecionado.categoria === "Presencial"
        ) {

            dadosCurso.senhaCurso =
                null;

            dadosCurso.usosRestantes =
                null;
        }

        // =================================================
        // SALVAR PEDIDO
        // =================================================

        await set(
            pedidoRef,
            dadosCurso
        );

        // =================================================
        // SALVAR NO PERFIL DO USUÁRIO
        // =================================================

        await set(

            ref(
                db,
                `usuarios/${usuarioId}/cursos/${pedidoId}`
            ),

            {

                pedidoId:
                    pedidoId,

                nome:
                    curso,

                curso:
                    curso,

                status:
                    "Liberado",

                categoria:
                    dadosCurso.categoria,

                valor:
                    dadosCurso.valor,

                linkCurso:
                    dadosCurso.linkCurso,

                senhaCurso:
                    dadosCurso.senhaCurso || null,

                usosRestantes:
                    dadosCurso.usosRestantes ?? null,

                dataPagamento:
                    dadosCurso.dataPagamento

            }

        );

        // =================================================
        // SALVAR PAGAMENTO NO PERFIL
        // =================================================

        await set(

            ref(
                db,
                `usuarios/${usuarioId}/pagamentos/${pedidoId}`
            ),

            {

                pedidoId:
                    pedidoId,

                curso:
                    curso,

                valor:
                    dadosCurso.valor,

                pagamentoId:
                    session.id,

                dataPagamento:
                    dadosCurso.dataPagamento

            }

        );

        console.log("======================================");
        console.log("PAGAMENTO CONFIRMADO");
        console.log("Pedido:", pedidoId);
        console.log("Usuário:", usuarioId);
        console.log("Curso:", curso);
        console.log("======================================");

        // =================================================
        // RETORNO
        // =================================================

        return res.json({

            pago: true,

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
                dadosCurso.senhaCurso || null,

            usosRestantes:
                dadosCurso.usosRestantes ?? null,

            dataPagamento:
                dadosCurso.dataPagamento,

            agendamento:
                dadosCurso.agendamento || null

        });

    }

    catch (error) {

        console.error(
            "ERRO CONSULTAR PAGAMENTO:",
            error
        );

        if (
            error.type ===
            "StripeInvalidRequestError"
        ) {

            return res.status(400).json({

                pago: false,

                erro:
                    "Sessão Stripe inválida.",

                detalhe:
                    error.message

            });
        }

        return res.status(500).json({

            pago: false,

            erro:
                "Erro ao consultar pagamento.",

            detalhe:
                error.message

        });
    }

});

// =====================================================
// ALIAS
// =====================================================
// Mantém compatibilidade caso alguma página ainda use
// /verificar-pagamento
// =====================================================

app.get(
    "/verificar-pagamento",
    async (req, res) => {

        req.url =
            "/consultar-pagamento" +
            (
                req.url.includes("?")
                    ? req.url.substring(
                        req.url.indexOf("?")
                    )
                    : ""
            );

        return app._router
            ? consultarPagamentoInterno(req, res)
            : res.status(500).json({
                erro: "Roteador indisponível."
            });
    }
);

// =====================================================
// FUNÇÃO INTERNA PARA COMPATIBILIDADE
// =====================================================

async function consultarPagamentoInterno(req, res) {

    try {

        const {
            session_id
        } = req.query;

        if (!session_id) {

            return res.status(400).json({

                pago: false,

                erro:
                    "session_id não informado."

            });
        }

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

        const pedidoId =
            metadata.pedidoId;

        const usuarioId =
            metadata.usuarioId;

        const curso =
            metadata.curso;

        if (
            !pedidoId ||
            !usuarioId ||
            !curso
        ) {

            return res.status(400).json({

                pago: false,

                erro:
                    "Metadata incompleta."

            });
        }

        const cursoSelecionado =
            cursos[curso];

        if (!cursoSelecionado) {

            return res.status(400).json({

                pago: false,

                erro:
                    "Curso não encontrado."

            });
        }

        const pedidoRef =
            ref(
                db,
                `solicitacoes_cursos/${pedidoId}`
            );

        const snapshot =
            await get(pedidoRef);

        if (
            snapshot.exists() &&
            snapshot.val().pago === true
        ) {

            const pedido =
                snapshot.val();

            return res.json({

                pago: true,

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
                    pedido.senhaCurso || null,

                usosRestantes:
                    pedido.usosRestantes ?? null,

                dataPagamento:
                    pedido.dataPagamento,

                agendamento:
                    pedido.agendamento || null

            });
        }

        const dadosCurso = {

            usuarioId,
            pedidoId,
            curso,

            valor:
                cursoSelecionado.valor,

            categoria:
                cursoSelecionado.categoria,

            linkCurso:
                cursoSelecionado.link,

            status: "liberado",

            pago: true,

            pagamentoId:
                session.id,

            dataPagamento:
                new Date().toISOString(),

            agendamento: null

        };

        if (
            cursoSelecionado.categoria === "EAD"
        ) {

            dadosCurso.senhaCurso =
                gerarSenhaCurso();

            dadosCurso.usosRestantes =
                2;
        }

        await set(
            pedidoRef,
            dadosCurso
        );

        await set(

            ref(
                db,
                `usuarios/${usuarioId}/cursos/${pedidoId}`
            ),

            {

                pedidoId,
                nome: curso,
                curso,

                status: "Liberado",

                categoria:
                    dadosCurso.categoria,

                valor:
                    dadosCurso.valor,

                linkCurso:
                    dadosCurso.linkCurso,

                senhaCurso:
                    dadosCurso.senhaCurso || null,

                usosRestantes:
                    dadosCurso.usosRestantes ?? null,

                dataPagamento:
                    dadosCurso.dataPagamento

            }

        );

        await set(

            ref(
                db,
                `usuarios/${usuarioId}/pagamentos/${pedidoId}`
            ),

            {

                pedidoId,

                curso,

                valor:
                    dadosCurso.valor,

                pagamentoId:
                    session.id,

                dataPagamento:
                    dadosCurso.dataPagamento

            }

        );

        return res.json({

            pago: true,

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
                dadosCurso.senhaCurso || null,

            usosRestantes:
                dadosCurso.usosRestantes ?? null,

            dataPagamento:
                dadosCurso.dataPagamento,

            agendamento: null

        });

    }

    catch (error) {

        console.error(
            "ERRO VERIFICAR PAGAMENTO:",
            error
        );

        return res.status(500).json({

            pago: false,

            erro:
                "Erro ao verificar pagamento.",

            detalhe:
                error.message

        });
    }
}

// =====================================================
// USAR SENHA DO CURSO EAD
// =====================================================

app.post(
    "/usar-senha-curso",
    async (req, res) => {

        try {

            const {
                pedidoId,
                senha
            } = req.body || {};

            if (
                !pedidoId ||
                !senha
            ) {

                return res.status(400).json({

                    valido: false,

                    erro:
                        "Pedido ou senha não informado."

                });
            }

            const pedidoRef =
                ref(
                    db,
                    `solicitacoes_cursos/${pedidoId}`
                );

            const snapshot =
                await get(pedidoRef);

            if (!snapshot.exists()) {

                return res.json({

                    valido: false,

                    erro:
                        "Curso não encontrado."

                });
            }

            const curso =
                snapshot.val();

            if (
                curso.categoria !== "EAD"
            ) {

                return res.json({

                    valido: false,

                    erro:
                        "Este curso não utiliza senha."

                });
            }

            if (
                curso.pago !== true
            ) {

                return res.json({

                    valido: false,

                    erro:
                        "Este curso ainda não foi pago."

                });
            }

            if (
                curso.senhaCurso !== senha
            ) {

                return res.json({

                    valido: false,

                    erro:
                        "Senha incorreta."

                });
            }

            const usos =
                Number(
                    curso.usosRestantes
                );

            if (
                !Number.isFinite(usos) ||
                usos <= 0
            ) {

                return res.json({

                    valido: false,

                    erro:
                        "Esta senha já foi utilizada o número máximo de vezes."

                });
            }

            const novosUsos =
                usos - 1;

            await update(
                pedidoRef,
                {
                    usosRestantes:
                        novosUsos
                }
            );

            return res.json({

                valido: true,

                usosRestantes:
                    novosUsos,

                linkCurso:
                    curso.linkCurso,

                curso:
                    curso.curso

            });

        }

        catch (error) {

            console.error(
                "ERRO USAR SENHA:",
                error
            );

            return res.status(500).json({

                valido: false,

                erro:
                    "Erro interno do servidor.",

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

            if (
                !pedidoId ||
                !usuarioId ||
                !data ||
                !horario
            ) {

                return res.status(400).json({

                    erro:
                        "Dados do agendamento incompletos."

                });
            }

            const pedidoRef =
                ref(
                    db,
                    `solicitacoes_cursos/${pedidoId}`
                );

            const snapshot =
                await get(pedidoRef);

            if (!snapshot.exists()) {

                return res.status(404).json({

                    erro:
                        "Pedido não encontrado."

                });
            }

            const curso =
                snapshot.val();

            if (
                String(curso.usuarioId) !==
                String(usuarioId)
            ) {

                return res.status(403).json({

                    erro:
                        "Este pedido pertence a outro usuário."

                });
            }

            if (
                curso.categoria !==
                "Presencial"
            ) {

                return res.status(400).json({

                    erro:
                        "Este curso não é presencial."

                });
            }

            if (
                curso.pago !== true
            ) {

                return res.status(400).json({

                    erro:
                        "O curso ainda não foi pago."

                });
            }

            if (
                curso.agendamento
            ) {

                return res.status(400).json({

                    erro:
                        "Este curso já possui um agendamento."

                });
            }

            const agendamento = {

                usuarioId,

                pedidoId,

                curso:
                    curso.curso,

                categoria:
                    "Presencial",

                data,

                horario,

                status:
                    "agendado",

                criadoEm:
                    new Date().toISOString()

            };

            await set(

                ref(
                    db,
                    `agendamentos/${pedidoId}`
                ),

                agendamento

            );

            await update(

                pedidoRef,

                {
                    agendamento:
                        agendamento
                }

            );

            return res.json({

                sucesso: true,

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

                erro:
                    "Erro ao salvar o agendamento.",

                detalhe:
                    error.message

            });
        }

    }
);

// =====================================================
// TESTE DA API
// =====================================================

app.get("/", (req, res) => {

    res.json({

        status: "online",

        mensagem:
            "API Plataforma funcionando",

        sistema:
            "Pagamento direto pelo Stripe",

        firebase:
            "Realtime Database",

        administradorDefinePreco:
            false,

        fluxo:
            "Escolher curso → Pagar → Liberar curso"

    });

});

// =====================================================
// TESTE FIREBASE
// =====================================================

app.get(
    "/teste-firebase",
    async (req, res) => {

        try {

            const testeRef =
                ref(
                    db,
                    "teste_servidor"
                );

            await set(
                testeRef,
                {

                    funcionando: true,

                    data:
                        new Date().toISOString()

                }
            );

            const snapshot =
                await get(
                    testeRef
                );

            return res.json({

                sucesso: true,

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

                sucesso: false,

                erro:
                    error.message,

                stack:
                    error.stack

            });
        }

    }
);

// =====================================================
// SERVIDOR
// =====================================================

const PORT =
    process.env.PORT || 3000;

app.listen(
    PORT,
    () => {

        console.log(
            "======================================"
        );

        console.log(
            "API Plataforma iniciada"
        );

        console.log(
            "Servidor rodando na porta:",
            PORT
        );

        console.log(
            "Firebase:",
            FIREBASE_PROJECT_ID
        );

        console.log(
            "Firebase Database:",
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

        console.log(
            "Preços definidos pelo código"
        );

        console.log(
            "EAD: senha com 2 usos"
        );

        console.log(
            "Presencial: agendamento"
        );

        console.log(
            "======================================"
        );

    }
);