const express = require("express");
const cors = require("cors");
const Stripe = require("stripe");
const dotenv = require("dotenv");

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
// VALIDAR CONFIGURAÇÃO
// =====================================================

if (
    !FIREBASE_PROJECT_ID ||
    !FIREBASE_CLIENT_EMAIL ||
    !FIREBASE_PRIVATE_KEY ||
    !FIREBASE_DATABASE_URL
) {
    console.error("======================================");
    console.error("ERRO: configuração do Firebase incompleta.");
    console.error(
        "Configure FIREBASE_PROJECT_ID, FIREBASE_CLIENT_EMAIL, FIREBASE_PRIVATE_KEY e FIREBASE_DATABASE_URL."
    );
    console.error("======================================");

    process.exit(1);
}

if (!STRIPE_SECRET_KEY) {
    console.error("======================================");
    console.error("ERRO: STRIPE_SECRET_KEY não configurada.");
    console.error("======================================");

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
    getDatabase
} = require("firebase-admin/database");

// =====================================================
// SERVICE ACCOUNT
// =====================================================

const serviceAccount = {
    projectId: FIREBASE_PROJECT_ID,
    clientEmail: FIREBASE_CLIENT_EMAIL,
    privateKey: FIREBASE_PRIVATE_KEY
};

// =====================================================
// INICIALIZAR FIREBASE
// =====================================================

let firebaseApp;

if (getApps().length === 0) {

    firebaseApp = initializeApp({
        credential: cert(serviceAccount),
        databaseURL: FIREBASE_DATABASE_URL
    });

    console.log(
        "Firebase Admin inicializado."
    );

} else {

    firebaseApp = getApps()[0];

    console.log(
        "Firebase Admin já estava inicializado."
    );
}

// =====================================================
// DATABASE
// =====================================================

const db = getDatabase(firebaseApp);

console.log(
    "Firebase Realtime Database conectado."
);

// =====================================================
// STRIPE
// =====================================================

const stripe = Stripe(
    STRIPE_SECRET_KEY
);

console.log(
    "Stripe inicializado."
);

// =====================================================
// EXPRESS
// =====================================================

const app = express();

app.use(
    cors({
        origin: "*"
    })
);

app.use(
    express.json({
        limit: "1mb"
    })
);

// =====================================================
// CURSOS
// =====================================================

const cursos = {

    "NR1": {
        valor: 49.90,
        categoria: "EAD",
        link:
            "http://127.0.0.1:5500/NRS/NR1/NR1.html"
    },

    "CSS Completo": {
        valor: 39.90,
        categoria: "EAD",
        link:
            "https://igorpintoguedesdebarros2-sudo.github.io/PLATAFORMA/css.html"
    },

    "JavaScript": {
        valor: 59.90,
        categoria: "EAD",
        link:
            "https://igorpintoguedesdebarros2-sudo.github.io/PLATAFORMA/javascript.html"
    },

    "Python": {
        valor: 69.90,
        categoria: "EAD",
        link:
            "https://igorpintoguedesdebarros2-sudo.github.io/PLATAFORMA/python.html"
    },

    "Firebase": {
        valor: 79.90,
        categoria: "EAD",
        link:
            "https://igorpintoguedesdebarros2-sudo.github.io/PLATAFORMA/firebase.html"
    },

    "Python Presencial": {
        valor: 99.90,
        categoria: "Presencial",
        link: ""
    }

};

// =====================================================
// GERAR ID DE PEDIDO
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
// GERAR SENHA DO CURSO
// =====================================================

function gerarSenhaCurso() {

    const caracteres =
        "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789";

    let senha = "";

    for (let i = 0; i < 12; i++) {

        const indice =
            Math.floor(
                Math.random() *
                caracteres.length
            );

        senha += caracteres[indice];

    }

    return senha;

}

// =====================================================
// NORMALIZAR SENHA
// =====================================================

function normalizarSenha(senha) {

    return String(
        senha ?? ""
    )
        .trim()
        .toUpperCase();

}

// =====================================================
// RESPOSTA PADRÃO DO CURSO
// =====================================================

function respostaCurso(pedido) {

    return {

        pago:
            pedido.pago === true,

        curso:
            pedido.curso || null,

        valor:
            pedido.valor ?? null,

        pedidoId:
            pedido.pedidoId || null,

        usuarioId:
            pedido.usuarioId || null,

        linkCurso:
            pedido.linkCurso || null,

        categoria:
            pedido.categoria || null,

        pagamentoId:
            pedido.pagamentoId || null,

        senhaCurso:
            pedido.senhaCurso || null,

        usosRestantes:
            pedido.usosRestantes ?? null,

        dataPagamento:
            pedido.dataPagamento || null,

        agendamento:
            pedido.agendamento || null

    };

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
            console.log("Curso:", curso);
            console.log("Pedido:", pedidoId);
            console.log("Usuário:", usuarioId);
            console.log("======================================");

            // -------------------------------------------------
            // VALIDAR CURSO
            // -------------------------------------------------

            if (!curso) {

                return res.status(400).json({

                    sucesso: false,

                    erro:
                        "Curso não informado."

                });

            }

            const cursoSelecionado =
                cursos[curso];

            if (!cursoSelecionado) {

                return res.status(400).json({

                    sucesso: false,

                    erro:
                        "Curso inválido."

                });

            }

            // -------------------------------------------------
            // VALIDAR USUÁRIO
            // -------------------------------------------------

            if (!usuarioId) {

                return res.status(400).json({

                    sucesso: false,

                    erro:
                        "Usuário não informado."

                });

            }

            // -------------------------------------------------
            // ID DO PEDIDO
            // -------------------------------------------------

            const idPedido =
                pedidoId ||
                gerarPedidoId();

            // -------------------------------------------------
            // REFERÊNCIA FIREBASE
            //
            // IMPORTANTE:
            // Usamos db.ref() e não ref().
            // -------------------------------------------------

            const pedidoRef =
                db.ref(
                    `solicitacoes_cursos/${idPedido}`
                );

            // -------------------------------------------------
            // VERIFICAR PEDIDO EXISTENTE
            // -------------------------------------------------

            const pedidoExistenteSnapshot =
                await pedidoRef.once("value");

            if (
                pedidoExistenteSnapshot.exists()
            ) {

                const pedidoExistente =
                    pedidoExistenteSnapshot.val();

                if (
                    pedidoExistente.pagamentoId &&
                    pedidoExistente.status ===
                    "aguardando_pagamento"
                ) {

                    console.log(
                        "Pedido já possui sessão Stripe."
                    );

                    return res.json({

                        sucesso: true,

                        id:
                            pedidoExistente.pagamentoId,

                        pedidoId:
                            idPedido,

                        curso:
                            pedidoExistente.curso,

                        valor:
                            pedidoExistente.valor,

                        categoria:
                            pedidoExistente.categoria

                    });

                }

            }

            // -------------------------------------------------
            // PEDIDO INICIAL
            // -------------------------------------------------

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

                criadoEm:
                    new Date().toISOString()

            };

            await pedidoRef.set(
                pedidoInicial
            );

            // -------------------------------------------------
            // STRIPE CHECKOUT
            // -------------------------------------------------

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
                                String(idPedido),

                            usuarioId:
                                String(usuarioId),

                            curso:
                                String(curso)

                        },

                        success_url:
                            "https://igorpintoguedesdebarros2-sudo.github.io/PLATAFORMA/sucesso.html?session_id={CHECKOUT_SESSION_ID}",

                        cancel_url:
                            "https://igorpintoguedesdebarros2-sudo.github.io/PLATAFORMA/cancelado.html"

                    });

            // -------------------------------------------------
            // SALVAR SESSION ID
            // -------------------------------------------------

            await pedidoRef.update({

                pagamentoId:
                    session.id

            });

            console.log(
                "Checkout Stripe criado:",
                session.id
            );

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
                    cursoSelecionado.categoria

            });

        }

        catch (error) {

            console.error("======================================");
            console.error(
                "ERRO CRIAR PAGAMENTO"
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

            if (!session_id) {

                return res.status(400).json({

                    pago:
                        false,

                    erro:
                        "session_id não informado."

                });

            }

            // -------------------------------------------------
            // STRIPE
            // -------------------------------------------------

            const session =
                await stripe
                    .checkout
                    .sessions
                    .retrieve(
                        String(session_id)
                    );

            console.log(
                "Stripe payment_status:",
                session.payment_status
            );

            // -------------------------------------------------
            // PAGAMENTO NÃO CONFIRMADO
            // -------------------------------------------------

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

            // -------------------------------------------------
            // METADATA
            // -------------------------------------------------

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

                    pago:
                        false,

                    erro:
                        "Metadata do pagamento incompleta."

                });

            }

            // -------------------------------------------------
            // VALIDAR CURSO
            // -------------------------------------------------

            const cursoSelecionado =
                cursos[curso];

            if (!cursoSelecionado) {

                return res.status(400).json({

                    pago:
                        false,

                    erro:
                        "Curso não encontrado."

                });

            }

            // -------------------------------------------------
            // PEDIDO
            // -------------------------------------------------

            const pedidoRef =
                db.ref(
                    `solicitacoes_cursos/${pedidoId}`
                );

            const snapshot =
                await pedidoRef.once(
                    "value"
                );

            // -------------------------------------------------
            // VERIFICAR PEDIDO EXISTENTE
            // -------------------------------------------------

            if (snapshot.exists()) {

                const pedido =
                    snapshot.val();

                // -------------------------------------------------
                // JÁ PAGO
                // -------------------------------------------------

                if (
                    pedido.pago === true &&
                    pedido.senhaCurso
                ) {

                    console.log(
                        "Pagamento já processado."
                    );

                    return res.json(
                        respostaCurso(
                            pedido
                        )
                    );

                }

            }

            // -------------------------------------------------
            // DATA DO PAGAMENTO
            // -------------------------------------------------

            const dataPagamento =
                new Date().toISOString();

            // -------------------------------------------------
            // DADOS DO CURSO
            // -------------------------------------------------

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

                status:
                    "pago",

                senhaCurso:
                    null,

                usosRestantes:
                    null,

                agendamento:
                    null

            };

            // -------------------------------------------------
            // PRESERVAR AGENDAMENTO EXISTENTE
            // -------------------------------------------------

            if (snapshot.exists()) {

                const pedidoAtual =
                    snapshot.val();

                if (
                    pedidoAtual.agendamento
                ) {

                    dadosCurso.agendamento =
                        pedidoAtual.agendamento;

                }

            }

            // -------------------------------------------------
            // EAD
            // -------------------------------------------------

            if (
                cursoSelecionado.categoria ===
                "EAD"
            ) {

                // Se por algum motivo já houver senha,
                // preserva a senha existente.

                if (
                    snapshot.exists() &&
                    snapshot.val().senhaCurso
                ) {

                    dadosCurso.senhaCurso =
                        snapshot.val().senhaCurso;

                    dadosCurso.usosRestantes =
                        Number(
                            snapshot.val().usosRestantes
                        );

                } else {

                    dadosCurso.senhaCurso =
                        gerarSenhaCurso();

                    dadosCurso.usosRestantes =
                        2;

                }

            }

            // -------------------------------------------------
            // PRESENCIAL
            // -------------------------------------------------

            if (
                cursoSelecionado.categoria ===
                "Presencial"
            ) {

                dadosCurso.senhaCurso =
                    null;

                dadosCurso.usosRestantes =
                    null;

            }

            // -------------------------------------------------
            // SALVAR PEDIDO
            // -------------------------------------------------

            await pedidoRef.set(
                dadosCurso
            );

            // -------------------------------------------------
            // SALVAR CURSO DO USUÁRIO
            // -------------------------------------------------

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
                    dadosCurso.senhaCurso,

                usosRestantes:
                    dadosCurso.usosRestantes,

                pagamentoId:
                    session.id,

                dataPagamento:
                    dataPagamento

            });

            // -------------------------------------------------
            // SALVAR PAGAMENTO
            // -------------------------------------------------

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

            // -------------------------------------------------
            // LOG
            // -------------------------------------------------

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
                "Senha:",
                dadosCurso.senhaCurso || "NÃO APLICÁVEL"
            );
            console.log(
                "Usos:",
                dadosCurso.usosRestantes
            );
            console.log("======================================");

            // -------------------------------------------------
            // RESPOSTA
            // -------------------------------------------------

            return res.json(
                respostaCurso(
                    dadosCurso
                )
            );

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

            if (!session_id) {

                return res.status(400).json({

                    pago:
                        false,

                    erro:
                        "session_id não informado."

                });

            }

            const session =
                await stripe
                    .checkout
                    .sessions
                    .retrieve(
                        String(session_id)
                    );

            return res.json({

                pago:
                    session.payment_status ===
                    "paid",

                status:
                    session.payment_status

            });

        }

        catch (error) {

            console.error(
                "ERRO VERIFICAR PAGAMENTO:",
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
//     "senha": "XXXXXXXXXXXX",
//     "usuarioId": "UID_DO_FIREBASE"
// }
//
// usuarioId é opcional para permitir compatibilidade
// com o NR1.js atual.
// =====================================================
app.post("/usar-senha-curso", async (req, res) => {
    try {
        const { senha, usuarioId } = req.body || {};

        console.log("======================================");
        console.log("TENTATIVA DE ACESSO AO CURSO");
        console.log("Usuário:", usuarioId || "não informado");
        console.log("======================================");

        // =====================================================
        // 1. VALIDAR SENHA RECEBIDA
        // =====================================================

        if (
            senha === undefined ||
            senha === null ||
            String(senha).trim() === ""
        ) {
            return res.status(400).json({
                valido: false,
                erro: "Senha não informada."
            });
        }

        const senhaNormalizada = normalizarSenha(senha);

        console.log(
            "Senha recebida:",
            senhaNormalizada
        );

        let pedidoEncontrado = null;

        // =====================================================
        // 2. PROCURAR EM SOLICITACOES_CURSOS
        // =====================================================

        console.log(
            "Procurando em solicitacoes_cursos..."
        );

        const solicitacoesRef =
            db.ref("solicitacoes_cursos");

        const solicitacoesSnapshot =
            await solicitacoesRef.once("value");

        if (solicitacoesSnapshot.exists()) {

            solicitacoesSnapshot.forEach((item) => {

                const pedido = item.val();

                if (!pedido) {
                    return;
                }

                if (!pedido.senhaCurso) {
                    return;
                }

                const senhaBanco =
                    normalizarSenha(
                        pedido.senhaCurso
                    );

                if (
                    senhaBanco ===
                    senhaNormalizada
                ) {

                    pedidoEncontrado = {
                        id: item.key,
                        ...pedido
                    };

                }

            });

        }

        // =====================================================
        // 3. PROCURAR EM USUARIOS/{UID}/CURSOS
        // =====================================================

        if (
            !pedidoEncontrado &&
            usuarioId
        ) {

            console.log(
                "Procurando em usuarios/" +
                usuarioId +
                "/cursos..."
            );

            const cursosRef =
                db.ref(
                    `usuarios/${usuarioId}/cursos`
                );

            const cursosSnapshot =
                await cursosRef.once("value");

            if (
                cursosSnapshot.exists()
            ) {

                cursosSnapshot.forEach((item) => {

                    const curso =
                        item.val();

                    if (!curso) {
                        return;
                    }

                    if (!curso.senhaCurso) {
                        return;
                    }

                    const senhaBanco =
                        normalizarSenha(
                            curso.senhaCurso
                        );

                    if (
                        senhaBanco ===
                        senhaNormalizada
                    ) {

                        pedidoEncontrado = {

                            id:
                                item.key,

                            pedidoId:
                                curso.pedidoId ||
                                item.key,

                            usuarioId:
                                curso.usuarioId ||
                                usuarioId,

                            curso:
                                curso.curso ||
                                curso.nome ||
                                "",

                            categoria:
                                curso.categoria ||
                                "EAD",

                            linkCurso:
                                curso.linkCurso ||
                                "",

                            pago:
                                curso.pago === true,

                            senhaCurso:
                                curso.senhaCurso,

                            usosRestantes:
                                curso.usosRestantes

                        };

                    }

                });

            }

        }

        // =====================================================
        // 4. SENHA NÃO ENCONTRADA
        // =====================================================

        if (!pedidoEncontrado) {

            console.log(
                "❌ SENHA NÃO ENCONTRADA"
            );

            return res.json({

                valido:
                    false,

                erro:
                    "Senha inválida ou inexistente."

            });

        }

        // =====================================================
        // 5. MOSTRAR DADOS ENCONTRADOS
        // =====================================================

        console.log("======================================");
        console.log("SENHA ENCONTRADA");
        console.log(
            "Firebase ID:",
            pedidoEncontrado.id
        );
        console.log(
            "Pedido ID:",
            pedidoEncontrado.pedidoId ||
            pedidoEncontrado.id
        );
        console.log(
            "Curso:",
            pedidoEncontrado.curso
        );
        console.log(
            "Categoria:",
            pedidoEncontrado.categoria
        );
        console.log(
            "Usuário:",
            pedidoEncontrado.usuarioId
        );
        console.log(
            "Pago:",
            pedidoEncontrado.pago
        );
        console.log(
            "Usos:",
            pedidoEncontrado.usosRestantes
        );
        console.log("======================================");

        // =====================================================
        // 6. VERIFICAR USUÁRIO
        // =====================================================

        if (
            usuarioId &&
            pedidoEncontrado.usuarioId &&
            pedidoEncontrado.usuarioId !== usuarioId
        ) {

            console.log(
                "❌ SENHA PERTENCE A OUTRO USUÁRIO"
            );

            return res.json({

                valido:
                    false,

                erro:
                    "Esta senha pertence a outro usuário."

            });

        }

        // =====================================================
        // 7. VERIFICAR PAGAMENTO
        // =====================================================

        if (
            pedidoEncontrado.pago !== true
        ) {

            console.log(
                "❌ CURSO NÃO ESTÁ PAGO"
            );

            return res.json({

                valido:
                    false,

                erro:
                    "Este curso ainda não foi pago."

            });

        }

        // =====================================================
        // 8. VERIFICAR CATEGORIA
        // =====================================================

        if (
            pedidoEncontrado.categoria &&
            pedidoEncontrado.categoria !== "EAD"
        ) {

            console.log(
                "❌ CATEGORIA INVÁLIDA:",
                pedidoEncontrado.categoria
            );

            return res.json({

                valido:
                    false,

                erro:
                    "Esta senha não pertence a um curso EAD."

            });

        }

        // =====================================================
        // 9. VERIFICAR USOS
        // =====================================================

        const usos =
            Number(
                pedidoEncontrado.usosRestantes
            );

        if (
            !Number.isFinite(usos) ||
            usos <= 0
        ) {

            console.log(
                "❌ SENHA ESGOTADA"
            );

            return res.json({

                valido:
                    false,

                erro:
                    "Esta senha não possui mais usos."

            });

        }

        // =====================================================
        // 10. CALCULAR NOVOS USOS
        // =====================================================

        const novosUsos =
            usos - 1;

        // =====================================================
        // 11. IDENTIFICADORES
        // =====================================================

        const firebaseId =
            pedidoEncontrado.id;

        const pedidoId =
            pedidoEncontrado.pedidoId ||
            firebaseId;

        const donoUsuarioId =
            pedidoEncontrado.usuarioId ||
            usuarioId ||
            null;

        // =====================================================
        // 12. ATUALIZAR CURSO DO USUÁRIO
        // =====================================================

        if (
            donoUsuarioId
        ) {

            const cursoRef =
                db.ref(
                    `usuarios/${donoUsuarioId}/cursos/${firebaseId}`
                );

            const cursoSnapshot =
                await cursoRef.once("value");

            if (
                cursoSnapshot.exists()
            ) {

                console.log(
                    "Atualizando usos em usuarios/.../cursos..."
                );

                await cursoRef.update({

                    usosRestantes:
                        novosUsos

                });

            }
            else {

                console.log(
                    "Curso não encontrado em usuarios/.../cursos."
                );

            }

        }

        // =====================================================
        // 13. ATUALIZAR SOLICITACAO
        // =====================================================

        const solicitacaoRef =
            db.ref(
                `solicitacoes_cursos/${firebaseId}`
            );

        const solicitacaoSnapshot =
            await solicitacaoRef.once("value");

        if (
            solicitacaoSnapshot.exists()
        ) {

            console.log(
                "Atualizando usos em solicitacoes_cursos..."
            );

            await solicitacaoRef.update({

                usosRestantes:
                    novosUsos

            });

        }

        // =====================================================
        // 14. ACESSO AUTORIZADO
        // =====================================================

        console.log("======================================");
        console.log("✅ ACESSO AUTORIZADO");
        console.log(
            "Curso:",
            pedidoEncontrado.curso
        );
        console.log(
            "Pedido:",
            pedidoId
        );
        console.log(
            "Usuário:",
            donoUsuarioId
        );
        console.log(
            "Usos anteriores:",
            usos
        );
        console.log(
            "Usos restantes:",
            novosUsos
        );
        console.log("======================================");

        // =====================================================
        // 15. RESPOSTA PARA O FRONTEND
        // =====================================================

        return res.json({

            valido:
                true,

            mensagem:
                "Acesso autorizado.",

            pedidoId:
                pedidoId,

            usuarioId:
                donoUsuarioId,

            curso:
                pedidoEncontrado.curso,

            categoria:
                pedidoEncontrado.categoria,

            linkCurso:
                pedidoEncontrado.linkCurso,

            usosRestantes:
                novosUsos

        });

    }

    catch (error) {

        console.error("======================================");
        console.error("❌ ERRO USAR SENHA");
        console.error(
            "Mensagem:",
            error.message
        );
        console.error(
            "Stack:",
            error.stack
        );
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

});
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

            // -------------------------------------------------
            // VALIDAR
            // -------------------------------------------------

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

            // -------------------------------------------------
            // PEDIDO
            // -------------------------------------------------

            const pedidoRef =
                db.ref(
                    `solicitacoes_cursos/${pedidoId}`
                );

            const snapshot =
                await pedidoRef.once(
                    "value"
                );

            if (
                !snapshot.exists()
            ) {

                return res.status(404).json({

                    sucesso:
                        false,

                    erro:
                        "Pedido não encontrado."

                });

            }

            const curso =
                snapshot.val();

            // -------------------------------------------------
            // USUÁRIO
            // -------------------------------------------------

            if (
                String(curso.usuarioId) !==
                String(usuarioId)
            ) {

                return res.status(403).json({

                    sucesso:
                        false,

                    erro:
                        "Este pedido pertence a outro usuário."

                });

            }

            // -------------------------------------------------
            // CATEGORIA
            // -------------------------------------------------

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

            // -------------------------------------------------
            // PAGAMENTO
            // -------------------------------------------------

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

            // -------------------------------------------------
            // AGENDAMENTO EXISTENTE
            // -------------------------------------------------

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

            // -------------------------------------------------
            // CRIAR AGENDAMENTO
            // -------------------------------------------------

            const agendamento = {

                usuarioId:
                    usuarioId,

                pedidoId:
                    pedidoId,

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
                    new Date().toISOString()

            };

            // -------------------------------------------------
            // SALVAR AGENDAMENTO
            // -------------------------------------------------

            const agendamentoRef =
                db.ref(
                    `agendamentos/${pedidoId}`
                );

            await agendamentoRef.set(
                agendamento
            );

            // -------------------------------------------------
            // ATUALIZAR PEDIDO
            // -------------------------------------------------

            await pedidoRef.update({

                agendamento:
                    agendamento

            });

            // -------------------------------------------------
            // RESPOSTA
            // -------------------------------------------------

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
// TESTE DA API
// =====================================================

app.get(
    "/",
    (req, res) => {

        res.json({

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

            endpoints: [

                "/",

                "/teste-firebase",

                "/criar-pagamento",

                "/consultar-pagamento",

                "/verificar-pagamento",

                "/usar-senha-curso",

                "/agendar-curso"

            ],

            fluxo:
                "Escolher curso → Pagar → Senha gerada → Acessar curso"

        });

    }
);

// =====================================================
// TESTE FIREBASE
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
                    new Date().toISOString()

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
// 404
// =====================================================

app.use(
    (req, res) => {

        res.status(404).json({

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
    (error, req, res, next) => {

        console.error(
            "ERRO EXPRESS:",
            error
        );

        res.status(500).json({

            erro:
                "Erro interno do servidor.",

            detalhe:
                error.message

        });

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