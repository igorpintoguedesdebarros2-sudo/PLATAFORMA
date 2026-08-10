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
    set,
    get,
    update
} = require("firebase-admin/database");

// =====================================================
// FIREBASE
// =====================================================

const firebaseConfig =
    require("./firebase-admin.json");

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

// =====================================================
// VALIDAR FIREBASE
// =====================================================

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

// =====================================================
// INICIALIZAR FIREBASE
// =====================================================

initializeApp({
    credential: cert(serviceAccount),

    databaseURL:
        "https://proje-79338-default-rtdb.firebaseio.com"
});

const db = getDatabase();

// =====================================================
// STRIPE
// =====================================================

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

// =====================================================
// EXPRESS
// =====================================================

const app =
    express();

app.use(cors());

app.use(express.json());

// =====================================================
// CURSOS
// =====================================================

const cursos = {

    "HTML Completo": {
        valor: 49.90,
        categoria: "EAD",
        link:
            "https://seusite.com/cursos/html"
    },

    "CSS Completo": {
        valor: 39.90,
        categoria: "EAD",
        link:
            "https://seusite.com/cursos/css"
    },

    "JavaScript": {
        valor: 59.90,
        categoria: "EAD",
        link:
            "https://seusite.com/cursos/javascript"
    },

    "Python": {
        valor: 69.90,
        categoria: "EAD",
        link:
            "https://seusite.com/cursos/python"
    },

    "Firebase": {
        valor: 79.90,
        categoria: "EAD",
        link:
            "https://seusite.com/cursos/firebase"
    },

    /*
     * Exemplo de curso presencial.
     *
     * Basta colocar:
     *
     * categoria: "Presencial"
     *
     * Não será gerada senha.
     */

    "Curso Presencial": {
        valor: 99.90,
        categoria: "Presencial",
        link: ""
    }

};

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

        senha +=
            caracteres[indice];
    }

    return senha;
}

// =====================================================
// CRIAR PAGAMENTO
// =====================================================

app.post(
    "/criar-pagamento",
    async (req, res) => {

        const {
            curso,
            pedidoId,
            usuarioId
        } = req.body;

        // -------------------------------------------------
        // VALIDAR CURSO
        // -------------------------------------------------

        if (!curso) {

            return res
                .status(400)
                .json({
                    erro:
                        "Curso não informado."
                });
        }

        const cursoSelecionado =
            cursos[curso];

        if (!cursoSelecionado) {

            return res
                .status(400)
                .json({
                    erro:
                        "Curso inválido."
                });
        }

        // -------------------------------------------------
        // PEDIDO
        // -------------------------------------------------

        const idPedido =
            pedidoId ||
            `pedido_${Date.now()}`;

        // -------------------------------------------------
        // CRIAR CHECKOUT
        // -------------------------------------------------

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
                                            cursoSelecionado.valor *
                                            100
                                        )

                                },

                                quantity: 1
                            }

                        ],

                        mode:
                            "payment",

                        metadata: {

                            pedidoId:
                                String(idPedido),

                            usuarioId:
                                usuarioId
                                    ? String(usuarioId)
                                    : "",

                            curso:
                                String(curso)

                        },

                        success_url:
                            "https://igorpintoguedesdebarros2-sudo.github.io/PLATAFORMA/sucesso.html?session_id={CHECKOUT_SESSION_ID}",

                        cancel_url:
                            "https://igorpintoguedesdebarros2-sudo.github.io/PLATAFORMA/cancelado.html"

                    });

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

// =====================================================
// VERIFICAR PAGAMENTO
// =====================================================

app.get(
    "/verificar-pagamento",
    async (req, res) => {

        const {
            session_id
        } = req.query;

        if (!session_id) {

            return res
                .status(400)
                .json({

                    erro:
                        "session_id não informado."

                });
        }

        try {

            // -------------------------------------------------
            // BUSCAR SESSÃO STRIPE
            // -------------------------------------------------

            const session =
                await stripe
                    .checkout
                    .sessions
                    .retrieve(
                        session_id
                    );

            // -------------------------------------------------
            // VERIFICAR PAGAMENTO
            // -------------------------------------------------

            if (
                session.payment_status !==
                "paid"
            ) {

                return res.json({

                    pago:
                        false,

                    status:
                        session.payment_status

                });
            }

            // -------------------------------------------------
            // METADATA
            // -------------------------------------------------

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

                return res
                    .status(400)
                    .json({

                        erro:
                            "Curso não encontrado."

                    });
            }

            // -------------------------------------------------
            // CAMINHO DO PEDIDO
            // -------------------------------------------------

            const pedidoRef =
                ref(
                    db,
                    "solicitacoes_cursos/" +
                    pedidoId
                );

            // -------------------------------------------------
            // VERIFICAR SE JÁ FOI PROCESSADO
            // -------------------------------------------------

            const snapshot =
                await get(
                    pedidoRef
                );

            let pedidoExistente =
                snapshot.exists()
                    ? snapshot.val()
                    : null;

            // -------------------------------------------------
            // SE JÁ EXISTE E ESTÁ LIBERADO
            // -------------------------------------------------

            if (
                pedidoExistente &&
                pedidoExistente.pago === true
            ) {

                return res.json({

                    pago:
                        true,

                    curso:
                        pedidoExistente.curso,

                    valor:
                        pedidoExistente.valor,

                    pedidoId:
                        pedidoId,

                    usuarioId:
                        pedidoExistente.usuarioId,

                    linkCurso:
                        pedidoExistente.linkCurso,

                    categoria:
                        pedidoExistente.categoria,

                    pagamentoId:
                        pedidoExistente.pagamentoId,

                    senhaCurso:
                        pedidoExistente.senhaCurso || null,

                    usosRestantes:
                        pedidoExistente.usosRestantes ?? null,

                    dataPagamento:
                        pedidoExistente.dataPagamento

                });
            }

            // -------------------------------------------------
            // DADOS DO CURSO
            // -------------------------------------------------

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
                    new Date()
                        .toISOString()

            };

            // -------------------------------------------------
            // EAD
            // -------------------------------------------------

            if (
                cursoSelecionado.categoria ===
                "EAD"
            ) {

                const senha =
                    gerarSenhaCurso();

                dadosCurso.senhaCurso =
                    senha;

                dadosCurso.usosRestantes =
                    2;
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

                dadosCurso.agendamento =
                    null;
            }

            // -------------------------------------------------
            // SALVAR NO FIREBASE
            // -------------------------------------------------

            await set(
                pedidoRef,
                dadosCurso
            );

            // -------------------------------------------------
            // RETORNAR PARA SUCESSO.JS
            // -------------------------------------------------

            res.json({

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
                    dadosCurso.senhaCurso || null,

                usosRestantes:
                    dadosCurso.usosRestantes ?? null,

                dataPagamento:
                    dadosCurso.dataPagamento

            });

        }
        catch (error) {

            console.error(
                "Erro verificar pagamento:",
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

// =====================================================
// USAR SENHA DO CURSO
// =====================================================

app.post(
    "/usar-senha-curso",
    async (req, res) => {

        const {
            pedidoId,
            senha
        } = req.body;

        if (
            !pedidoId ||
            !senha
        ) {

            return res
                .status(400)
                .json({

                    valido:
                        false,

                    erro:
                        "Pedido ou senha não informado."

                });
        }

        try {

            const pedidoRef =
                ref(
                    db,
                    "solicitacoes_cursos/" +
                    pedidoId
                );

            const snapshot =
                await get(
                    pedidoRef
                );

            if (!snapshot.exists()) {

                return res.json({

                    valido:
                        false,

                    erro:
                        "Curso não encontrado."

                });
            }

            const curso =
                snapshot.val();

            // -------------------------------------------------
            // SOMENTE EAD
            // -------------------------------------------------

            if (
                curso.categoria !==
                "EAD"
            ) {

                return res.json({

                    valido:
                        false,

                    erro:
                        "Este curso não utiliza senha."

                });
            }

            // -------------------------------------------------
            // COMPARAR SENHA
            // -------------------------------------------------

            if (
                curso.senhaCurso !==
                senha
            ) {

                return res.json({

                    valido:
                        false,

                    erro:
                        "Senha incorreta."

                });
            }

            // -------------------------------------------------
            // VERIFICAR USOS
            // -------------------------------------------------

            const usos =
                Number(
                    curso.usosRestantes
                );

            if (
                !Number.isFinite(usos) ||
                usos <= 0
            ) {

                return res.json({

                    valido:
                        false,

                    erro:
                        "Esta senha já foi utilizada o número máximo de vezes."

                });
            }

            // -------------------------------------------------
            // DIMINUIR USO
            // -------------------------------------------------

            const novosUsos =
                usos - 1;

            await update(
                pedidoRef,
                {
                    usosRestantes:
                        novosUsos
                }
            );

            // -------------------------------------------------
            // SUCESSO
            // -------------------------------------------------

            res.json({

                valido:
                    true,

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
                "Erro usar senha:",
                error.message
            );

            res
                .status(500)
                .json({

                    valido:
                        false,

                    erro:
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

        const {
            pedidoId,
            usuarioId,
            data,
            horario
        } = req.body;

        if (
            !pedidoId ||
            !usuarioId ||
            !data ||
            !horario
        ) {

            return res
                .status(400)
                .json({

                    erro:
                        "Dados do agendamento incompletos."

                });
        }

        try {

            const pedidoRef =
                ref(
                    db,
                    "solicitacoes_cursos/" +
                    pedidoId
                );

            const snapshot =
                await get(
                    pedidoRef
                );

            if (!snapshot.exists()) {

                return res
                    .status(404)
                    .json({

                        erro:
                            "Pedido não encontrado."

                    });
            }

            const curso =
                snapshot.val();

            // -------------------------------------------------
            // GARANTIR QUE É PRESENCIAL
            // -------------------------------------------------

            if (
                curso.categoria !==
                "Presencial"
            ) {

                return res
                    .status(400)
                    .json({

                        erro:
                            "Este curso não é presencial."

                    });
            }

            // -------------------------------------------------
            // GARANTIR USUÁRIO
            // -------------------------------------------------

            if (
                curso.usuarioId !==
                usuarioId
            ) {

                return res
                    .status(403)
                    .json({

                        erro:
                            "Este pedido pertence a outro usuário."

                    });
            }

            // -------------------------------------------------
            // SALVAR AGENDAMENTO
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
                    new Date()
                        .toISOString()

            };

            await set(

                ref(
                    db,
                    "agendamentos/" +
                    pedidoId
                ),

                agendamento
            );

            // -------------------------------------------------
            // ATUALIZAR PEDIDO
            // -------------------------------------------------

            await update(

                pedidoRef,

                {

                    agendamento:
                        agendamento

                }

            );

            res.json({

                sucesso:
                    true,

                agendamento:
                    agendamento

            });

        }
        catch (error) {

            console.error(
                "Erro agendar curso:",
                error.message
            );

            res
                .status(500)
                .json({

                    erro:
                        "Erro ao salvar agendamento."

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
                "API Plataforma funcionando"

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

        console.log(
            "Servidor rodando na porta",
            PORT
        );

    }
);
