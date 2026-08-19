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
    Number(process.env.PORT) || 10000;


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

const RESEND_API_KEY =
    process.env.RESEND_API_KEY;

const FRONTEND_URL =
    process.env.FRONTEND_URL ||
    "https://igorpintoguedesdebarros2-sudo.github.io/PLATAFORMA";


// IMPORTANTE:
// coloque aqui o e-mail do domínio VERIFICADO no Resend.
//
// Exemplo:
// Plataforma <noreply@seudominio.com>
//
// NÃO use:
// onboarding@resend.dev
//
// se quiser enviar para clientes reais.
const EMAIL_FROM =
    process.env.EMAIL_FROM ||
    "Plataforma <noreply@ipgbtech.com>";


// =====================================================
// VALIDAÇÃO
// =====================================================

const variaveisObrigatorias = {

    STRIPE_SECRET_KEY,

    FIREBASE_PROJECT_ID,

    FIREBASE_CLIENT_EMAIL,

    FIREBASE_PRIVATE_KEY,

    RESEND_API_KEY

};


for (
    const [nome, valor]
    of Object.entries(variaveisObrigatorias)
) {

    if (!valor) {

        console.error(
            `ERRO: ${nome} não configurada.`
        );

        process.exit(1);
    }
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


// =====================================================
// FIREBASE ADMIN
// =====================================================

let firebaseApp;

const apps =
    getApps();


if (apps.length > 0) {

    firebaseApp =
        apps[0];

}
else {

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
// IMPORTANTE:
//
// Esta rota PRECISA ficar ANTES de:
//
// app.use(express.json());
//
// porque o Stripe precisa do corpo RAW.
// =====================================================

app.post(

    "/webhook-stripe",

    express.raw({
        type: "application/json"
    }),

    async (req, res) => {

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
                "Stripe-Signature ausente."
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


        // =================================================
        // PROCESSAR EVENTO
        // =================================================

        try {

            console.log(
                "======================================"
            );

            console.log(
                "WEBHOOK:",
                evento.type
            );

            console.log(
                "======================================"
            );


            // =================================================
            // CHECKOUT CONCLUÍDO
            //
            // Cartão normalmente chega aqui já pago.
            //
            // Pix/Boleto podem chegar aqui ainda pendentes.
            // =================================================

            if (
                evento.type ===
                "checkout.session.completed"
            ) {

                await processarCheckout(
                    evento.data.object
                );

            }


            // =================================================
            // PIX / BOLETO PAGOS
            //
            // ESTE É O EVENTO IMPORTANTE PARA PAGAMENTOS
            // ASSÍNCRONOS.
            // =================================================

            else if (
                evento.type ===
                "checkout.session.async_payment_succeeded"
            ) {

                await processarPagamentoConfirmado(
                    evento.data.object
                );

            }


            // =================================================
            // PIX / BOLETO FALHARAM
            // =================================================

            else if (
                evento.type ===
                "checkout.session.async_payment_failed"
            ) {

                await processarPagamentoFalhou(
                    evento.data.object
                );

            }


            // =================================================
            // CHECKOUT EXPIRADO
            // =================================================

            else if (
                evento.type ===
                "checkout.session.expired"
            ) {

                const session =
                    evento.data.object;


                const metadata =
                    session.metadata || {};


                const pedidoId =
                    String(
                        metadata.pedidoId || ""
                    ).trim();


                if (pedidoId) {

                    await db
                        .collection("pedidos")
                        .doc(pedidoId)
                        .set({

                            pago:
                                false,

                            paymentStatus:
                                "expired",

                            atualizadoEm:
                                FieldValue
                                    .serverTimestamp()

                        }, {

                            merge:
                                true

                        });

                }

            }


            // =================================================
            // PAYMENT INTENT
            //
            // Apenas log.
            //
            // NÃO usamos este evento para liberar o curso,
            // porque o Checkout é a fonte principal neste fluxo.
            // =================================================

            else if (
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
                "======================================"
            );

            console.error(
                "ERRO PROCESSANDO WEBHOOK"
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
//
// SOMENTE DEPOIS DO WEBHOOK
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
// BUSCAR CURSO
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
                dados["descrição"] ||
                "Curso adquirido na plataforma."
            ).trim(),

        categoria:
            String(
                dados.categoria ||
                "EAD"
            ).trim(),

        linkCurso:
            String(
                dados.linkCurso ||
                ""
            ).trim(),

        senhaCurso:
            String(
                dados.senhaCurso ||
                ""
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
// VERIFICAR SE USUÁRIO POSSUI CURSO PAGO
// =====================================================

async function usuarioPossuiCursoPago(
    usuarioId,
    cursoId
) {

    if (
        !usuarioId ||
        !cursoId
    ) {

        return false;

    }


    const pedidos =
        await db
            .collection("pedidos")
            .where(
                "usuarioId",
                "==",
                usuarioId
            )
            .where(
                "cursoId",
                "==",
                cursoId
            )
            .get();


    for (
        const documento
        of pedidos.docs
    ) {

        const pedido =
            documento.data() || {};


        if (
            pedido.pago === true
        ) {

            return true;

        }

    }


    const pagamentos =
        await db
            .collection("pagamentos")
            .where(
                "usuarioId",
                "==",
                usuarioId
            )
            .where(
                "cursoId",
                "==",
                cursoId
            )
            .get();


    for (
        const documento
        of pagamentos.docs
    ) {

        const pagamento =
            documento.data() || {};


        if (
            pagamento.pago === true
        ) {

            return true;

        }

    }


    return false;

}


// =====================================================
// PROCESSAR CHECKOUT
// =====================================================

async function processarCheckout(
    session
) {

    const metadata =
        session.metadata || {};


    const pedidoId =
        String(
            metadata.pedidoId || ""
        ).trim();


    const usuarioId =
        String(
            metadata.usuarioId ||
            session.client_reference_id ||
            ""
        ).trim();


    const cursoId =
        String(
            metadata.cursoId ||
            ""
        ).trim();


    const emailStripe =
        session.customer_details?.email ||
        session.customer_email ||
        "";


    if (!pedidoId) {

        throw new Error(
            "Webhook sem pedidoId."
        );

    }


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


    const emailUsuario =
        await buscarEmailUsuario({

            usuarioId,

            emailStripe,

            emailPedido:
                pedidoAtual.email

        });


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
            `Curso "${cursoIdFinal}" não encontrado.`
        );

    }


    const pago =
        session.payment_status ===
        "paid";


    // =================================================
    // SALVAR PEDIDO
    // =================================================

    await pedidoRef.set({

        pedidoId,

        sessionId:
            session.id,

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

        paymentMethodTypes:
            session.payment_method_types || [],

        paymentStatus:
            session.payment_status,

        pago,

        atualizadoEm:
            FieldValue
                .serverTimestamp()

    }, {

        merge:
            true

    });


    // =================================================
    // SALVAR PAGAMENTO
    // =================================================

    await db
        .collection("pagamentos")
        .doc(pedidoId)
        .set({

            pedidoId,

            sessionId:
                session.id,

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

            paymentMethodTypes:
                session.payment_method_types || [],

            paymentStatus:
                session.payment_status,

            pago,

            atualizadoEm:
                FieldValue
                    .serverTimestamp()

        }, {

            merge:
                true

        });


    console.log(
        "CHECKOUT REGISTRADO:",
        {
            pedidoId,
            pagamentoConfirmado: pago,
            metodos:
                session.payment_method_types
        }
    );


    // =================================================
    // SE JÁ ESTIVER PAGO
    // =================================================

    if (pago) {

        await processarPagamentoConfirmado(
            session
        );

    }

}


// =====================================================
// PROCESSAR PAGAMENTO CONFIRMADO
//
// Usado para:
//
// CARD
// PIX
// BOLETO
//
// =====================================================

async function processarPagamentoConfirmado(
    session
) {

    const metadata =
        session.metadata || {};


    const pedidoId =
        String(
            metadata.pedidoId || ""
        ).trim();


    const usuarioId =
        String(
            metadata.usuarioId ||
            session.client_reference_id ||
            ""
        ).trim();


    const cursoId =
        String(
            metadata.cursoId ||
            ""
        ).trim();


    if (!pedidoId) {

        throw new Error(
            "Pagamento confirmado sem pedidoId."
        );

    }


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
    // EVITAR PROCESSAR NOVAMENTE
    // =================================================

    if (
        pedidoAtual.pago === true &&
        pedidoAtual.senhaEmailEnviado === true
    ) {

        console.log(
            "Pagamento já processado:",
            pedidoId
        );

        return;

    }


    const emailStripe =
        session.customer_details?.email ||
        session.customer_email ||
        "";


    const emailUsuario =
        await buscarEmailUsuario({

            usuarioId,

            emailStripe,

            emailPedido:
                pedidoAtual.email

        });


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
            `Curso "${cursoIdFinal}" não encontrado.`
        );

    }


    // =================================================
    // MARCAR COMO PAGO
    // =================================================

    await pedidoRef.set({

        pedidoId,

        sessionId:
            session.id,

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
            "paid",

        paymentMethodTypes:
            session.payment_method_types ||
            pedidoAtual.paymentMethodTypes ||
            [],

        pagoEm:
            FieldValue
                .serverTimestamp(),

        atualizadoEm:
            FieldValue
                .serverTimestamp()

    }, {

        merge:
            true

    });


    // =================================================
    // PAGAMENTOS
    // =================================================

    await db
        .collection("pagamentos")
        .doc(pedidoId)
        .set({

            pedidoId,

            sessionId:
                session.id,

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
                "paid",

            paymentMethodTypes:
                session.payment_method_types ||
                pedidoAtual.paymentMethodTypes ||
                [],

            pagoEm:
                FieldValue
                    .serverTimestamp(),

            atualizadoEm:
                FieldValue
                    .serverTimestamp()

        }, {

            merge:
                true

        });


    console.log(
        "PAGAMENTO CONFIRMADO:",
        {
            pedidoId,
            usuarioId,
            curso: curso.nome,
            metodos:
                session.payment_method_types
        }
    );


    // =================================================
    // ENVIAR SENHA
    // =================================================

    if (emailUsuario) {

        try {

            await enviarSenhaCursoPorEmail({

                pedidoId,

                usuarioId,

                email:
                    emailUsuario,

                cursoId:
                    curso.id

            });

        }
        catch (erroEmail) {

            console.error(
                "ERRO AO ENVIAR E-MAIL:",
                erroEmail
            );


            await pedidoRef.set({

                emailErro:
                    erroEmail.message,

                emailErroEm:
                    FieldValue
                        .serverTimestamp(),

                email:
                    emailUsuario

            }, {

                merge:
                    true

            });

        }

    }
    else {

        console.warn(
            "Pagamento confirmado, mas usuário não possui e-mail."
        );

    }

}


// =====================================================
// PAGAMENTO ASSÍNCRONO FALHOU
// =====================================================

async function processarPagamentoFalhou(
    session
) {

    const metadata =
        session.metadata || {};


    const pedidoId =
        String(
            metadata.pedidoId || ""
        ).trim();


    if (!pedidoId) {
        return;
    }


    await db
        .collection("pedidos")
        .doc(pedidoId)
        .set({

            pago:
                false,

            paymentStatus:
                "failed",

            atualizadoEm:
                FieldValue
                    .serverTimestamp()

        }, {

            merge:
                true

        });


    console.log(
        "PAGAMENTO FALHOU:",
        pedidoId
    );

}


// =====================================================
// ENVIAR SENHA POR E-MAIL
// =====================================================

async function enviarSenhaCursoPorEmail({

    pedidoId,
    usuarioId,
    email,
    cursoId

}) {

    if (!email) {

        throw new Error(
            "E-mail do usuário não encontrado."
        );

    }


    const pedidoRef =
        db
            .collection("pedidos")
            .doc(pedidoId);


    const pedidoSnapshot =
        await pedidoRef.get();


    const pedido =
        pedidoSnapshot.exists
            ? pedidoSnapshot.data() || {}
            : {};


    // =================================================
    // EVITAR DUPLICAÇÃO
    // =================================================

    if (
        pedido.senhaEmailEnviado === true
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
            `Curso "${cursoId}" não encontrado.`
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
Acesse o curso pela sua área de cursos
dentro da plataforma.
</p>

<hr>

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

Acesse o curso pela sua área de cursos dentro da plataforma.

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

        throw new Error(
            resultado.error.message ||
            "Erro ao enviar e-mail."
        );

    }


    const messageId =
        resultado.data?.id ||
        "";


    await pedidoRef.set({

        senhaEmailEnviado:
            true,

        senhaEmailEnviadoEm:
            FieldValue
                .serverTimestamp(),

        email,

        emailMessageId:
            messageId,

        emailProvider:
            "resend",

        atualizadoEm:
            FieldValue
                .serverTimestamp()

    }, {

        merge:
            true

    });


    console.log(
        "E-MAIL ENVIADO:",
        messageId
    );


    return {

        enviado:
            true,

        jaEnviado:
            false,

        messageId

    };

}

// =====================================================
// CRIAR PAGAMENTO
//
// MÉTODOS:
//
// CARD
// PIX
// BOLETO
//
// =====================================================

app.post(

    "/criar-pagamento",

    async (req, res) => {

        try {

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
            // VALIDAR
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
                            `Curso "${cursoId}" não encontrado.`

                    });

            }


            if (!curso.ativo) {

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
                !Number.isFinite(
                    curso.valor
                ) ||
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
            // E-MAIL
            // =================================================

            let emailFinal =
                email;


            if (!emailFinal) {

                emailFinal =
                    await buscarEmailUsuario({

                        usuarioId,

                        emailStripe:
                            "",

                        emailPedido:
                            ""

                    });

            }


            // =================================================
            // CRIAR PEDIDO
            // =================================================

            const pedidoRef =
                db
                    .collection("pedidos")
                    .doc();


            const pedidoId =
                pedidoRef.id;


            await pedidoRef.set({

                pedidoId,

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

                paymentMethods:

                    [
                        "card",
                        "pix",
                        "boleto"
                    ],

                criadoEm:
                    FieldValue
                        .serverTimestamp(),

                atualizadoEm:
                    FieldValue
                        .serverTimestamp()

            });


            // =================================================
            // URL DE SUCESSO
            // =================================================

            const successUrl =
                `${FRONTEND_URL}/sucesso.html?session_id={CHECKOUT_SESSION_ID}&pedidoId=${encodeURIComponent(pedidoId)}`;


            // =================================================
            // URL DE CANCELAMENTO
            // =================================================

            const cancelUrl =
                `${FRONTEND_URL}/pagamento.html?cancelado=true&pedidoId=${encodeURIComponent(pedidoId)}`;


            // =================================================
            // STRIPE CHECKOUT
            //
            // CARD
            // PIX
            // BOLETO
            // =================================================

            const session =
                await stripe.checkout.sessions.create({

                    mode:
                        "payment",


                    // -------------------------------------------------
                    // MÉTODOS DE PAGAMENTO
                    // -------------------------------------------------

                    payment_method_types: [

                        "card",

                        "pix",

                        "boleto"

                    ],


                    // -------------------------------------------------
                    // E-MAIL
                    // -------------------------------------------------

                    ...(emailFinal
                        ? {

                            customer_email:
                                emailFinal

                        }
                        : {}),


                    // -------------------------------------------------
                    // ENDEREÇO
                    //
                    // Ajuda no fluxo de boleto.
                    // -------------------------------------------------

                    billing_address_collection:
                        "required",


                    // -------------------------------------------------
                    // REFERÊNCIA DO USUÁRIO
                    // -------------------------------------------------

                    client_reference_id:
                        usuarioId,


                    // -------------------------------------------------
                    // METADATA
                    // -------------------------------------------------

                    metadata: {

                        pedidoId,

                        usuarioId,

                        cursoId:
                            curso.id

                    },


                    // -------------------------------------------------
                    // PRODUTO
                    // -------------------------------------------------

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


                    // -------------------------------------------------
                    // URLs
                    // -------------------------------------------------

                    success_url:
                        successUrl,

                    cancel_url:
                        cancelUrl

                });


            // =================================================
            // VALIDAR URL
            // =================================================

            if (!session.url) {

                throw new Error(
                    "Stripe não retornou a URL."
                );

            }


            // =================================================
            // SALVAR SESSION
            // =================================================

            await pedidoRef.set({

                sessionId:
                    session.id,

                checkoutUrl:
                    session.url,

                paymentMethodTypes:
                    session.payment_method_types ||
                    [
                        "card",
                        "pix",
                        "boleto"
                    ],

                paymentStatus:
                    "open",

                atualizadoEm:
                    FieldValue
                        .serverTimestamp()

            }, {

                merge:
                    true

            });


            // =================================================
            // RESPOSTA
            // =================================================

            return res.json({

                sucesso:
                    true,

                sessionId:
                    session.id,

                url:
                    session.url,

                checkoutUrl:
                    session.url,

                pedidoId,

                cursoId:
                    curso.id,

                curso:
                    curso.nome,

                valor:
                    curso.valor,

                paymentMethods:

                    [
                        "card",
                        "pix",
                        "boleto"
                    ]

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

                        sucesso:
                            false,

                        erro:
                            "session_id não informado."

                    });

            }


            // =================================================
            // BUSCAR SESSION
            // =================================================

            const session =
                await stripe.checkout.sessions.retrieve(
                    sessionId
                );


            const metadata =
                session.metadata || {};


            const pedidoId =
                String(
                    metadata.pedidoId ||
                    ""
                ).trim();


            const usuarioId =
                String(
                    metadata.usuarioId ||
                    session.client_reference_id ||
                    ""
                ).trim();


            const cursoId =
                String(
                    metadata.cursoId ||
                    ""
                ).trim();


            const pago =
                session.payment_status ===
                "paid";


            const emailStripe =
                session.customer_details?.email ||
                session.customer_email ||
                "";


            // =================================================
            // PEDIDO
            // =================================================

            let dadosPedido = {};


            if (pedidoId) {

                const snapshot =
                    await db
                        .collection("pedidos")
                        .doc(pedidoId)
                        .get();


                if (snapshot.exists) {

                    dadosPedido =
                        snapshot.data() || {};

                }

            }


            // =================================================
            // CURSO
            // =================================================

            const cursoIdFinal =
                cursoId ||
                dadosPedido.cursoId ||
                "";


            const curso =
                cursoIdFinal
                    ? await buscarCursoPorId(
                        cursoIdFinal
                    )
                    : null;


            // =================================================
            // SE ESTIVER PAGO
            //
            // GARANTIR PROCESSAMENTO
            // =================================================

            if (
                pago &&
                pedidoId &&
                curso
            ) {

                await processarPagamentoConfirmado(
                    session
                );


                dadosPedido = {

                    ...dadosPedido,

                    pedidoId,

                    sessionId:
                        session.id,

                    usuarioId,

                    email:
                        emailStripe ||
                        dadosPedido.email ||
                        "",

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
                        "paid"

                };

            }


            // =================================================
            // RESPOSTA
            // =================================================

            return res.json({

                sucesso:
                    true,

                pago,

                paymentStatus:
                    session.payment_status,

                sessionId:
                    session.id,

                pedidoId,

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
                    "",

                paymentMethods:
                    session.payment_method_types ||
                    dadosPedido.paymentMethodTypes ||
                    []

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
// TESTAR RESEND
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


            const resultado =
                await resend.emails.send({

                    from:
                        EMAIL_FROM,

                    to:
                        [email],

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
                            O sistema de e-mail está funcionando.
                        </p>

                        <p>
                            Provedor:
                            <strong>
                                Resend
                            </strong>
                        </p>
                        `

                });


            if (
                resultado.error
            ) {

                return res
                    .status(500)
                    .json({

                        sucesso:
                            false,

                        erro:
                            resultado.error.message

                    });

            }


            return res.json({

                sucesso:
                    true,

                messageId:
                    resultado.data?.id ||
                    null,

                email,

                provider:
                    "resend"

            });

        }
        catch (error) {

            console.error(
                "ERRO TESTE RESEND:",
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
// USAR SENHA DO CURSO
//
// ATENÇÃO:
//
// ESTA É A ÚNICA ROTA /usar-senha-curso.
//
// Removemos a segunda rota duplicada que existia
// no seu server.js.
// =====================================================

app.post(

    "/usar-senha-curso",

    async (req, res) => {

        try {

            const senha =
                String(
                    req.body?.senha ||
                    req.body?.senhaCurso ||
                    ""
                ).trim();


            const usuarioId =
                String(
                    req.body?.usuarioId ||
                    ""
                ).trim();


            const cursoNome =
                String(
                    req.body?.curso ||
                    req.body?.cursoId ||
                    ""
                ).trim();


            // =================================================
            // VALIDAR
            // =================================================

            if (!senha) {

                return res
                    .status(400)
                    .json({

                        valido:
                            false,

                        autorizado:
                            false,

                        sucesso:
                            false,

                        erro:
                            "Senha não informada."

                    });

            }


            if (!usuarioId) {

                return res
                    .status(401)
                    .json({

                        valido:
                            false,

                        autorizado:
                            false,

                        sucesso:
                            false,

                        erro:
                            "Usuário não informado."

                    });

            }


            if (!cursoNome) {

                return res
                    .status(400)
                    .json({

                        valido:
                            false,

                        autorizado:
                            false,

                        sucesso:
                            false,

                        erro:
                            "Curso não informado."

                    });

            }


            // =================================================
            // VALIDAR USUÁRIO
            // =================================================

            try {

                await firebaseAuth.getUser(
                    usuarioId
                );

            }
            catch (error) {

                return res
                    .status(401)
                    .json({

                        valido:
                            false,

                        autorizado:
                            false,

                        sucesso:
                            false,

                        erro:
                            "Usuário inválido."

                    });

            }


            // =================================================
            // BUSCAR CURSO
            // =================================================

            let curso =
                await buscarCursoPorId(
                    cursoNome
                );


            // =================================================
            // CASO O NOME SEJA DIFERENTE DO ID
            // =================================================

            if (!curso) {

                const cursoSnapshot =
                    await db
                        .collection("cursos_config")
                        .where(
                            "nome",
                            "==",
                            cursoNome
                        )
                        .limit(1)
                        .get();


                if (
                    !cursoSnapshot.empty
                ) {

                    const documento =
                        cursoSnapshot.docs[0];


                    const dados =
                        documento.data() || {};


                    curso = {

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

                        categoria:
                            String(
                                dados.categoria ||
                                "EAD"
                            ).trim(),

                        linkCurso:
                            String(
                                dados.linkCurso ||
                                ""
                            ).trim(),

                        senhaCurso:
                            String(
                                dados.senhaCurso ||
                                ""
                            ).trim()

                    };

                }

            }


            if (!curso) {

                return res
                    .status(404)
                    .json({

                        valido:
                            false,

                        autorizado:
                            false,

                        sucesso:
                            false,

                        erro:
                            `Curso "${cursoNome}" não encontrado.`

                    });

            }


            // =================================================
            // SENHA
            // =================================================

            if (!curso.senhaCurso) {

                return res
                    .status(500)
                    .json({

                        valido:
                            false,

                        autorizado:
                            false,

                        sucesso:
                            false,

                        erro:
                            "Este curso não possui uma senha configurada."

                    });

            }


            // =================================================
            // BUSCAR PEDIDOS PAGOS
            // =================================================

            const pedidosSnapshot =
                await db
                    .collection("pedidos")
                    .where(
                        "usuarioId",
                        "==",
                        usuarioId
                    )
                    .where(
                        "pago",
                        "==",
                        true
                    )
                    .get();


            if (
                pedidosSnapshot.empty
            ) {

                return res
                    .status(403)
                    .json({

                        valido:
                            false,

                        autorizado:
                            false,

                        sucesso:
                            false,

                        erro:
                            "Você não possui um pagamento confirmado para este curso."

                    });

            }


            // =================================================
            // LOCALIZAR PEDIDO
            // =================================================

            let pedidoEncontrado =
                null;


            for (
                const documento
                of pedidosSnapshot.docs
            ) {

                const pedido =
                    documento.data() || {};


                const pedidoCursoId =
                    String(
                        pedido.cursoId ||
                        ""
                    ).trim();


                const pedidoCurso =
                    String(
                        pedido.curso ||
                        ""
                    ).trim();


                if (

                    pedidoCursoId ===
                    curso.id

                    ||

                    pedidoCurso.toUpperCase() ===
                    curso.nome.toUpperCase()

                ) {

                    pedidoEncontrado = {

                        id:
                            documento.id,

                        ...pedido

                    };


                    break;

                }

            }


            // =================================================
            // NÃO COMPROU
            // =================================================

            if (
                !pedidoEncontrado
            ) {

                return res
                    .status(403)
                    .json({

                        valido:
                            false,

                        autorizado:
                            false,

                        sucesso:
                            false,

                        erro:
                            "Você ainda não possui acesso a este curso."

                    });

            }


            // =================================================
            // VALIDAR SENHA
            // =================================================

            if (
                senha !==
                curso.senhaCurso
            ) {

                return res
                    .status(403)
                    .json({

                        valido:
                            false,

                        autorizado:
                            false,

                        sucesso:
                            false,

                        erro:
                            "Senha inválida."

                    });

            }


            // =================================================
            // ACESSO AUTORIZADO
            // =================================================

            const resposta = {

                valido:
                    true,

                autorizado:
                    true,

                sucesso:
                    true,

                pedidoId:
                    pedidoEncontrado.id,

                usuarioId:
                    usuarioId,

                curso:
                    curso.nome,

                cursoId:
                    curso.id,

                categoria:
                    curso.categoria,

                descricao:
                    curso.descricao,

                linkCurso:
                    curso.linkCurso,

                usosRestantes:
                    Number(
                        pedidoEncontrado.usosRestantes
                    ) || 1,

                autorizadoEm:
                    new Date().toISOString()

            };


            console.log(
                "======================================"
            );

            console.log(
                "ACESSO AO CURSO AUTORIZADO"
            );

            console.log(
                "Usuário:",
                usuarioId
            );

            console.log(
                "Curso:",
                curso.nome
            );

            console.log(
                "Pedido:",
                pedidoEncontrado.id
            );

            console.log(
                "======================================"
            );


            return res.json(
                resposta
            );

        }
        catch (error) {

            console.error(
                "ERRO AO USAR SENHA:",
                error
            );


            return res
                .status(500)
                .json({

                    valido:
                        false,

                    autorizado:
                        false,

                    sucesso:
                        false,

                    erro:
                        error.message ||
                        "Erro interno ao validar a senha."

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

            webhook:
                STRIPE_WEBHOOK_SECRET
                    ? "configurado"
                    : "não configurado",

            email:
                RESEND_API_KEY
                    ? "Resend configurado"
                    : "não configurado",

            emailProvider:
                "Resend",

            paymentMethods:

                [
                    "card",
                    "pix",
                    "boleto"
                ],

            pagamento:
                "Stripe Checkout",

            consultaPagamento:
                "/consultar-pagamento",

            criarPagamento:
                "/criar-pagamento",

            usarSenhaCurso:
                "/usar-senha-curso",

            cursos:
                "Firestore /cursos_config"

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
// 404
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
            "Stripe Checkout: OK"
        );

        console.log(
            "Métodos: CARD + PIX + BOLETO"
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
            "Usar senha: /usar-senha-curso"
        );

        console.log(
            "Cursos: Firestore /cursos_config"
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
            "E-mail FROM:",
            EMAIL_FROM
        );

        console.log(
            "======================================"
        );

    }
);