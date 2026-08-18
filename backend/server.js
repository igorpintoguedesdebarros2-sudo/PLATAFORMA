import express from "express";
import cors from "cors";
import Stripe from "stripe";
import nodemailer from "nodemailer";

import {
    cert,
    getApps,
    initializeApp
} from "firebase-admin/app";

import {
    FieldValue,
    getFirestore
} from "firebase-admin/firestore";

import {
    getAuth
} from "firebase-admin/auth";


// =====================================================
// APP
// =====================================================

const app = express();

const PORT =
    process.env.PORT || 10000;


// =====================================================
// VARIÁVEIS
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

const SMTP_USER =
    process.env.SMTP_USER;

const SMTP_PASS =
    process.env.SMTP_PASS;

const EMAIL_FROM =
    process.env.EMAIL_FROM ||
    SMTP_USER;


// =====================================================
// VALIDAÇÕES
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

const apps =
    getApps();

if (apps.length > 0) {

    firebaseApp =
        apps[0];

    console.log(
        "Firebase Admin já inicializado."
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
// FIREBASE AUTH
// =====================================================

const firebaseAuth =
    getAuth(
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
// IMPORTANTE:
//
// NÃO COLOQUE express.json() AQUI.
//
// O WEBHOOK PRECISA RECEBER O BODY PURO.
// =====================================================


// =====================================================
// WEBHOOK STRIPE
// =====================================================

app.post(
    "/webhook-stripe",

    express.raw({
        type: "application/json"
    }),

    async (req, res) => {

        console.log(
            "======================================"
        );

        console.log(
            "WEBHOOK STRIPE RECEBIDO"
        );

        console.log(
            "Content-Type:",
            req.headers["content-type"]
        );

        console.log(
            "Stripe-Signature:",
            req.headers["stripe-signature"]
                ? "presente"
                : "ausente"
        );

        console.log(
            "======================================"
        );


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

            console.error(
                "Stripe-Signature não enviada."
            );

            return res
                .status(400)
                .send(
                    "Assinatura Stripe ausente."
                );
        }


        let evento;


        // =================================================
        // VALIDAR ASSINATURA
        // =================================================

        try {

            evento =
                stripe.webhooks.constructEvent(

                    req.body,

                    assinatura,

                    STRIPE_WEBHOOK_SECRET

                );

        }
        catch (error) {

            console.error(
                "======================================"
            );

            console.error(
                "ASSINATURA STRIPE INVÁLIDA"
            );

            console.error(
                error.message
            );

            console.error(
                "======================================"
            );

            return res
                .status(400)
                .send(
                    `Webhook Error: ${error.message}`
                );
        }


        try {

            console.log(
                "Evento Stripe:",
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
                    "";


                const usuarioId =
                    metadata.usuarioId ||
                    session.client_reference_id ||
                    "";


                const cursoId =
                    metadata.cursoId ||
                    "";


                const pago =
                    session.payment_status ===
                    "paid";


                const emailStripe =
                    session.customer_details?.email ||
                    session.customer_email ||
                    "";


                console.log(
                    "Pedido:",
                    pedidoId
                );

                console.log(
                    "Usuário:",
                    usuarioId
                );

                console.log(
                    "Curso ID:",
                    cursoId
                );

                console.log(
                    "Pago:",
                    pago
                );

                console.log(
                    "E-mail:",
                    emailStripe
                );


                if (!pedidoId) {

                    console.error(
                        "Webhook sem pedidoId."
                    );

                    return res.json({
                        recebido: true
                    });
                }


                // =================================================
                // PEDIDO
                // =================================================

                const pedidoRef =
                    db
                        .collection("pedidos")
                        .doc(pedidoId);


                const pedidoSnapshot =
                    await pedidoRef.get();


                const pedidoAtual =
                    pedidoSnapshot.exists
                        ? pedidoSnapshot.data() || {}
                        : {};


                // =================================================
                // EVITAR DUPLICAÇÃO
                // =================================================

                if (
                    pedidoAtual.webhookProcessado ===
                    true
                ) {

                    console.log(
                        "Webhook já processado:",
                        pedidoId
                    );

                    return res.json({
                        recebido: true,
                        duplicado: true
                    });
                }


                // =================================================
                // E-MAIL
                // =================================================

                const emailUsuario =
                    await buscarEmailUsuario({

                        usuarioId:
                            usuarioId,

                        emailStripe:
                            emailStripe,

                        emailPedido:
                            pedidoAtual.email

                    });


                // =================================================
                // CURSO
                // =================================================

                const cursoIdFinal =
                    cursoId ||
                    pedidoAtual.cursoId ||
                    "";


                const curso =
                    await buscarCursoPorId(
                        cursoIdFinal
                    );


                if (!curso) {

                    throw new Error(
                        `Curso ID "${cursoIdFinal}" não encontrado.`
                    );
                }


                if (!curso.ativo) {

                    throw new Error(
                        `O curso "${curso.nome}" está desativado.`
                    );
                }


                // =================================================
                // ATUALIZAR PEDIDO
                // =================================================

                await pedidoRef.set(

                    {

                        pedidoId:
                            pedidoId,

                        sessionId:
                            session.id,

                        usuarioId:
                            usuarioId,

                        email:
                            emailUsuario,

                        cursoId:
                            curso.id,

                        curso:
                            curso.nome,

                        categoria:
                            curso.categoria,

                        descricao:
                            curso.descricao,

                        valor:
                            curso.valor,

                        linkCurso:
                            curso.linkCurso,

                        pago:
                            pago,

                        paymentStatus:
                            session.payment_status,

                        webhookProcessado:
                            true,

                        webhookProcessadoEm:
                            FieldValue
                                .serverTimestamp(),

                        atualizadoEm:
                            FieldValue
                                .serverTimestamp()

                    },

                    {
                        merge:
                            true
                    }

                );


                // =================================================
                // PAGAMENTO
                // =================================================

                await db
                    .collection("pagamentos")
                    .doc(pedidoId)
                    .set(

                        {

                            pedidoId:
                                pedidoId,

                            sessionId:
                                session.id,

                            usuarioId:
                                usuarioId,

                            email:
                                emailUsuario,

                            cursoId:
                                curso.id,

                            curso:
                                curso.nome,

                            categoria:
                                curso.categoria,

                            valor:
                                curso.valor,

                            pago:
                                pago,

                            paymentStatus:
                                session.payment_status,

                            criadoEm:
                                FieldValue
                                    .serverTimestamp(),

                            atualizadoEm:
                                FieldValue
                                    .serverTimestamp()

                        },

                        {
                            merge:
                                true
                        }

                    );


                // =================================================
                // ENVIAR SENHA
                // =================================================

                if (pago) {

                    try {

                        await enviarSenhaCursoPorEmail({

                            pedidoId:
                                pedidoId,

                            usuarioId:
                                usuarioId,

                            email:
                                emailUsuario,

                            cursoId:
                                curso.id,

                            pedidoAtual:
                                pedidoAtual

                        });

                    }
                    catch (erroEmail) {

                        console.error(
                            "ERRO AO ENVIAR E-MAIL:",
                            erroEmail
                        );


                        await pedidoRef.set(

                            {

                                emailErro:
                                    erroEmail.message,

                                emailErroEm:
                                    FieldValue
                                        .serverTimestamp(),

                                email:
                                    emailUsuario

                            },

                            {
                                merge:
                                    true
                            }

                        );
                    }
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


                const metadata =
                    session.metadata || {};


                const pedidoId =
                    metadata.pedidoId ||
                    "";


                if (pedidoId) {

                    await db
                        .collection("pedidos")
                        .doc(pedidoId)
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
                                merge:
                                    true
                            }

                        );
                }
            }


            // =================================================
            // RESPOSTA
            // =================================================

            return res.json({

                recebido:
                    true

            });

        }
        catch (error) {

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
                        error.message

                });
        }

    }
);


// =====================================================
// AGORA SIM:
//
// JSON NORMAL
// =====================================================

app.use(
    express.json()
);


// =====================================================
// ESCAPAR HTML
// =====================================================

function escaparHtml(valor) {

    return String(
        valor ?? ""
    )

        .replace(
            /&/g,
            "&amp;"
        )

        .replace(
            /</g,
            "&lt;"
        )

        .replace(
            />/g,
            "&gt;"
        )

        .replace(
            /"/g,
            "&quot;"
        )

        .replace(
            /'/g,
            "&#039;"
        );
}


// =====================================================
// BUSCAR CURSO POR ID
// =====================================================

async function buscarCursoPorId(cursoId) {

    const id =
        String(
            cursoId || ""
        ).trim();


    if (!id) {
        return null;
    }


    const documento =
        await db
            .collection("cursos_config")
            .doc(id)
            .get();


    if (!documento.exists) {

        console.warn(
            "Curso não encontrado:",
            id
        );

        return null;
    }


    const dados =
        documento.data() || {};


    return {

        id:
            documento.id,

        nome:
            String(
                dados.nome ||
                documento.id
            ).trim(),

        descricao:
            String(
                dados.descricao ||
                "Curso adquirido na plataforma."
            ).trim(),

        senhaCurso:
            String(
                dados.senhaCurso ||
                ""
            ).trim(),

        linkCurso:
            String(
                dados.linkCurso ||
                ""
            ).trim(),

        categoria:
            String(
                dados.categoria ||
                "EAD"
            ).trim(),

        ativo:
            dados.ativo !== false,

        valor:
            Number(
                dados.valor
            ) || 0

    };
}


// =====================================================
// BUSCAR E-MAIL
// =====================================================

async function buscarEmailUsuario({

    usuarioId,
    emailStripe,
    emailPedido

}) {

    if (
        emailStripe &&
        String(emailStripe).trim()
    ) {

        return String(
            emailStripe
        ).trim();
    }


    if (
        emailPedido &&
        String(emailPedido).trim()
    ) {

        return String(
            emailPedido
        ).trim();
    }


    if (
        usuarioId &&
        String(usuarioId).trim()
    ) {

        try {

            const usuario =
                await firebaseAuth
                    .getUser(
                        usuarioId
                    );


            if (usuario.email) {

                return String(
                    usuario.email
                ).trim();
            }

        }
        catch (error) {

            console.warn(
                "Erro buscando usuário:",
                error.message
            );
        }
    }


    return "";
}

// =====================================================
// SMTP
// =====================================================
//
// Gmail:
//
// SMTP_USER = seuemail@gmail.com
// SMTP_PASS = senha de aplicativo do Google
//
// NÃO use a senha normal da conta Google.
// =====================================================

let emailTransporter = null;


if (
    SMTP_USER &&
    SMTP_PASS
) {

    emailTransporter =
        nodemailer.createTransport({

            host:
                "smtp.gmail.com",

            port:
                465,

            secure:
                true,

            auth: {

                user:
                    SMTP_USER,

                pass:
                    SMTP_PASS

            },

            connectionTimeout:
                30000,

            greetingTimeout:
                30000,

            socketTimeout:
                60000

        });


    console.log(
        "Sistema SMTP configurado."
    );


    emailTransporter
        .verify()

        .then(() => {

            console.log(
                "SMTP: CONEXÃO OK."
            );

        })

        .catch((error) => {

            console.error(
                "SMTP: ERRO NA CONEXÃO."
            );

            console.error(
                error.message
            );

        });

}
else {

    console.warn(
        "SMTP não configurado."
    );
}


// =====================================================
// ENVIAR SENHA POR E-MAIL
// =====================================================

async function enviarSenhaCursoPorEmail({

    pedidoId,
    usuarioId,
    email,
    cursoId,
    pedidoAtual

}) {

    if (!email) {

        throw new Error(
            "E-mail do usuário não encontrado."
        );
    }


    if (!emailTransporter) {

        throw new Error(
            "SMTP não configurado."
        );
    }


    // =================================================
    // NÃO ENVIAR DUAS VEZES
    // =================================================

    if (
        pedidoAtual?.senhaEmailEnviado ===
        true
    ) {

        console.log(
            "E-mail já enviado:",
            pedidoId
        );

        return {

            enviado:
                false,

            jaEnviado:
                true

        };
    }


    // =================================================
    // BUSCAR CURSO
    // =================================================

    const curso =
        await buscarCursoPorId(
            cursoId
        );


    if (!curso) {

        throw new Error(
            `Curso ID "${cursoId}" não encontrado.`
        );
    }


    if (!curso.senhaCurso) {

        throw new Error(
            `O curso "${curso.nome}" não possui senha.`
        );
    }


    const nomeCurso =
        escaparHtml(
            curso.nome
        );


    const senhaCurso =
        escaparHtml(
            curso.senhaCurso
        );


    // =================================================
    // E-MAIL
    // =================================================

    const html = `

<!DOCTYPE html>

<html lang="pt-BR">

<head>

    <meta charset="UTF-8">

    <meta
        name="viewport"
        content="width=device-width, initial-scale=1.0"
    >

    <title>
        Acesso ao curso
    </title>

</head>

<body
    style="
        margin:0;
        padding:30px;
        background:#f5f5f5;
        font-family:Arial,sans-serif;
    "
>

    <div
        style="
            max-width:600px;
            margin:auto;
            background:white;
            padding:30px;
            border-radius:10px;
        "
    >

        <h2>
            Acesso ao curso
        </h2>

        <p>
            Seu pagamento foi confirmado.
        </p>

        <p>

            <strong>
                Curso:
            </strong>

            ${nomeCurso}

        </p>

        <p>

            <strong>
                Senha:
            </strong>

        </p>

        <div
            style="
                background:#eeeeee;
                padding:20px;
                text-align:center;
                font-size:24px;
                font-weight:bold;
                border-radius:8px;
                letter-spacing:2px;
            "
        >

            ${senhaCurso}

        </div>

        <p>
            O acesso ao curso está disponível
            dentro da plataforma.
        </p>

        <p>
            Entre na plataforma e acesse
            o curso adquirido.
        </p>

    </div>

</body>

</html>

`;


    const texto = `

Seu pagamento foi confirmado.

Curso: ${curso.nome}

Senha: ${curso.senhaCurso}

O acesso ao curso está disponível dentro da plataforma.

`;


    // =================================================
    // ENVIO
    // =================================================

    const resultado =
        await emailTransporter.sendMail({

            from:
                EMAIL_FROM,

            to:
                email,

            subject:
                `Acesso ao curso ${curso.nome}`,

            text:
                texto,

            html:
                html

        });


    console.log(
        "E-MAIL ENVIADO:",
        resultado.messageId
    );


    // =================================================
    // REGISTRAR ENVIO
    // =================================================

    await db
        .collection("pedidos")
        .doc(pedidoId)
        .set(

            {

                senhaEmailEnviado:
                    true,

                senhaEmailEnviadoEm:
                    FieldValue
                        .serverTimestamp(),

                email:
                    email,

                emailMessageId:
                    resultado.messageId,

                atualizadoEm:
                    FieldValue
                        .serverTimestamp()

            },

            {
                merge:
                    true
            }

        );


    return {

        enviado:
            true,

        jaEnviado:
            false,

        messageId:
            resultado.messageId

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

                cursoId,
                usuarioId,
                email

            } = req.body;


            // =================================================
            // VALIDAR
            // =================================================

            if (!cursoId) {

                return res
                    .status(400)
                    .json({

                        erro:
                            "Informe o ID do curso."

                    });
            }


            if (!usuarioId) {

                return res
                    .status(400)
                    .json({

                        erro:
                            "Usuário não informado."

                    });
            }


            // =================================================
            // CURSO
            // =================================================

            const curso =
                await buscarCursoPorId(
                    cursoId
                );


            if (!curso) {

                return res
                    .status(404)
                    .json({

                        erro:
                            "Curso não encontrado."

                    });
            }


            if (!curso.ativo) {

                return res
                    .status(400)
                    .json({

                        erro:
                            "Este curso está indisponível."

                    });
            }


            if (
                !curso.valor ||
                curso.valor <= 0
            ) {

                return res
                    .status(400)
                    .json({

                        erro:
                            "O curso não possui preço configurado."

                    });
            }


            // =================================================
            // E-MAIL
            // =================================================

            let emailUsuario =
                String(
                    email || ""
                ).trim();


            if (!emailUsuario) {

                try {

                    const usuario =
                        await firebaseAuth
                            .getUser(
                                usuarioId
                            );


                    emailUsuario =
                        usuario.email ||
                        "";

                }
                catch (error) {

                    console.warn(
                        "Não foi possível buscar e-mail:",
                        error.message
                    );
                }
            }


            // =================================================
            // PEDIDO
            // =================================================

            const pedidoRef =
                db
                    .collection("pedidos")
                    .doc();


            const pedidoId =
                pedidoRef.id;


            await pedidoRef.set({

                pedidoId:
                    pedidoId,

                usuarioId:
                    usuarioId,

                email:
                    emailUsuario,

                cursoId:
                    curso.id,

                curso:
                    curso.nome,

                categoria:
                    curso.categoria,

                descricao:
                    curso.descricao,

                valor:
                    curso.valor,

                linkCurso:
                    curso.linkCurso,

                pago:
                    false,

                paymentStatus:
                    "unpaid",

                criadoEm:
                    FieldValue
                        .serverTimestamp(),

                atualizadoEm:
                    FieldValue
                        .serverTimestamp()

            });


            // =================================================
            // STRIPE
            // =================================================

            const valorCentavos =
                Math.round(
                    curso.valor * 100
                );


            const session =
                await stripe.checkout.sessions.create({

                    mode:
                        "payment",

                    payment_method_types:
                        ["card"],

                    customer_email:
                        emailUsuario ||
                        undefined,

                    client_reference_id:
                        usuarioId,

                    metadata: {

                        pedidoId:
                            pedidoId,

                        usuarioId:
                            usuarioId,

                        cursoId:
                            curso.id

                    },

                    line_items: [

                        {

                            price_data: {

                                currency:
                                    "brl",

                                product_data: {

                                    name:
                                        curso.nome,

                                    description:
                                        curso.descricao

                                },

                                unit_amount:
                                    valorCentavos

                            },

                            quantity:
                                1

                        }

                    ],

                    success_url:
                        process.env.STRIPE_SUCCESS_URL ||
                        "https://plataforma-56gy.onrender.com/sucesso",

                    cancel_url:
                        process.env.STRIPE_CANCEL_URL ||
                        "https://plataforma-56gy.onrender.com/cancelado"

                });


            // =================================================
            // SALVAR SESSION
            // =================================================

            await pedidoRef.set(

                {

                    sessionId:
                        session.id,

                    paymentStatus:
                        "unpaid",

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
                "PAGAMENTO CRIADO:",
                session.id
            );


            return res.json({

                sucesso:
                    true,

                id:
                    session.id,

                sessionId:
                    session.id,

                pedidoId:
                    pedidoId,

                cursoId:
                    curso.id,

                curso:
                    curso.nome

            });

        }
        catch (error) {

            console.error(
                "Erro criando pagamento:",
                error
            );

            return res
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
//
// Essa rota valida:
// 1. usuário
// 2. pedido
// 3. curso
// 4. pagamento
// 5. senha
//
// Depois devolve o link do curso.
// O link NÃO fica no e-mail.
// =====================================================

app.post(
    "/usar-senha-curso",

    async (req, res) => {

        try {

            const {

                pedidoId,
                senha

            } = req.body;


            if (!pedidoId) {

                return res
                    .status(400)
                    .json({

                        erro:
                            "Pedido não informado."

                    });
            }


            if (!senha) {

                return res
                    .status(400)
                    .json({

                        erro:
                            "Digite a senha do curso."

                    });
            }


            // =================================================
            // PEDIDO
            // =================================================

            const pedidoSnapshot =
                await db
                    .collection("pedidos")
                    .doc(pedidoId)
                    .get();


            if (!pedidoSnapshot.exists) {

                return res
                    .status(404)
                    .json({

                        erro:
                            "Pedido não encontrado."

                    });
            }


            const pedido =
                pedidoSnapshot.data();


            // =================================================
            // PAGAMENTO
            // =================================================

            if (
                pedido.pago !== true ||
                pedido.paymentStatus !== "paid"
            ) {

                return res
                    .status(401)
                    .json({

                        erro:
                            "O pagamento deste curso ainda não foi confirmado."

                    });
            }


            // =================================================
            // CURSO
            // =================================================

            const curso =
                await buscarCursoPorId(
                    pedido.cursoId
                );


            if (!curso) {

                return res
                    .status(404)
                    .json({

                        erro:
                            "Curso não encontrado."

                    });
            }


            // =================================================
            // SENHA
            // =================================================

            if (
                String(senha).trim() !==
                curso.senhaCurso
            ) {

                return res
                    .status(401)
                    .json({

                        erro:
                            "Senha do curso incorreta."

                    });
            }


            // =================================================
            // REGISTRAR ACESSO
            // =================================================

            await db
                .collection("pedidos")
                .doc(pedidoId)
                .set(

                    {

                        ultimoAcessoEm:
                            FieldValue
                                .serverTimestamp(),

                        senhaUtilizada:
                            true

                    },

                    {
                        merge:
                            true
                    }

                );


            // =================================================
            // DEVOLVER LINK
            // =================================================

            return res.json({

                sucesso:
                    true,

                cursoId:
                    curso.id,

                curso:
                    curso.nome,

                linkCurso:
                    curso.linkCurso,

                mensagem:
                    "Senha válida."

            });

        }
        catch (error) {

            console.error(
                "Erro usando senha:",
                error
            );

            return res
                .status(500)
                .json({

                    erro:
                        "Erro interno ao validar a senha."

                });
        }

    }
);


// =====================================================
// TESTE DE E-MAIL
// =====================================================

app.get(
    "/testar-email",

    async (req, res) => {

        try {

            const email =
                String(
                    req.query.email ||
                    ""
                ).trim();


            if (!email) {

                return res
                    .status(400)
                    .json({

                        sucesso:
                            false,

                        erro:
                            "Informe o e-mail."

                    });
            }


            if (!emailTransporter) {

                return res
                    .status(500)
                    .json({

                        sucesso:
                            false,

                        erro:
                            "SMTP não configurado."

                    });
            }


            const resultado =
                await emailTransporter.sendMail({

                    from:
                        EMAIL_FROM,

                    to:
                        email,

                    subject:
                        "Teste de e-mail - Plataforma",

                    text:
                        "O sistema de e-mail está funcionando.",

                    html:
                        `
                        <h2>
                            Teste de e-mail
                        </h2>

                        <p>
                            O sistema de e-mail
                            está funcionando corretamente.
                        </p>
                        `

                });


            return res.json({

                sucesso:
                    true,

                messageId:
                    resultado.messageId,

                email:
                    email

            });

        }
        catch (error) {

            console.error(
                "Erro teste e-mail:",
                error
            );

            return res
                .status(500)
                .json({

                    sucesso:
                        false,

                    erro:
                        error.message

                });
        }

    }
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
                "configurada",

            email:
                emailTransporter
                    ? "configurado"
                    : "não configurado",

            sistema:
                "Curso por ID + Stripe",

            linkNoEmail:
                false,

            linkNaPlataforma:
                true

        });

    }
);


// =====================================================
// HEALTH
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
                new Date()
                    .toISOString()

        });

    }
);


// =====================================================
// ERRO 404
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
// SERVIDOR
// =====================================================

app.listen(
    PORT,
    () => {

        console.log(
            "======================================"
        );

        console.log(
            `Servidor rodando na porta ${PORT}`
        );

        console.log(
            "======================================"
        );

    }
);