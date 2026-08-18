import "dotenv/config";

import express from "express";
import cors from "cors";
import Stripe from "stripe";
import { Resend } from "resend";

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
    "https://igorpintoguedesdebarros2-sudo.github.io/PLATAFORMA";


// =====================================================
// RESEND
// =====================================================

const RESEND_API_KEY =
    process.env.RESEND_API_KEY;


// Remetente usado enquanto o domínio ainda não estiver
// configurado/verificado no Resend.
//
// Depois você pode trocar para algo como:
//
// Plataforma <noreply@seudominio.com>
//
const EMAIL_FROM =
    process.env.EMAIL_FROM ||
    "Plataforma <onboarding@resend.dev>";


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


if (!RESEND_API_KEY) {

    console.error(
        "ERRO: RESEND_API_KEY não configurada."
    );

    process.exit(1);
}


if (!STRIPE_WEBHOOK_SECRET) {

    console.warn(
        "AVISO: STRIPE_WEBHOOK_SECRET não configurada."
    );

}


// =====================================================
// STRIPE
// =====================================================

const stripe =
    new Stripe(
        STRIPE_SECRET_KEY
    );


// =====================================================
// RESEND
// =====================================================

const resend =
    new Resend(
        RESEND_API_KEY
    );

console.log(
    "Resend configurado."
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
// MUITO IMPORTANTE:
//
// express.raw() precisa ficar ANTES de
// express.json().
//
// NÃO coloque app.use(express.json())
// antes desta rota.
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

        if (!STRIPE_WEBHOOK_SECRET) {

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

            console.error(
                "Webhook sem stripe-signature."
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
                "ERRO DE ASSINATURA STRIPE"
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
                "======================================"
            );

            console.log(
                "WEBHOOK STRIPE:"
            );

            console.log(
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

                await processarCheckoutConcluido(
                    evento.data.object
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
// TEM QUE FICAR DEPOIS DO WEBHOOK.
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
// BUSCAR CURSO
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
// PROCESSAR CHECKOUT
// =====================================================

async function processarCheckoutConcluido(
    session
) {

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


    console.log(
        "Checkout:",
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
        "Curso:",
        cursoId
    );

    console.log(
        "Pago:",
        pago
    );


    if (!pedidoId) {

        console.error(
            "Webhook sem pedidoId."
        );

        return;

    }


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


    const emailUsuario =
        await buscarEmailUsuario({

            usuarioId:
                usuarioId,

            emailStripe:
                emailStripe,

            emailPedido:
                dadosAtuais.email

        });


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
    // PAGAMENTO
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
    // E-MAIL
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
                erroEmail.message
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


// =====================================================
// ENVIAR SENHA POR E-MAIL - RESEND
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
        "INICIANDO ENVIO DE E-MAIL - RESEND"
    );

    console.log(
        "Pedido:",
        pedidoId
    );

    console.log(
        "Curso:",
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


    if (!RESEND_API_KEY) {

        throw new Error(
            "RESEND_API_KEY não configurada."
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
            <strong>Curso:</strong>
            ${nomeCursoHtml}
        </p>

        <p>
            <strong>Senha:</strong>
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
            Acesse o curso pela plataforma.
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

Acesse o curso pela plataforma.

Pedido: ${pedidoId}

`;


    // =================================================
    // RESEND
    // =================================================

    const resultado =
        await resend.emails.send({

            from:
                EMAIL_FROM,

            to:
                [email],

            subject:
                `Acesso ao curso ${curso.nome}`,

            text:
                texto,

            html:
                html

        });


    if (
        resultado.error
    ) {

        console.error(
            "RESEND ERRO:",
            resultado.error
        );

        throw new Error(
            resultado.error.message ||
            "Erro ao enviar e-mail pelo Resend."
        );

    }


    const messageId =
        resultado.data?.id ||
        "";


    console.log(
        "E-MAIL ENVIADO PELO RESEND:",
        messageId
    );


    // =================================================
    // REGISTRAR ENVIO
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

                senhaEmailEnviado:
                    true,

                senhaEmailEnviadoEm:
                    FieldValue
                        .serverTimestamp(),

                email:
                    email,

                emailMessageId:
                    messageId,

                emailProvider:
                    "resend",

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
            messageId

    };

}


// =====================================================
// CRIAR PAGAMENTO
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
            // PEDIDO
            // =================================================

            const pedidoIdRecebido =
                String(
                    req.body?.pedidoId ||
                    ""
                ).trim();


            let pedidoRef;


            if (pedidoIdRecebido) {

                pedidoRef =
                    db
                        .collection(
                            "pedidos"
                        )
                        .doc(
                            pedidoIdRecebido
                        );

            } else {

                pedidoRef =
                    db
                        .collection(
                            "pedidos"
                        )
                        .doc();

            }


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
            // SALVAR PEDIDO
            // =================================================

            await pedidoRef.set(

                {

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

                },

                {
                    merge:
                        true
                }

            );


            // =================================================
            // URL DE SUCESSO
            // =================================================

            const successUrl =
                `${FRONTEND_URL}/sucesso.html?session_id={CHECKOUT_SESSION_ID}&pedidoId=${encodeURIComponent(pedidoId)}`;


            const cancelUrl =
                `${FRONTEND_URL}/pagamento.html?cancelado=true&pedidoId=${encodeURIComponent(pedidoId)}`;


            console.log(
                "SUCCESS URL:",
                successUrl
            );


            console.log(
                "CANCEL URL:",
                cancelUrl
            );


            // =================================================
            // STRIPE
            // =================================================

            const session =
                await stripe.checkout.sessions.create({

                    mode:
                        "payment",

                    ...(emailFinal
                        ? {

                            customer_email:
                                emailFinal

                        }
                        : {}),

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
                                    Math.round(
                                        curso.valor *
                                        100
                                    )

                            },

                            quantity:
                                1

                        }

                    ],

                    success_url:
                        successUrl,

                    cancel_url:
                        cancelUrl

                });


            if (!session.url) {

                throw new Error(
                    "O Stripe não retornou a URL de checkout."
                );

            }


            // =================================================
            // ATUALIZAR PEDIDO
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


            console.log(
                "PAGAMENTO CRIADO:",
                session.id
            );

            console.log(
                "PEDIDO:",
                pedidoId
            );

            console.log(
                "URL:",
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

                checkoutUrl:
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
// CONSULTAR PAGAMENTO
//
// GET:
//
// /consultar-pagamento?session_id=cs_test_...
// =====================================================

app.get(

    "/consultar-pagamento",

    async (
        req,
        res
    ) => {

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

                        sucesso:
                            false,

                        erro:
                            "session_id não informado."

                    });

            }


            console.log(
                "======================================"
            );

            console.log(
                "CONSULTAR PAGAMENTO"
            );

            console.log(
                "Session:",
                sessionId
            );

            console.log(
                "======================================"
            );


            // =================================================
            // CONSULTAR SESSION DIRETAMENTE NO STRIPE
            // =================================================

            const session =
                await stripe.checkout.sessions.retrieve(
                    sessionId
                );


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


            // =================================================
            // PEDIDO FIRESTORE
            // =================================================

            let dadosPedido = {};


            if (pedidoId) {

                const pedidoSnapshot =
                    await db
                        .collection(
                            "pedidos"
                        )
                        .doc(
                            pedidoId
                        )
                        .get();


                if (
                    pedidoSnapshot.exists
                ) {

                    dadosPedido =
                        pedidoSnapshot.data() ||
                        {};

                }

            }


            // =================================================
            // CURSO
            // =================================================

            const cursoIdFinal =
                cursoId ||
                dadosPedido.cursoId ||
                "";


            let curso =
                null;


            if (cursoIdFinal) {

                curso =
                    await buscarCursoPorId(
                        cursoIdFinal
                    );

            }


            // =================================================
            // SE PAGOU, SINCRONIZAR PEDIDO
            // =================================================

            if (
                pago &&
                pedidoId &&
                curso
            ) {

                const emailUsuario =
                    await buscarEmailUsuario({

                        usuarioId:
                            usuarioId,

                        emailStripe:
                            emailStripe,

                        emailPedido:
                            dadosPedido.email

                    });


                await db
                    .collection(
                        "pedidos"
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

                            descricao:
                                curso.descricao,

                            valor:
                                curso.valor,

                            linkCurso:
                                curso.linkCurso,

                            pago:
                                true,

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
                                true,

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


                dadosPedido = {

                    ...dadosPedido,

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
                        true,

                    paymentStatus:
                        session.payment_status

                };

            }


            // =================================================
            // RESPOSTA
            // =================================================

            return res.json({

                sucesso:
                    true,

                pago:
                    pago,

                paymentStatus:
                    session.payment_status,

                sessionId:
                    session.id,

                pedidoId:
                    pedidoId,

                usuarioId:
                    usuarioId,

                cursoId:
                    curso?.id ||
                    dadosPedido.cursoId ||
                    "",

                curso:
                    curso?.nome ||
                    dadosPedido.curso ||
                    "",

                valor:
                    curso?.valor ||
                    dadosPedido.valor ||
                    0,

                linkCurso:
                    pago
                        ? (
                            curso?.linkCurso ||
                            dadosPedido.linkCurso ||
                            ""
                        )
                        : "",

                email:
                    emailStripe ||
                    dadosPedido.email ||
                    ""

            });

        }
        catch (error) {

            console.error(
                "ERRO AO CONSULTAR PAGAMENTO:",
                error
            );


            return res
                .status(500)
                .json({

                    sucesso:
                        false,

                    erro:
                        error.message ||
                        "Erro ao consultar pagamento."

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

            webhook:
                STRIPE_WEBHOOK_SECRET
                    ? "configurado"
                    : "não configurado",

            email:
                RESEND_API_KEY
                    ? "Resend configurado"
                    : "não configurado",

            sistema:
                "Curso por ID + Stripe",

            pagamento:
                "Stripe Checkout",

            consultaPagamento:
                "/consultar-pagamento",

            senhaCursos:
                "Firestore",

            emailProvider:
                "Resend",

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
// TESTAR E-MAIL - RESEND
//
// Exemplo:
//
// /testar-email?email=seuemail@gmail.com
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


            if (!RESEND_API_KEY) {

                return res
                    .status(500)
                    .json({

                        sucesso:
                            false,

                        erro:
                            "RESEND_API_KEY não configurada."

                    });

            }


            console.log(
                "======================================"
            );

            console.log(
                "TESTANDO E-MAIL COM RESEND"
            );

            console.log(
                "Para:",
                email
            );

            console.log(
                "De:",
                EMAIL_FROM
            );

            console.log(
                "======================================"
            );


            const resultado =
                await resend.emails.send({

                    from:
                        EMAIL_FROM,

                    to:
                        [email],

                    subject:
                        "Teste de e-mail - Plataforma",

                    text:
                        "O sistema de e-mail está funcionando através do Resend.",

                    html:
                        `
                        <!DOCTYPE html>

                        <html lang="pt-BR">

                        <head>

                            <meta charset="UTF-8">

                            <title>
                                Teste de e-mail
                            </title>

                        </head>

                        <body
                            style="
                                font-family:Arial,sans-serif;
                                padding:30px;
                            "
                        >

                            <h1>
                                Teste de e-mail
                            </h1>

                            <p>
                                O sistema de e-mail
                                está funcionando.
                            </p>

                            <p>
                                Provedor:
                                <strong>
                                    Resend
                                </strong>
                            </p>

                        </body>

                        </html>
                        `

                });


            if (
                resultado.error
            ) {

                console.error(
                    "RESEND ERRO:",
                    resultado.error
                );

                return res
                    .status(500)
                    .json({

                        sucesso:
                            false,

                        erro:
                            resultado.error.message ||
                            "Erro ao enviar e-mail."

                    });

            }


            const messageId =
                resultado.data?.id ||
                null;


            console.log(
                "E-MAIL DE TESTE ENVIADO:",
                messageId
            );


            return res.json({

                sucesso:
                    true,

                messageId:
                    messageId,

                email:
                    email,

                provider:
                    "resend"

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
            "Consulta: /consultar-pagamento"
        );

        console.log(
            "Frontend:",
            FRONTEND_URL
        );

        console.log(
            "E-mail:",
            RESEND_API_KEY
                ? "Resend configurado"
                : "não configurado"
        );

        console.log(
            "======================================"
        );

    }

);