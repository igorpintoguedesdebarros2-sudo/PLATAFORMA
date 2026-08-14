const express = require("express");
const cors = require("cors");
const Stripe = require("stripe");
const dotenv = require("dotenv");

dotenv.config();

// ==========================================
// VARIÁVEIS DO .ENV
// ==========================================

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

// ==========================================
// VALIDAR FIREBASE
// ==========================================

if (
    !FIREBASE_PROJECT_ID ||
    !FIREBASE_CLIENT_EMAIL ||
    !FIREBASE_PRIVATE_KEY
) {
    console.error("ERRO: credenciais Firebase incompletas.");
    process.exit(1);
}

// ==========================================
// FIREBASE ADMIN
// ==========================================

const {
    getApps,
    initializeApp,
    cert
} = require("firebase-admin/app");

const {
    getDatabase
} = require("firebase-admin/database");

const db = getDatabase(firebaseApp);

// ==========================================
// SERVICE ACCOUNT A PARTIR DO .ENV
// ==========================================

const serviceAccount = {
    project_id: FIREBASE_PROJECT_ID,
    client_email: FIREBASE_CLIENT_EMAIL,
    private_key: FIREBASE_PRIVATE_KEY
};

// ==========================================
// INICIALIZAR FIREBASE
// ==========================================

let firebaseApp;

if (getApps().length === 0) {

    firebaseApp = initializeApp({
        credential: cert(serviceAccount),
        databaseURL: FIREBASE_DATABASE_URL
    });

} else {

    firebaseApp = getApps()[0];

}

console.log("Firebase Admin inicializado.");
console.log("Firebase Realtime Database conectado.");

// =====================================================
// DIAGNÓSTICO FIREBASE
// =====================================================

console.log(
    "Firebase database:",
    typeof db
);

console.log(
    "Firebase ref:",
    typeof ref
);

console.log(
    "Firebase get:",
    typeof get
);

console.log(
    "Firebase set:",
    typeof set
);

console.log(
    "Firebase update:",
    typeof update
);

// =====================================================
// STRIPE
// =====================================================

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
                "======================================"
            );

            // =================================================
            // VALIDAR CURSO
            // =================================================

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

            // =================================================
            // VALIDAR USUÁRIO
            // =================================================

            if (!usuarioId) {

                return res
                    .status(400)
                    .json({

                        erro:
                            "Usuário não informado."

                    });

            }

            // =================================================
            // GERAR PEDIDO
            // =================================================

            const idPedido =
                pedidoId ||
                `pedido_${Date.now()}_${Math.random()
                    .toString(36)
                    .substring(2, 8)}`;

            // =================================================
            // CRIAR CHECKOUT STRIPE
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
                "ERRO STRIPE:",
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

            // =================================================
            // VALIDAR SESSION
            // =================================================

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
                "VERIFICANDO PAGAMENTO"
            );

            console.log(
                "Session:",
                session_id
            );

            // =================================================
            // BUSCAR SESSION STRIPE
            // =================================================

            const session =
                await stripe
                    .checkout
                    .sessions
                    .retrieve(
                        session_id
                    );

            console.log(
                "Session encontrada:",
                session.id
            );

            console.log(
                "Payment status:",
                session.payment_status
            );

            // =================================================
            // PAGAMENTO NÃO CONFIRMADO
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

            // =================================================
            // VALIDAR METADATA
            // =================================================

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
                            "Dados do pagamento incompletos."

                    });

            }

            // =================================================
            // BUSCAR CURSO
            // =================================================

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
            // FIREBASE
            // =================================================

            const caminhoPedido =
                "solicitacoes_cursos/" +
                pedidoId;

            const pedidoRef =
                ref(
                    db,
                    caminhoPedido
                );

            // =================================================
            // BUSCAR PEDIDO
            // =================================================

        const snapshot = await pedidoRef.once("value");

            if (
                snapshot.exists()
            ) {

                const pedidoExistente =
                    snapshot.val();

                console.log(
                    "Pedido encontrado no Firebase."
                );

                // =================================================
                // VALIDAR USUÁRIO
                // =================================================

                if (
                    pedidoExistente.usuarioId &&
                    String(
                        pedidoExistente.usuarioId
                    ) !==
                    String(
                        usuarioId
                    )
                ) {

                    return res
                        .status(403)
                        .json({

                            erro:
                                "Este pagamento pertence a outro usuário."

                        });

                }

                // =================================================
                // PAGAMENTO JÁ PROCESSADO
                // =================================================

                if (
                    pedidoExistente.pago ===
                    true
                ) {

                    console.log(
                        "Pagamento já processado."
                    );

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
                    new Date()
                        .toISOString(),

                agendamento:
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
            // SALVAR FIREBASE
            // =================================================

            await pedidoRef.set(dadosCurso);

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
                "======================================"
            );

            // =================================================
            // RETORNAR
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
                "Mensagem:",
                error.message
            );

            console.error(
                "Stack:",
                error.stack
            );

            console.error(
                "======================================"
            );

            // =================================================
            // ERRO STRIPE
            // =================================================

            if (
                error.type ===
                "StripeInvalidRequestError"
            ) {

                return res
                    .status(400)
                    .json({

                        erro:
                            "Sessão Stripe inválida ou inexistente.",

                        detalhe:
                            error.message

                    });

            }

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

            // =================================================
            // REFERÊNCIA
            // =================================================

            const pedidoRef =
                ref(
                    db,
                    "solicitacoes_cursos/" +
                    pedidoId
                );

            // =================================================
            // BUSCAR
            // =================================================

            const snapshot =
                await get(
                    pedidoRef
                );

            if (
                !snapshot.exists()
            ) {

                return res.json({

                    valido:
                        false,

                    erro:
                        "Curso não encontrado."

                });

            }

            const curso =
                snapshot.val();

            // =================================================
            // VALIDAR CATEGORIA
            // =================================================

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

            // =================================================
            // VALIDAR PAGAMENTO
            // =================================================

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

            // =================================================
            // VALIDAR SENHA
            // =================================================

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

            // =================================================
            // USOS
            // =================================================

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

            const novosUsos =
                usos - 1;

            // =================================================
            // ATUALIZAR
            // =================================================

            await pedidoRef.update({
    usosRestantes: novosUsos
});

            // =================================================
            // RETORNO
            // =================================================

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

            // =================================================
            // VALIDAR DADOS
            // =================================================

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

            // =================================================
            // PEDIDO
            // =================================================

            const pedidoRef = db.ref(
    "solicitacoes_cursos/" + pedidoId
);

            const snapshot =
                await get(
                    pedidoRef
                );

            if (
                !snapshot.exists()
            ) {

                return res
                    .status(404)
                    .json({

                        erro:
                            "Pedido não encontrado."

                    });

            }

            const curso =
                snapshot.val();

            // =================================================
            // VALIDAR USUÁRIO
            // =================================================

            if (
                String(
                    curso.usuarioId
                ) !==
                String(
                    usuarioId
                )
            ) {

                return res
                    .status(403)
                    .json({

                        erro:
                            "Este pedido pertence a outro usuário."

                    });

            }

            // =================================================
            // VALIDAR CATEGORIA
            // =================================================

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

            // =================================================
            // VALIDAR PAGAMENTO
            // =================================================

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

            // =================================================
            // IMPEDIR DUPLICIDADE
            // =================================================

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

            // =================================================
            // CRIAR AGENDAMENTO
            // =================================================

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

            // =================================================
            // REFERÊNCIA AGENDAMENTO
            // =================================================

            const agendamentoRef =
                ref(
                    db,
                    "agendamentos/" +
                    pedidoId
                );

            // =================================================
            // SALVAR AGENDAMENTO
            // =================================================

            await set(
                agendamentoRef,
                agendamento
            );

            // =================================================
            // ATUALIZAR PEDIDO
            // =================================================

            await update(
                pedidoRef,
                {

                    agendamento:
                        agendamento

                }
            );

            console.log(
                "Agendamento criado:",
                pedidoId
            );

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

            firebase:
                "Realtime Database",

            administradorDefinePreco:
                false,

            fluxo:
                "Escolher curso → Pagar → Liberar curso"

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

            console.log(
                "======================================"
            );

            console.log(
                "TESTE FIREBASE"
            );

            console.log(
                "Tipo db:",
                typeof db
            );

            console.log(
                "Tipo ref:",
                typeof ref
            );

            console.log(
                "Tipo get:",
                typeof get
            );

            console.log(
                "Tipo set:",
                typeof set
            );

               const testeRef = db.ref(
    "teste_servidor"
);

            await set(
                testeRef,
                {

                    funcionando:
                        true,

                    data:
                        new Date()
                            .toISOString()

                }
            );

            const snapshot =
                await get(
                    testeRef
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

            return res
                .status(500)
                .json({

                    sucesso:
                        false,

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
            process.env.FIREBASE_PROJECT_ID ||
            serviceAccount.project_id
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
