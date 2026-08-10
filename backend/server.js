const express = require("express");
const cors = require("cors");
const Stripe = require("stripe");
const admin = require("firebase-admin");
require("dotenv").config();

// =====================================================
// FIREBASE ADMIN
// =====================================================

let serviceAccount;

try {
    serviceAccount = require("./firebase-admin.json");
} catch (error) {
    console.error(
        "ERRO: não foi possível carregar ./firebase-admin.json"
    );

    console.error(error.message);

    process.exit(1);
}

// -----------------------------------------------------
// CORRIGIR PRIVATE KEY
// -----------------------------------------------------

if (!serviceAccount.private_key) {

    console.error(
        "ERRO: private_key não encontrada no firebase-admin.json."
    );

    process.exit(1);
}

// -----------------------------------------------------
// INICIALIZAR FIREBASE
// -----------------------------------------------------

try {

    if (!admin.apps.length) {

        admin.initializeApp({

            credential:
                admin.credential.cert(
                    serviceAccount
                ),

            databaseURL:
                process.env.FIREBASE_DATABASE_URL

        });

    }

} catch (error) {

    console.error(
        "ERRO AO INICIALIZAR FIREBASE:"
    );

    console.error(
        error
    );

    process.exit(1);
}

// -----------------------------------------------------
// DATABASE
// -----------------------------------------------------

const db =
    admin.database();

// =====================================================
// STRIPE
// =====================================================

const STRIPE_SECRET_KEY =
    process.env.STRIPE_SECRET_KEY;

if (!STRIPE_SECRET_KEY) {

    console.error(
        "ERRO: STRIPE_SECRET_KEY não encontrada no .env."
    );

    process.exit(1);
}

const stripe =
    Stripe(
        STRIPE_SECRET_KEY
    );

// =====================================================
// EXPRESS
// =====================================================

const app =
    express();

app.use(
    cors()
);

app.use(
    express.json()
);

// =====================================================
// CURSOS E PREÇOS FIXOS
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

            console.log(
                "======================================"
            );

            console.log(
                "NOVO PAGAMENTO"
            );

            console.log(
                "curso:",
                curso
            );

            console.log(
                "pedidoId:",
                pedidoId
            );

            console.log(
                "usuarioId:",
                usuarioId
            );

            console.log(
                "======================================"
            );

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
            // VALIDAR USUÁRIO
            // -------------------------------------------------

            if (!usuarioId) {

                return res
                    .status(400)
                    .json({

                        erro:
                            "Usuário não informado."

                    });

            }

            // -------------------------------------------------
            // GERAR PEDIDO
            // -------------------------------------------------

            const idPedido =
                pedidoId ||
                `pedido_${Date.now()}_${Math.random()
                    .toString(36)
                    .substring(2, 8)}`;

            // -------------------------------------------------
            // CRIAR CHECKOUT STRIPE
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

            // -------------------------------------------------
            // RESPOSTA
            // -------------------------------------------------

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

            console.error(
                "ERRO STRIPE:"
            );

            console.error(
                error
            );

            return res
                .status(500)
                .json({

                    erro:
                        "Não foi possível criar o pagamento.",

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

            // -------------------------------------------------
            // VALIDAR SESSION ID
            // -------------------------------------------------

            if (!session_id) {

                return res
                    .status(400)
                    .json({

                        erro:
                            "session_id não informado."

                    });

            }

            console.log(
                "======================================"
            );

            console.log(
                "VERIFICANDO STRIPE"
            );

            console.log(
                "Session:",
                session_id
            );

            console.log(
                "======================================"
            );

            // -------------------------------------------------
            // BUSCAR SESSION STRIPE
            // -------------------------------------------------

            const session =
                await stripe
                    .checkout
                    .sessions
                    .retrieve(
                        session_id
                    );

            console.log(
                "Stripe session encontrada:",
                session.id
            );

            console.log(
                "Payment status:",
                session.payment_status
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

            const curso =
                metadata.curso || "";

            const pedidoId =
                metadata.pedidoId || "";

            const usuarioId =
                metadata.usuarioId || "";

            console.log(
                "Metadata:",
                metadata
            );

            // -------------------------------------------------
            // VALIDAR METADATA
            // -------------------------------------------------

            if (
                !curso ||
                !pedidoId ||
                !usuarioId
            ) {

                console.error(
                    "Metadata incompleta:",
                    metadata
                );

                return res
                    .status(400)
                    .json({

                        erro:
                            "Dados do pagamento incompletos.",

                        detalhe:
                            "A sessão Stripe não possui curso, pedidoId ou usuarioId."

                    });

            }

            // -------------------------------------------------
            // BUSCAR CURSO
            // -------------------------------------------------

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

            // =================================================
            // FIREBASE ADMIN
            // =================================================

            // IMPORTANTE:
            //
            // NÃO usar:
            //
            // ref()
            // get()
            // set()
            // update()
            //
            // Essas funções são do SDK modular.
            //
            // Como estamos usando:
            //
            // admin.database()
            //
            // usamos:
            //
            // db.ref()
            // snapshot.val()
            // pedidoRef.set()
            // pedidoRef.update()
            //
            // =================================================

            const pedidoRef =
                db.ref(
                    "solicitacoes_cursos/" +
                    pedidoId
                );

            // -------------------------------------------------
            // VERIFICAR SE JÁ EXISTE
            // -------------------------------------------------

            const snapshot =
                await pedidoRef.once(
                    "value"
                );

            if (snapshot.exists()) {

                const pedidoExistente =
                    snapshot.val();

                console.log(
                    "Pedido já existe no Firebase."
                );

                // -------------------------------------------------
                // SE JÁ FOI PAGO
                // -------------------------------------------------

                if (
                    pedidoExistente.pago ===
                    true
                ) {

                    return res.json({

                        pago:
                            true,

                        curso:
                            pedidoExistente.curso,

                        valor:
                            pedidoExistente.valor,

                        pedidoId:
                            pedidoExistente.pedidoId,

                        usuarioId:
                            pedidoExistente.usuarioId,

                        linkCurso:
                            pedidoExistente.linkCurso,

                        categoria:
                            pedidoExistente.categoria,

                        pagamentoId:
                            pedidoExistente.pagamentoId,

                        senhaCurso:
                            pedidoExistente.senhaCurso ||
                            null,

                        usosRestantes:
                            pedidoExistente.usosRestantes ??
                            null,

                        dataPagamento:
                            pedidoExistente.dataPagamento,

                        agendamento:
                            pedidoExistente.agendamento ||
                            null

                    });

                }

            }

            // -------------------------------------------------
            // CRIAR DADOS DO CURSO
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

                dadosCurso.agendamento =
                    null;

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

                dadosCurso.agendamento =
                    null;

            }

            // -------------------------------------------------
            // SALVAR FIREBASE
            // -------------------------------------------------

            await pedidoRef.set(
                dadosCurso
            );

            console.log(
                "======================================"
            );

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
                "Valor:",
                dadosCurso.valor
            );

            console.log(
                "Firebase:",
                "salvo com sucesso"
            );

            console.log(
                "======================================"
            );

            // -------------------------------------------------
            // RESPOSTA
            // -------------------------------------------------

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
                    dadosCurso.agendamento ||
                    null

            });

        }

        catch (error) {

            console.error(
                "======================================"
            );

            console.error(
                "ERRO VERIFICAR PAGAMENTO"
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

                    erro:
                        "Erro ao verificar pagamento.",

                    detalhe:
                        error.message

                });

        }

    }
);

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

                return res
                    .status(400)
                    .json({

                        valido:
                            false,

                        erro:
                            "Pedido ou senha não informado."

                    });

            }

            // -------------------------------------------------
            // REFERÊNCIA FIREBASE
            // -------------------------------------------------

            const pedidoRef =
                db.ref(
                    "solicitacoes_cursos/" +
                    pedidoId
                );

            // -------------------------------------------------
            // BUSCAR
            // -------------------------------------------------

            const snapshot =
                await pedidoRef.once(
                    "value"
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
            // CATEGORIA
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
            // PAGAMENTO
            // -------------------------------------------------

            if (
                curso.pago !==
                true
            ) {

                return res.json({

                    valido:
                        false,

                    erro:
                        "Este curso ainda não foi pago."

                });

            }

            // -------------------------------------------------
            // SENHA
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
            // USOS
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

            await pedidoRef.update({

                usosRestantes:
                    novosUsos

            });

            // -------------------------------------------------
            // RETORNAR ACESSO
            // -------------------------------------------------

            return res.json({

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
                "ERRO USAR SENHA:",
                error
            );

            return res
                .status(500)
                .json({

                    valido:
                        false,

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

            // -------------------------------------------------
            // VALIDAR
            // -------------------------------------------------

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

            // -------------------------------------------------
            // PEDIDO
            // -------------------------------------------------

            const pedidoRef =
                db.ref(
                    "solicitacoes_cursos/" +
                    pedidoId
                );

            const snapshot =
                await pedidoRef.once(
                    "value"
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
            // USUÁRIO
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
            // CATEGORIA
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
            // PAGAMENTO
            // -------------------------------------------------

            if (
                curso.pago !==
                true
            ) {

                return res
                    .status(400)
                    .json({

                        erro:
                            "O curso ainda não foi pago."

                    });

            }

            // -------------------------------------------------
            // IMPEDIR DUPLICAÇÃO
            // -------------------------------------------------

            if (
                curso.agendamento
            ) {

                return res
                    .status(400)
                    .json({

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
                    new Date()
                        .toISOString()

            };

            // -------------------------------------------------
            // SALVAR AGENDAMENTO
            // -------------------------------------------------

            const agendamentoRef =
                db.ref(
                    "agendamentos/" +
                    pedidoId
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

            return res
                .status(500)
                .json({

                    erro:
                        "Erro ao salvar agendamento.",

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

            administradorDefinePreco:
                false,

            fluxo:
                "Escolher curso → Pagar → Liberar curso"

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
            serviceAccount.project_id
        );

        console.log(
            "Preços definidos pelo código"
        );

        console.log(
            "Pagamento direto pelo Stripe"
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