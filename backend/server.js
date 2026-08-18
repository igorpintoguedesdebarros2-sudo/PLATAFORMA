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
// ESCAPAR HTML
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
//
// Firestore:
//
// cursos_config
//     ├── 1001
//     ├── 1002
//     ├── 1003
//
// Exemplo:
//
// cursos_config/1001
//
// {
//     nome: "Python",
//     valor: 149.90,
//     senhaCurso: "PYTHON2026",
//     linkCurso: "...",
//     categoria: "EAD",
//     descricao: "...",
//     ativo: true
// }
//
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

    } catch (error) {

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

        } catch (error) {

            console.warn(
                "Erro buscando usuário:",
                error.message
            );
        }
    }


    return "";
}


// =====================================================
// ENVIAR E-MAIL DO CURSO
// =====================================================
//
// IMPORTANTE:
//
// O e-mail envia SOMENTE:
//
// - Nome do curso
// - Senha
//
// O link NÃO é enviado.
// O link fica disponível dentro da plataforma.
//
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
        pedidoAtual?.senhaEmailEnviado === true
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
    // BUSCAR CURSO PELO ID
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


    // =================================================
    // SENHA
    // =================================================

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


    // =================================================
    // HTML
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

        <hr>

        <p
            style="
                color:#777777;
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


    // =================================================
    // TEXTO
    // =================================================

    const texto = `

Seu pagamento foi confirmado.

Curso: ${curso.nome}

Senha: ${curso.senhaCurso}

Acesse o curso diretamente pela plataforma.

Pedido: ${pedidoId}

`;


    // =================================================
    // ENVIAR
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
    // REGISTRAR
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
// WEBHOOK STRIPE
// =====================================================
//
// ATENÇÃO:
//
// Esta rota precisa ficar ANTES de:
//
// app.use(express.json())
//
// =====================================================

app.post(

    "/webhook-stripe",

    express.raw({
        type:
            "application/json"
    }),

    async (
        req,
        res
    ) => {

        if (
            !STRIPE_WEBHOOK_SECRET
        ) {

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


        try {

            evento =
                stripe.webhooks.constructEvent(

                    req.body,

                    assinatura,

                    STRIPE_WEBHOOK_SECRET

                );

        } catch (error) {

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
                "WEBHOOK:",
                evento.type
            );

            console.log(
                "======================================"
            );


            // =================================================
            // PAGAMENTO CONCLUÍDO
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


                if (!pedidoId) {

                    console.error(
                        "Webhook sem pedidoId."
                    );

                    return res.json({
                        recebido:
                            true
                    });
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

                        // O link fica registrado,
                        // mas NÃO vai para o e-mail.
                        linkCurso:
                            curso.linkCurso,

                        pago:
                            pago,

                        paymentStatus:
                            session.payment_status,

                        cursoConcluido:
                            dadosAtuais.cursoConcluido === true,

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

                    } catch (
                        erroEmail
                    ) {

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


        } catch (error) {

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
// =====================================================

app.use(
    express.json()
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


        } catch (error) {

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
// USAR SENHA DO CURSO
// =====================================================
//
// O usuário informa:
//
// {
//     senha,
//     usuarioId
// }
//
// O backend procura os pedidos pagos daquele usuário
// e compara a senha com o curso correspondente.
//
// O LINK É DEVOLVIDO PARA A PLATAFORMA.
//
// =====================================================

app.post(
    "/usar-senha-curso",

    async (
        req,
        res
    ) => {

        try {

            const {
                senha,
                usuarioId
            } = req.body || {};


            const senhaInformada =
                String(
                    senha || ""
                ).trim();


            const usuarioIdInformado =
                String(
                    usuarioId || ""
                ).trim();


            if (!senhaInformada) {

                return res
                    .status(400)
                    .json({

                        valido:
                            false,

                        erro:
                            "Senha do curso não informada."

                    });
            }


            if (!usuarioIdInformado) {

                return res
                    .status(400)
                    .json({

                        valido:
                            false,

                        erro:
                            "usuarioId não informado."

                    });
            }


            // =================================================
            // BUSCAR PEDIDOS DO USUÁRIO
            // =================================================

            const pedidosSnapshot =
                await db
                    .collection(
                        "pedidos"
                    )
                    .where(
                        "usuarioId",
                        "==",
                        usuarioIdInformado
                    )
                    .get();


            if (
                pedidosSnapshot.empty
            ) {

                return res
                    .status(404)
                    .json({

                        valido:
                            false,

                        erro:
                            "Nenhum curso encontrado para este usuário."

                    });
            }


            let pedidoEncontrado =
                null;

            let pedidoIdEncontrado =
                null;

            let configuracaoCurso =
                null;


            // =================================================
            // PROCURAR SENHA
            // =================================================

            for (
                const documento
                of pedidosSnapshot.docs
            ) {

                const pedido =
                    documento.data() || {};


                if (
                    pedido.pago !== true
                ) {

                    continue;
                }


                if (
                    pedido.cursoConcluido === true
                ) {

                    continue;
                }


                const cursoId =
                    String(
                        pedido.cursoId ||
                        ""
                    ).trim();


                if (!cursoId) {

                    continue;
                }


                const curso =
                    await buscarCursoPorId(
                        cursoId
                    );


                if (!curso) {

                    continue;
                }


                if (
                    curso.ativo === false
                ) {

                    continue;
                }


                if (
                    !curso.senhaCurso
                ) {

                    continue;
                }


                if (
                    curso.senhaCurso !==
                    senhaInformada
                ) {

                    continue;
                }


                pedidoEncontrado =
                    pedido;

                pedidoIdEncontrado =
                    documento.id;

                configuracaoCurso =
                    curso;

                break;
            }


            // =================================================
            // SENHA INVÁLIDA
            // =================================================

            if (
                !pedidoEncontrado
            ) {

                return res
                    .status(401)
                    .json({

                        valido:
                            false,

                        erro:
                            "Senha inválida ou curso não adquirido."

                    });
            }


            // =================================================
            // DADOS
            // =================================================

            const curso =
                configuracaoCurso.nome;


            const cursoId =
                configuracaoCurso.id;


            const categoria =
                configuracaoCurso.categoria;


            const descricao =
                configuracaoCurso.descricao;


            const linkCurso =
                configuracaoCurso.linkCurso;


            // =================================================
            // REGISTRAR ACESSO
            // =================================================

            await db
                .collection(
                    "acessos_cursos"
                )
                .add({

                    pedidoId:
                        pedidoIdEncontrado,

                    usuarioId:
                        usuarioIdInformado,

                    cursoId:
                        cursoId,

                    curso:
                        curso,

                    categoria:
                        categoria,

                    autorizado:
                        true,

                    usadoEm:
                        FieldValue
                            .serverTimestamp()

                });


            // =================================================
            // ATUALIZAR PEDIDO
            // =================================================

            await db
                .collection(
                    "pedidos"
                )
                .doc(
                    pedidoIdEncontrado
                )
                .set(

                    {

                        ultimoAcessoEm:
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
            // RETORNO PARA A PLATAFORMA
            // =================================================

            return res.json({

                valido:
                    true,

                pedidoId:
                    pedidoIdEncontrado,

                usuarioId:
                    usuarioIdInformado,

                cursoId:
                    cursoId,

                curso:
                    curso,

                categoria:
                    categoria,

                descricao:
                    descricao,

                // LINK FICA AQUI,
                // NA PLATAFORMA
                linkCurso:
                    linkCurso,

                cursoConcluido:
                    false,

                usosIlimitados:
                    true,

                autorizadoEm:
                    new Date()
                        .toISOString()

            });


        } catch (error) {

            console.error(
                "Erro ao usar senha:",
                error
            );

            return res
                .status(500)
                .json({

                    valido:
                        false,

                    erro:
                        error.message ||
                        "Erro interno ao validar senha."

                });
        }
    }
);


// =====================================================
// CONCLUIR CURSO
// =====================================================

app.post(
    "/concluir-curso",

    async (
        req,
        res
    ) => {

        try {

            const {
                pedidoId,
                usuarioId
            } = req.body || {};


            if (!pedidoId) {

                return res
                    .status(400)
                    .json({

                        sucesso:
                            false,

                        erro:
                            "pedidoId não informado."

                    });
            }


            if (!usuarioId) {

                return res
                    .status(400)
                    .json({

                        sucesso:
                            false,

                        erro:
                            "usuarioId não informado."

                    });
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


            if (
                !pedidoSnapshot.exists
            ) {

                return res
                    .status(404)
                    .json({

                        sucesso:
                            false,

                        erro:
                            "Pedido não encontrado."

                    });
            }


            const pedido =
                pedidoSnapshot.data() || {};


            if (
                pedido.usuarioId !==
                usuarioId
            ) {

                return res
                    .status(403)
                    .json({

                        sucesso:
                            false,

                        erro:
                            "Este pedido pertence a outro usuário."

                    });
            }


            if (
                pedido.pago !== true
            ) {

                return res
                    .status(403)
                    .json({

                        sucesso:
                            false,

                        erro:
                            "O curso ainda não foi pago."

                    });
            }


            if (
                pedido.cursoConcluido === true
            ) {

                return res.json({

                    sucesso:
                        true,

                    cursoConcluido:
                        true,

                    mensagem:
                        "Este curso já estava concluído."

                });
            }


            // =================================================
            // PEDIDO
            // =================================================

            await pedidoRef.set(

                {

                    cursoConcluido:
                        true,

                    concluidoEm:
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
                .collection(
                    "pagamentos"
                )
                .doc(
                    pedidoId
                )
                .set(

                    {

                        cursoConcluido:
                            true,

                        concluidoEm:
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
            // HISTÓRICO
            // =================================================

            await db
                .collection(
                    "conclusoes_cursos"
                )
                .add({

                    pedidoId:
                        pedidoId,

                    usuarioId:
                        usuarioId,

                    cursoId:
                        pedido.cursoId ||
                        "",

                    curso:
                        pedido.curso ||
                        "",

                    concluido:
                        true,

                    concluidoEm:
                        FieldValue
                            .serverTimestamp()

                });


            return res.json({

                sucesso:
                    true,

                cursoConcluido:
                    true,

                pedidoId:
                    pedidoId,

                usuarioId:
                    usuarioId,

                mensagem:
                    "Curso concluído com sucesso."

            });


        } catch (error) {

            console.error(
                "Erro ao concluir curso:",
                error
            );

            return res
                .status(500)
                .json({

                    sucesso:
                        false,

                    erro:
                        error.message ||
                        "Erro ao concluir curso."

                });
        }
    }
);


// =====================================================
// CRIAR PAGAMENTO
// =====================================================
//
// AGORA O FRONTEND ENVIA:
//
// {
//     cursoId,
//     pedidoId,
//     usuarioId
// }
//
// Exemplo:
//
// cursoId = "1001"
//
// O preço vem do:
//
// cursos_config/1001
//
// =====================================================

app.post(
    "/criar-pagamento",

    async (
        req,
        res
    ) => {

        try {

            const {
                cursoId,
                pedidoId,
                usuarioId
            } = req.body || {};


            if (!cursoId) {

                return res
                    .status(400)
                    .json({

                        erro:
                            "ID do curso não informado."

                    });
            }


            if (!pedidoId) {

                return res
                    .status(400)
                    .json({

                        erro:
                            "pedidoId não informado."

                    });
            }


            if (!usuarioId) {

                return res
                    .status(400)
                    .json({

                        erro:
                            "usuarioId não informado."

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

                        erro:
                            "Curso não encontrado."

                    });
            }


            if (
                curso.ativo === false
            ) {

                return res
                    .status(400)
                    .json({

                        erro:
                            "Este curso não está disponível."

                    });
            }


            // =================================================
            // PREÇO
            // =================================================

            const valor =
                Number(
                    curso.valor
                );


            if (
                !Number.isFinite(valor) ||
                valor <= 0
            ) {

                return res
                    .status(400)
                    .json({

                        erro:
                            "Preço do curso não configurado corretamente."

                    });
            }


            const valorCentavos =
                Math.round(
                    valor * 100
                );


            // =================================================
            // E-MAIL
            // =================================================

            let emailUsuario =
                "";


            try {

                const usuario =
                    await firebaseAuth
                        .getUser(
                            usuarioId
                        );


                emailUsuario =
                    String(
                        usuario.email ||
                        ""
                    ).trim();

            } catch (error) {

                console.warn(
                    "Não foi possível obter e-mail:",
                    error.message
                );
            }


            // =================================================
            // CRIAR PEDIDO
            // =================================================

            await db
                .collection(
                    "pedidos"
                )
                .doc(
                    pedidoId
                )
                .set({

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

                    // O link fica no banco
                    // para ser mostrado na plataforma.
                    linkCurso:
                        curso.linkCurso,

                    pago:
                        false,

                    paymentStatus:
                        "pending",

                    cursoConcluido:
                        false,

                    senhaEmailEnviado:
                        false,

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

            const session =
                await stripe
                    .checkout
                    .sessions
                    .create({

                        mode:
                            "payment",

                        payment_method_types:
                            [
                                "card"
                            ],

                        line_items:
                            [

                                {

                                    price_data:
                                        {

                                            currency:
                                                "brl",

                                            product_data:
                                                {

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

                        client_reference_id:
                            usuarioId,

                        customer_email:
                            emailUsuario ||
                            undefined,

                        metadata:
                            {

                                pedidoId:
                                    pedidoId,

                                usuarioId:
                                    usuarioId,

                                cursoId:
                                    curso.id

                            },

                        success_url:
                            "https://igorpintoguedesdebarros2-sudo.github.io/PLATAFORMA/sucesso.html?session_id={CHECKOUT_SESSION_ID}",

                        cancel_url:
                            "https://igorpintoguedesdebarros2-sudo.github.io/PLATAFORMA/pagamento.html"

                    });


            // =================================================
            // SALVAR SESSION
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

                        sessionId:
                            session.id,

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

                url:
                    session.url

            });


        } catch (error) {

            console.error(
                "Erro /criar-pagamento:",
                error
            );

            return res
                .status(500)
                .json({

                    sucesso:
                        false,

                    erro:
                        error.message ||
                        "Erro ao criar pagamento."

                });
        }
    }
);


// =====================================================
// CONSULTAR PAGAMENTO
// =====================================================
//
// Esta rota é usada pela página sucesso.html.
//
// Se pago === true:
//
// o frontend recebe o link.
//
// O link NÃO é enviado por e-mail.
//
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

                        valido:
                            false,

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
                        sessionId
                    );


            const pago =
                session.payment_status ===
                "paid";


            const metadata =
                session.metadata || {};


            const usuarioId =
                metadata.usuarioId ||
                session.client_reference_id ||
                "";


            const pedidoId =
                metadata.pedidoId ||
                "";


            const cursoId =
                metadata.cursoId ||
                "";


            let curso =
                null;


            if (cursoId) {

                curso =
                    await buscarCursoPorId(
                        cursoId
                    );
            }


            let pedido =
                null;


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

                    pedido =
                        pedidoSnapshot.data() ||
                        {};

                }
            }


            const cursoIdFinal =
                curso?.id ||
                pedido?.cursoId ||
                cursoId ||
                "";


            const nomeCurso =
                curso?.nome ||
                pedido?.curso ||
                "";


            const categoria =
                curso?.categoria ||
                pedido?.categoria ||
                "EAD";


            const descricao =
                curso?.descricao ||
                pedido?.descricao ||
                "Curso adquirido na plataforma.";


            const valor =
                curso?.valor ||
                Number(
                    pedido?.valor
                ) ||
                0;


            // =================================================
            // LINK
            // =================================================
            //
            // SOMENTE DEVOLVE SE O PAGAMENTO ESTIVER PAGO.
            //
            const linkCurso =
                pago
                    ? (
                        curso?.linkCurso ||
                        pedido?.linkCurso ||
                        ""
                    )
                    : "";


            const cursoConcluido =
                pedido?.cursoConcluido === true;


            // =================================================
            // ATUALIZAR PAGAMENTO
            // =================================================

            if (pedidoId) {

                await db
                    .collection(
                        "pagamentos"
                    )
                    .doc(
                        pedidoId
                    )
                    .set(

                        {

                            sessionId:
                                session.id,

                            pedidoId:
                                pedidoId,

                            usuarioId:
                                usuarioId,

                            cursoId:
                                cursoIdFinal,

                            curso:
                                nomeCurso,

                            categoria:
                                categoria,

                            valor:
                                valor,

                            pago:
                                pago,

                            cursoConcluido:
                                cursoConcluido,

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
            }


            return res.json({

                valido:
                    true,

                pago:
                    pago,

                sessionId:
                    session.id,

                pedidoId:
                    pedidoId,

                usuarioId:
                    usuarioId,

                cursoId:
                    cursoIdFinal,

                curso:
                    nomeCurso,

                categoria:
                    categoria,

                descricao:
                    descricao,

                cursoConcluido:
                    cursoConcluido,

                // LINK DISPONÍVEL
                // SOMENTE NA PLATAFORMA
                linkCurso:
                    linkCurso,

                valor:
                    valor,

                paymentStatus:
                    session.payment_status

            });


        } catch (error) {

            console.error(
                "Erro /consultar-pagamento:",
                error
            );


            if (
                error?.type ===
                    "StripeInvalidRequestError" ||
                error?.code ===
                    "resource_missing" ||
                error?.statusCode ===
                    404
            ) {

                return res
                    .status(404)
                    .json({

                        valido:
                            false,

                        pago:
                            false,

                        erro:
                            "Sessão Stripe não encontrada."

                    });
            }


            return res
                .status(500)
                .json({

                    valido:
                        false,

                    pago:
                        false,

                    erro:
                        error.message ||
                        "Erro interno."

                });
        }
    }
);


// =====================================================
// AGENDAR CURSO PRESENCIAL
// =====================================================

app.post(
    "/agendar-curso",

    async (
        req,
        res
    ) => {

        try {

            const {
                pedidoId,
                usuarioId,
                data,
                horario
            } = req.body || {};


            if (!pedidoId) {

                return res
                    .status(400)
                    .json({

                        sucesso:
                            false,

                        erro:
                            "pedidoId não informado."

                    });
            }


            if (!usuarioId) {

                return res
                    .status(400)
                    .json({

                        sucesso:
                            false,

                        erro:
                            "usuarioId não informado."

                    });
            }


            if (!data) {

                return res
                    .status(400)
                    .json({

                        sucesso:
                            false,

                        erro:
                            "Data não informada."

                    });
            }


            if (!horario) {

                return res
                    .status(400)
                    .json({

                        sucesso:
                            false,

                        erro:
                            "Horário não informado."

                    });
            }


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
                !pedidoSnapshot.exists
            ) {

                return res
                    .status(404)
                    .json({

                        sucesso:
                            false,

                        erro:
                            "Pedido não encontrado."

                    });
            }


            const pedido =
                pedidoSnapshot.data() ||
                {};


            if (
                pedido.usuarioId !==
                usuarioId
            ) {

                return res
                    .status(403)
                    .json({

                        sucesso:
                            false,

                        erro:
                            "Este pedido pertence a outro usuário."

                    });
            }


            if (
                pedido.pago !== true
            ) {

                return res
                    .status(400)
                    .json({

                        sucesso:
                            false,

                        erro:
                            "O curso ainda não foi pago."

                    });
            }


            if (
                String(
                    pedido.categoria ||
                    ""
                ).toLowerCase() !==
                "presencial"
            ) {

                return res
                    .status(400)
                    .json({

                        sucesso:
                            false,

                        erro:
                            "Este curso não é presencial."

                    });
            }


            // =================================================
            // VERIFICAR AGENDAMENTO EXISTENTE
            // =================================================

            const existente =
                await db
                    .collection(
                        "agendamentos"
                    )
                    .where(
                        "pedidoId",
                        "==",
                        pedidoId
                    )
                    .limit(
                        1
                    )
                    .get();


            if (
                !existente.empty
            ) {

                return res
                    .status(409)
                    .json({

                        sucesso:
                            false,

                        erro:
                            "Este curso já possui um agendamento."

                    });
            }


            // =================================================
            // CRIAR
            // =================================================

            const agendamento = {

                pedidoId:
                    pedidoId,

                usuarioId:
                    usuarioId,

                cursoId:
                    pedido.cursoId ||
                    "",

                curso:
                    pedido.curso ||
                    "",

                data:
                    data,

                horario:
                    horario,

                status:
                    "agendado",

                criadoEm:
                    FieldValue
                        .serverTimestamp()

            };


            const referencia =
                await db
                    .collection(
                        "agendamentos"
                    )
                    .add(
                        agendamento
                    );


            // =================================================
            // ATUALIZAR PEDIDO
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

                        agendamento: {

                            agendamentoId:
                                referencia.id,

                            data:
                                data,

                            horario:
                                horario,

                            status:
                                "agendado"

                        },

                        atualizadoEm:
                            FieldValue
                                .serverTimestamp()

                    },

                    {
                        merge:
                            true
                    }

                );


            return res.json({

                sucesso:
                    true,

                agendamentoId:
                    referencia.id,

                mensagem:
                    "Curso agendado com sucesso."

            });


        } catch (error) {

            console.error(
                "Erro ao agendar:",
                error
            );

            return res
                .status(500)
                .json({

                    sucesso:
                        false,

                    erro:
                        error.message ||
                        "Erro ao salvar agendamento."

                });
        }
    }
);


// =====================================================
// 404
// =====================================================

app.use(
    (
        req,
        res
    ) => {

        console.warn(
            "Rota não encontrada:",
            req.method,
            req.originalUrl
        );


        res
            .status(404)
            .json({

                ok:
                    false,

                erro:
                    "Rota não encontrada."

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
            "Erro não tratado:",
            error
        );


        if (
            res.headersSent
        ) {

            return next(
                error
            );
        }


        res
            .status(500)
            .json({

                ok:
                    false,

                erro:
                    "Erro interno do servidor."

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
            "PLATAFORMA BACKEND"
        );

        console.log(
            "======================================"
        );

        console.log(
            `Porta: ${PORT}`
        );

        console.log(
            "Express: OK"
        );

        console.log(
            "Stripe: OK"
        );

        console.log(
            "Firebase Admin: OK"
        );

        console.log(
            "Firestore: OK"
        );

        console.log(
            "E-mail:",
            emailTransporter
                ? "OK"
                : "NÃO CONFIGURADO"
        );

        console.log(
            "Sistema: CURSOS POR ID"
        );

        console.log(
            "Senha: ILIMITADA"
        );

        console.log(
            "Link: SOMENTE NA PLATAFORMA"
        );

        console.log(
            "E-mail: NOME + SENHA"
        );

        console.log(
            "Webhook Stripe: ATIVO"
        );

        console.log(
            "Rota /criar-pagamento: OK"
        );

        console.log(
            "Rota /consultar-pagamento: OK"
        );

        console.log(
            "Rota /usar-senha-curso: OK"
        );

        console.log(
            "Rota /concluir-curso: OK"
        );

        console.log(
            "Rota /agendar-curso: OK"
        );

        console.log(
            "Servidor online."
        );

        console.log(
            "======================================"
        );
    }
);