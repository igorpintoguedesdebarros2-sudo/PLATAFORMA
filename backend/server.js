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
// CONFIGURAÇÃO
// =====================================================

const app = express();

const PORT =
    process.env.PORT || 10000;


// =====================================================
// VARIÁVEIS DE AMBIENTE
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

const FRONTEND_URL =
    process.env.FRONTEND_URL ||
    "https://plataforma-56gy.onrender.com";


// =====================================================
// SMTP
// =====================================================

const SMTP_USER =
    process.env.SMTP_USER;

const SMTP_PASS =
    process.env.SMTP_PASS;

const EMAIL_FROM =
    process.env.EMAIL_FROM ||
    SMTP_USER;


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
// FIREBASE AUTH
// =====================================================

const firebaseAuth =
    getAuth(
        firebaseApp
    );


// =====================================================
// E-MAIL
// =====================================================

let emailTransporter = null;

if (
    SMTP_USER &&
    SMTP_PASS
) {

    emailTransporter =
        nodemailer.createTransport({

            service:
                "gmail",

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
        "Sistema de e-mail configurado."
    );

    emailTransporter.verify()

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
                error
            );

        });

} else {

    console.warn(
        "SMTP não configurado."
    );
}


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
//
// IMPORTANTE:
// express.raw() precisa ficar ANTES de express.json().
// =====================================================

app.post(

    "/webhook-stripe",

    express.raw({
        type: "application/json"
    }),

    async (
        req,
        res
    ) => {

        if (
            !STRIPE_WEBHOOK_SECRET
        ) {

            console.error(
                "STRIPE_WEBHOOK_SECRET não configurado."
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
                "======================================"
            );

            console.log(
                "WEBHOOK STRIPE:",
                evento.type
            );

            console.log(
                "======================================"
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
                    session.metadata ||
                    {};


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
                        .collection(
                            "pedidos"
                        )
                        .doc(
                            pedidoId
                        );


                const pedidoSnapshot =
                    await pedidoRef.get();


                const dadosAtuais =
                    pedidoSnapshot.exists
                        ? pedidoSnapshot.data() || {}
                        : {};


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
                            dadosAtuais.email

                    });


                // =================================================
                // CURSO
                // =================================================

                const cursoIdFinal =
                    cursoId ||
                    dadosAtuais.cursoId ||
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

                        // Link fica no banco.
                        // NÃO é enviado por e-mail.
                        linkCurso:
                            curso.linkCurso,

                        senhaCurso:
                            curso.senhaCurso,

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


                // =================================================
                // REGISTRAR PAGAMENTO
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
                // ENVIAR E-MAIL
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
                                dadosAtuais

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
                    session.metadata ||
                    {};


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
                                merge:
                                    true
                            }

                        );

                }

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
                    "PaymentIntent:",
                    paymentIntent.id
                );

            }


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
// JSON NORMAL
//
// TEM QUE VIR DEPOIS DO WEBHOOK.
// =====================================================

app.use(
    express.json()
);


// =====================================================
// FUNÇÃO ESCAPAR HTML
// =====================================================

function escaparHtml(
    valor
) {

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
// BUSCAR CURSO PELO ID
// =====================================================

async function buscarCursoPorId(
    cursoId
) {

    const id =
        String(
            cursoId || ""
        ).trim();


    if (!id) {

        return null;

    }


    try {

        const documento =
            await db
                .collection(
                    "cursos_config"
                )
                .doc(
                    id
                )
                .get();


        if (
            !documento.exists
        ) {

            console.warn(
                "Curso não encontrado:",
                id
            );

            return null;

        }


        const dados =
            documento.data() ||
            {};


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
                    dados["descrição"] ||
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
    catch (error) {

        console.error(
            "Erro buscando curso:",
            error
        );

        throw error;

    }

}


// =====================================================
// BUSCAR E-MAIL DO USUÁRIO
// =====================================================

async function buscarEmailUsuario({

    usuarioId,
    emailStripe,
    emailPedido

}) {

    if (
        emailStripe &&
        String(
            emailStripe
        ).trim()
    ) {

        return String(
            emailStripe
        ).trim();

    }


    if (
        emailPedido &&
        String(
            emailPedido
        ).trim()
    ) {

        return String(
            emailPedido
        ).trim();

    }


    if (
        usuarioId &&
        String(
            usuarioId
        ).trim()
    ) {

        try {

            const usuario =
                await firebaseAuth
                    .getUser(
                        usuarioId
                    );


            if (
                usuario.email
            ) {

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
// ENVIAR SENHA POR E-MAIL
//
// ENVIA:
// - nome do curso
// - senha
//
// NÃO ENVIA:
// - link do curso
// =====================================================

async function enviarSenhaCursoPorEmail({

    pedidoId,
    usuarioId,
    email,
    cursoId,
    pedidoAtual

}) {

    console.log(
        "======================================"
    );

    console.log(
        "INICIANDO ENVIO DE E-MAIL"
    );

    console.log(
        "Pedido:",
        pedidoId
    );

    console.log(
        "Curso ID:",
        cursoId
    );

    console.log(
        "E-mail:",
        email
    );

    console.log(
        "======================================"
    );


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


    const nomeCursoHtml =
        escaparHtml(
            curso.nome
        );


    const senhaCursoHtml =
        escaparHtml(
            curso.senhaCurso
        );


    const pedidoIdHtml =
        escaparHtml(
            pedidoId
        );


    const html = `

<!DOCTYPE html>

<html lang="pt-BR">

<head>

    <meta charset="UTF-8">

    <title>Acesso ao curso</title>

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
            background:#ffffff;
            padding:30px;
            border-radius:10px;
        "
    >

        <h1>
            Acesso ao curso
        </h1>

        <p>
            Seu pagamento foi confirmado.
        </p>

        <p>

            <strong>
                Curso:
            </strong>

            ${nomeCursoHtml}

        </p>

        <p>

            <strong>
                Senha:
            </strong>

        </p>

        <div
            style="
                background:#eeeeee;
                padding:18px;
                font-size:24px;
                font-weight:bold;
                text-align:center;
                letter-spacing:2px;
                border-radius:6px;
            "
        >

            ${senhaCursoHtml}

        </div>

        <p>
            Acesse o curso diretamente pela
            plataforma.
        </p>

        <p
            style="
                color:#777;
                font-size:12px;
            "
        >

            Pedido:
            ${pedidoIdHtml}

        </p>

    </div>

</body>

</html>

`;


    const texto = `

Seu pagamento foi confirmado.

Curso: ${curso.nome}

Senha: ${curso.senhaCurso}

Acesse o curso diretamente pela plataforma.

Pedido: ${pedidoId}

`;


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


    await db
        .collection(
            "pedidos"
        )
        .doc(
            pedidoId
        )
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
// CRIAR PAGAMENTO STRIPE
// =====================================================
//
// POST /criar-pagamento
//
// Body:
//
// {
//     "cursoId": "1001",
//     "usuarioId": "...",
//     "email": "usuario@email.com"
// }
//
// =====================================================

app.post(

    "/criar-pagamento",

    async (
        req,
        res
    ) => {

        try {

            console.log(
                "======================================"
            );

            console.log(
                "CRIAR PAGAMENTO"
            );

            console.log(
                "Body:",
                req.body
            );

            console.log(
                "======================================"
            );


            const cursoId =
                String(
                    req.body?.cursoId ||
                    req.body?.curso ||
                    ""
                ).trim();


            const usuarioId =
                String(
                    req.body?.usuarioId ||
                    ""
                ).trim();


            const email =
                String(
                    req.body?.email ||
                    ""
                ).trim();


            // =================================================
            // VALIDAR ID
            // =================================================

            if (!cursoId) {

                return res
                    .status(400)
                    .json({

                        sucesso:
                            false,

                        erro:
                            "Informe o ID do curso."

                    });

            }


            // =================================================
            // VALIDAR USUÁRIO
            // =================================================

            if (!usuarioId) {

                return res
                    .status(400)
                    .json({

                        sucesso:
                            false,

                        erro:
                            "Usuário não informado."

                    });

            }


            // =================================================
            // BUSCAR CURSO
            // =================================================

            const curso =
                await buscarCursoPorId(
                    cursoId
                );


            if (!curso) {

                return res
                    .status(404)
                    .json({

                        sucesso:
                            false,

                        erro:
                            `Curso com ID "${cursoId}" não encontrado.`

                    });

            }


            // =================================================
            // CURSO DESATIVADO
            // =================================================

            if (
                curso.ativo !== true
            ) {

                return res
                    .status(400)
                    .json({

                        sucesso:
                            false,

                        erro:
                            "Este curso não está disponível para compra."

                    });

            }


            // =================================================
            // VALOR
            // =================================================

            if (
                curso.valor <= 0
            ) {

                return res
                    .status(400)
                    .json({

                        sucesso:
                            false,

                        erro:
                            "O curso não possui um valor válido."

                    });

            }


            // =================================================
            // GERAR PEDIDO
            // =================================================

            const pedidoRef =
                db
                    .collection(
                        "pedidos"
                    )
                    .doc();


            const pedidoId =
                pedidoRef.id;


            // =================================================
            // E-MAIL
            // =================================================

            let emailFinal =
                email;


            if (!emailFinal) {

                emailFinal =
                    await buscarEmailUsuario({

                        usuarioId:
                            usuarioId,

                        emailStripe:
                            "",

                        emailPedido:
                            ""

                    });

            }


            // =================================================
            // SALVAR PEDIDO ANTES DO STRIPE
            // =================================================

            await pedidoRef.set({

                pedidoId:
                    pedidoId,

                usuarioId:
                    usuarioId,

                email:
                    emailFinal,

                cursoId:
                    curso.id,

                curso:
                    curso.nome,

                descricao:
                    curso.descricao,

                categoria:
                    curso.categoria,

                valor:
                    curso.valor,

                linkCurso:
                    curso.linkCurso,

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
                await stripe.checkout.sessions.create({

                    mode:
                        "payment",


                    // -----------------------------------------
                    // E-MAIL
                    // -----------------------------------------

                    ...(emailFinal
                        ? {
                            customer_email:
                                emailFinal
                        }
                        : {}),


                    // -----------------------------------------
                    // REFERÊNCIA
                    // -----------------------------------------

                    client_reference_id:
                        usuarioId,


                    // -----------------------------------------
                    // METADATA
                    // -----------------------------------------

                    metadata: {

                        pedidoId:
                            pedidoId,

                        usuarioId:
                            usuarioId,

                        cursoId:
                            curso.id

                    },


                    // -----------------------------------------
                    // PRODUTO
                    // -----------------------------------------

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
                                    Math.round(
                                        curso.valor *
                                        100
                                    )

                            },

                            quantity:
                                1

                        }

                    ],


                    // -----------------------------------------
                    // URL DE SUCESSO
                    // -----------------------------------------

                    success_url:
                   'https://igorpintoguedesdebarros2-sudo.github.io/PLATAFORMA/sucesso.html',

                    // -----------------------------------------
                    // URL DE CANCELAMENTO
                    // -----------------------------------------

                    cancel_url:
                   'https://igorpintoguedesdebarros2-sudo.github.io/PLATAFORMA/pagamento'
                });


            // =================================================
            // ATUALIZAR PEDIDO COM STRIPE
            // =================================================

            await pedidoRef.set(

                {

                    sessionId:
                        session.id,

                    checkoutUrl:
                        session.url,

                    paymentStatus:
                        session.status ||
                        "open",

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
            // RESPOSTA
            // =================================================
            //
            // ESTE É O PONTO QUE CORRIGE:
            //
            // "O Stripe não retornou a URL de pagamento."
            //
            // Agora o frontend recebe:
            //
            // dados.url
            //
            // =================================================

            console.log(
                "PAGAMENTO CRIADO:",
                session.id
            );

            console.log(
                "URL STRIPE:",
                session.url
            );


            return res.json({

                sucesso:
                    true,

                id:
                    session.id,

                sessionId:
                    session.id,

                url:
                    session.url,

                pedidoId:
                    pedidoId,

                cursoId:
                    curso.id,

                curso:
                    curso.nome,

                valor:
                    curso.valor

            });

        }
        catch (error) {

            console.error(
                "ERRO AO CRIAR PAGAMENTO:",
                error
            );


            return res
                .status(500)
                .json({

                    sucesso:
                        false,

                    erro:
                        error.message ||
                        "Não foi possível criar o pagamento."

                });

        }

    }

);


// =====================================================
// ROTA PRINCIPAL
// =====================================================

app.get(

    "/",

    (
        req,
        res
    ) => {

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

            pagamento:
                "Stripe Checkout",

            senhaCursos:
                "ilimitada",

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

    (
        req,
        res
    ) => {

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
// TESTAR E-MAIL
// =====================================================

app.get(

    "/testar-email",

    async (
        req,
        res
    ) => {

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
                        <h1>
                            Teste de e-mail
                        </h1>

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
// ROTA 404
// =====================================================

app.use(

    (
        req,
        res
    ) => {

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
// INICIAR SERVIDOR
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
            "Stripe Checkout: OK"
        );

        console.log(
            "Webhook: /webhook-stripe"
        );

        console.log(
            "Pagamento: /criar-pagamento"
        );

        console.log(
            "======================================"
        );

    }

);