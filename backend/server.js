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
// E-MAIL
// =====================================================

const SMTP_HOST =
    process.env.SMTP_HOST;

const SMTP_PORT =
    Number(
        process.env.SMTP_PORT || 587
    );

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
// TRANSPORTADOR DE E-MAIL
// =====================================================

let emailTransporter = null;

if (
    SMTP_HOST &&
    SMTP_USER &&
    SMTP_PASS
) {

    emailTransporter =
        nodemailer.createTransport({

            host:
                SMTP_HOST,

            port:
                SMTP_PORT,

            secure:
                SMTP_PORT === 465,

            auth: {

                user:
                    SMTP_USER,

                pass:
                    SMTP_PASS

            }

        });

    console.log(
        "Sistema de e-mail configurado."
    );

} else {

    console.warn(
        "SMTP não configurado. O sistema funcionará, mas não enviará e-mails."
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
// =====================================================
//
// IMPORTANTE:
// express.raw() precisa ficar ANTES
// de express.json().
//
// =====================================================

app.post(
    "/webhook-stripe",

    express.raw({
        type: "application/json"
    }),

    async (req, res) => {

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
                "WEBHOOK STRIPE"
            );

            console.log(
                "Evento:",
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
                    metadata.pedido ||
                    "";


                const usuarioId =
                    metadata.usuarioId ||
                    metadata.userId ||
                    session.client_reference_id ||
                    "";


                const pago =
                    session.payment_status ===
                    "paid";


                // =================================================
                // E-MAIL DO STRIPE
                // =================================================

                const emailStripe =
                    session.customer_details?.email ||
                    session.customer_email ||
                    "";


                console.log(
                    "Session:",
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
                    "E-mail Stripe:",
                    emailStripe || "não encontrado"
                );

                console.log(
                    "Curso:",
                    metadata.curso || ""
                );

                console.log(
                    "Pagamento:",
                    session.payment_status
                );


                if (pedidoId) {

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
                            ? pedidoSnapshot.data()
                            : {};


                    // =================================================
                    // E-MAIL DO USUÁRIO
                    // =================================================

                    let emailUsuario =
                        emailStripe ||
                        dadosAtuais.email ||
                        "";


                    // =================================================
                    // TENTAR FIREBASE AUTH
                    // =================================================

                    if (
                        !emailUsuario &&
                        usuarioId
                    ) {

                        try {

                            const usuario =
                                await firebaseAuth
                                    .getUser(
                                        usuarioId
                                    );

                            emailUsuario =
                                usuario.email ||
                                "";

                        } catch (erroAuth) {

                            console.warn(
                                "Não foi possível buscar e-mail no Firebase Auth:",
                                erroAuth.message
                            );
                        }
                    }


                    // =================================================
                    // ATUALIZAR PEDIDO
                    // =================================================

                    await pedidoRef.set(

                        {

                            sessionId:
                                session.id,

                            pedidoId:
                                pedidoId,

                            usuarioId:
                                usuarioId,

                            email:
                                emailUsuario,

                            curso:
                                metadata.curso ||
                                dadosAtuais.curso ||
                                "",

                            categoria:
                                metadata.categoria ||
                                dadosAtuais.categoria ||
                                "EAD",

                            pago:
                                pago,

                            paymentStatus:
                                session.payment_status,

                            cursoConcluido:
                                dadosAtuais.cursoConcluido === true
                                    ? true
                                    : false,

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
                    // ATUALIZAR PAGAMENTO
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

                                sessionId:
                                    session.id,

                                pedidoId:
                                    pedidoId,

                                usuarioId:
                                    usuarioId,

                                email:
                                    emailUsuario,

                                curso:
                                    metadata.curso ||
                                    dadosAtuais.curso ||
                                    "",

                                categoria:
                                    metadata.categoria ||
                                    dadosAtuais.categoria ||
                                    "EAD",

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
                    // ENVIAR SENHA POR E-MAIL
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

                                curso:
                                    metadata.curso ||
                                    dadosAtuais.curso ||
                                    "",

                                pedidoAtual:
                                    dadosAtuais

                            });

                        } catch (erroEmail) {

                            console.error(
                                "Erro enviando senha por e-mail:",
                                erroEmail
                            );

                            // O pagamento NÃO é revertido
                            // caso o e-mail falhe.
                        }
                    }


                    console.log(
                        "Pedido atualizado."
                    );

                    console.log(
                        "Pagamento atualizado."
                    );
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


                console.log(
                    "Checkout expirado:",
                    session.id
                );
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
                    "PaymentIntent confirmado:",
                    paymentIntent.id
                );
            }


            console.log(
                "======================================"
            );


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
                        error.message ||
                        "Erro ao processar webhook."

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

            rotas: {

                usarSenhaCurso:
                    "/usar-senha-curso",

                criarPagamento:
                    "/criar-pagamento",

                consultarPagamento:
                    "/consultar-pagamento",

                agendarCurso:
                    "/agendar-curso",

                concluirCurso:
                    "/concluir-curso"

            }

        });
    }
);


// =====================================================
// HEALTH CHECK
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
// BUSCAR CONFIGURAÇÃO DO CURSO
// =====================================================

async function buscarConfiguracaoCurso(
    curso
) {

    const nomeCurso =
        String(
            curso || ""
        ).trim();


    if (!nomeCurso) {
        return null;
    }


    try {

        let documento =
            await db
                .collection(
                    "cursos_config"
                )
                .doc(
                    nomeCurso
                )
                .get();


        if (!documento.exists) {

            documento =
                await db
                    .collection(
                        "cursos_config"
                    )
                    .doc(
                        nomeCurso.toUpperCase()
                    )
                    .get();
        }


        if (!documento.exists) {

            console.warn(
                "Curso não encontrado:",
                nomeCurso
            );

            return null;
        }


        const dados =
            documento.data() || {};


        // =================================================
        // DESCRIÇÃO
        // =================================================

        const descricao =
            dados.descricao ||
            dados["descrição"] ||
            dados["descrição "] ||
            "Curso adquirido na plataforma.";


        // =================================================
        // SENHA
        // =================================================

        const senhaCurso =
            String(
                dados.senhaCurso ||
                ""
            ).trim();


        return {

            id:
                documento.id,

            ...dados,

            descricao:
                descricao,

            senhaCurso:
                senhaCurso

        };

    } catch (error) {

        console.error(
            "Erro buscando configuração do curso:",
            error
        );

        throw error;
    }
}


// =====================================================
// ENVIAR SENHA POR E-MAIL
// =====================================================

async function enviarSenhaCursoPorEmail({

    pedidoId,
    usuarioId,
    email,
    curso,
    pedidoAtual

}) {

    // =================================================
    // VALIDAR E-MAIL
    // =================================================

    if (!email) {

        throw new Error(
            "E-mail do usuário não encontrado."
        );
    }


    // =================================================
    // TRANSPORTADOR
    // =================================================

    if (!emailTransporter) {

        throw new Error(
            "SMTP não configurado."
        );
    }


    // =================================================
    // VERIFICAR SE JÁ FOI ENVIADO
    // =================================================

    if (
        pedidoAtual?.senhaEmailEnviado === true
    ) {

        console.log(
            "Senha já enviada anteriormente para o pedido:",
            pedidoId
        );

        return;
    }


    // =================================================
    // BUSCAR CURSO
    // =================================================

    const configuracao =
        await buscarConfiguracaoCurso(
            curso
        );


    if (!configuracao) {

        throw new Error(
            `Configuração do curso "${curso}" não encontrada.`
        );
    }


    // =================================================
    // SENHA
    // =================================================

    const senhaCurso =
        String(
            configuracao.senhaCurso ||
            ""
        ).trim();


    if (!senhaCurso) {

        throw new Error(
            `O curso "${curso}" não possui senha configurada.`
        );
    }


    // =================================================
    // LINK
    // =================================================

    const linkCurso =
        configuracao.linkCurso ||
        pedidoAtual?.linkCurso ||
        "";


    // =================================================
    // NOME
    // =================================================

    const nomeCurso =
        configuracao.nome ||
        curso;


    // =================================================
    // HTML DO E-MAIL
    // =================================================

    const html = `

        <!DOCTYPE html>

        <html lang="pt-BR">

        <head>

            <meta charset="UTF-8">

            <title>
                Acesso ao curso
            </title>

        </head>

        <body
            style="
                font-family: Arial, sans-serif;
                background: #f5f5f5;
                padding: 30px;
            "
        >

            <div
                style="
                    max-width: 600px;
                    margin: auto;
                    background: white;
                    padding: 30px;
                    border-radius: 10px;
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
                    ${nomeCurso}
                </p>

                <p>
                    <strong>Senha de acesso:</strong>
                </p>

                <div
                    style="
                        background: #eeeeee;
                        padding: 15px;
                        font-size: 24px;
                        font-weight: bold;
                        text-align: center;
                        letter-spacing: 2px;
                        border-radius: 6px;
                    "
                >
                    ${senhaCurso}
                </div>

                <p>
                    Essa senha pode ser utilizada
                    ilimitadas vezes para acessar
                    o curso adquirido.
                </p>

                ${
                    linkCurso
                        ? `
                            <p>
                                <a
                                    href="${linkCurso}"
                                    style="
                                        display: inline-block;
                                        background: #000;
                                        color: #fff;
                                        padding: 12px 20px;
                                        text-decoration: none;
                                        border-radius: 6px;
                                    "
                                >
                                    Acessar curso
                                </a>
                            </p>
                        `
                        : ""
                }

                <hr>

                <p
                    style="
                        color: #777;
                        font-size: 12px;
                    "
                >
                    Pedido:
                    ${pedidoId}
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

Curso: ${nomeCurso}

Senha de acesso: ${senhaCurso}

Essa senha pode ser utilizada ilimitadas vezes para acessar o curso.

${linkCurso
    ? `Acesso ao curso: ${linkCurso}`
    : ""
}

Pedido: ${pedidoId}

    `;


    // =================================================
    // ENVIAR
    // =================================================

    await emailTransporter.sendMail({

        from:
            EMAIL_FROM,

        to:
            email,

        subject:
            `Acesso ao curso ${nomeCurso}`,

        text:
            texto,

        html:
            html

    });


    // =================================================
    // MARCAR COMO ENVIADO
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
        "======================================"
    );

    console.log(
        "SENHA ENVIADA POR E-MAIL"
    );

    console.log(
        "E-mail:",
        email
    );

    console.log(
        "Curso:",
        nomeCurso
    );

    console.log(
        "Pedido:",
        pedidoId
    );

    console.log(
        "======================================"
    );
}


// =====================================================
// USAR SENHA DO CURSO
// =====================================================
//
// NOVA REGRA:
//
// A senha NÃO possui contador.
//
// Exemplo:
//
// NR1 -> NR12026
//
// O usuário pode utilizar:
//
// 1 vez
// 10 vezes
// 100 vezes
// 1000 vezes
//
// Enquanto o pedido estiver pago e o curso
// ainda não estiver concluído.
//
// =====================================================

app.post(
    "/usar-senha-curso",

    async (req, res) => {

        try {

            console.log(
                "======================================"
            );

            console.log(
                "VALIDAÇÃO DE SENHA DE CURSO"
            );


            const {
                senha,
                usuarioId
            } =
                req.body || {};


            // =================================================
            // SENHA
            // =================================================

            const senhaInformada =
                String(
                    senha || ""
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


            // =================================================
            // USUÁRIO
            // =================================================

            const usuarioIdInformado =
                String(
                    usuarioId || ""
                ).trim();


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


            console.log(
                "Usuário:",
                usuarioIdInformado
            );


            // =================================================
            // BUSCAR PEDIDOS
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


            // =================================================
            // PROCURAR PEDIDO
            // =================================================

            let pedidoEncontrado =
                null;

            let pedidoIdEncontrado =
                null;

            let configuracaoCurso =
                null;


            for (
                const documento
                of pedidosSnapshot.docs
            ) {

                const pedido =
                    documento.data() || {};


                // =================================================
                // PAGAMENTO
                // =================================================

                if (
                    pedido.pago !== true
                ) {

                    continue;
                }


                // =================================================
                // CURSO
                // =================================================

                const nomeCurso =
                    String(
                        pedido.curso || ""
                    ).trim();


                if (!nomeCurso) {

                    continue;
                }


                // =================================================
                // CONFIGURAÇÃO
                // =================================================

                let configuracao;

                try {

                    configuracao =
                        await buscarConfiguracaoCurso(
                            nomeCurso
                        );

                } catch (erro) {

                    console.error(
                        "Erro buscando configuração:",
                        erro
                    );

                    continue;
                }


                if (!configuracao) {

                    continue;
                }


                // =================================================
                // CURSO ATIVO
                // =================================================

                if (
                    configuracao.ativo === false
                ) {

                    continue;
                }


                // =================================================
                // SENHA
                // =================================================

                const senhaBanco =
                    String(
                        configuracao.senhaCurso ||
                        ""
                    ).trim();


                if (!senhaBanco) {

                    console.warn(
                        "Curso sem senha:",
                        nomeCurso
                    );

                    continue;
                }


                // =================================================
                // COMPARAR
                // =================================================

                if (
                    senhaBanco !==
                    senhaInformada
                ) {

                    continue;
                }


                // =================================================
                // CURSO CONCLUÍDO
                // =================================================

                const cursoConcluido =
                    pedido.cursoConcluido === true;


                if (
                    cursoConcluido
                ) {

                    return res
                        .status(403)
                        .json({

                            valido:
                                false,

                            concluido:
                                true,

                            erro:
                                "Este curso já foi concluído e não pode ser acessado novamente."

                        });
                }


                // =================================================
                // ENCONTRADO
                // =================================================

                pedidoEncontrado =
                    pedido;

                pedidoIdEncontrado =
                    documento.id;

                configuracaoCurso =
                    configuracao;

                break;
            }


            // =================================================
            // NÃO ENCONTRADO
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
                            "Senha inválida ou inexistente."

                    });
            }


            // =================================================
            // DADOS
            // =================================================

            const curso =
                configuracaoCurso.nome ||
                pedidoEncontrado.curso ||
                "";


            const categoria =
                configuracaoCurso.categoria ||
                pedidoEncontrado.categoria ||
                "EAD";


            const descricao =
                configuracaoCurso.descricao ||
                pedidoEncontrado.descricao ||
                "Curso adquirido na plataforma.";


            const linkCurso =
                configuracaoCurso.linkCurso ||
                pedidoEncontrado.linkCurso ||
                "";


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
            // ATUALIZAR PAGAMENTO
            // =================================================

            await db
                .collection(
                    "pagamentos"
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
            // RESULTADO
            // =================================================

            console.log(
                "======================================"
            );

            console.log(
                "ACESSO AUTORIZADO"
            );

            console.log(
                "Pedido:",
                pedidoIdEncontrado
            );

            console.log(
                "Curso:",
                curso
            );

            console.log(
                "Usuário:",
                usuarioIdInformado
            );

            console.log(
                "Senha ilimitada: SIM"
            );

            console.log(
                "======================================"
            );


            return res.json({

                valido:
                    true,

                pedidoId:
                    pedidoIdEncontrado,

                usuarioId:
                    usuarioIdInformado,

                curso:
                    curso,

                categoria:
                    categoria,

                descricao:
                    descricao,

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
                "======================================"
            );

            console.error(
                "ERRO AO USAR SENHA DO CURSO"
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

    async (req, res) => {

        try {

            const {
                pedidoId,
                usuarioId
            } =
                req.body || {};


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


            // =================================================
            // USUÁRIO
            // =================================================

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


            // =================================================
            // PAGAMENTO
            // =================================================

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


            // =================================================
            // JÁ CONCLUÍDO
            // =================================================

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
            // CONCLUIR
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
            // REGISTRAR CONCLUSÃO
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

app.post(
    "/criar-pagamento",

    async (req, res) => {

        try {

            const {
                curso,
                pedidoId,
                usuarioId
            } =
                req.body || {};


            if (!curso) {

                return res
                    .status(400)
                    .json({

                        erro:
                            "Curso não informado."

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
            // CONFIGURAÇÃO
            // =================================================

            const configuracao =
                await buscarConfiguracaoCurso(
                    curso
                );


            if (!configuracao) {

                return res
                    .status(404)
                    .json({

                        erro:
                            "Curso não cadastrado no servidor."

                    });
            }


            if (
                configuracao.ativo === false
            ) {

                return res
                    .status(400)
                    .json({

                        erro:
                            "Este curso não está disponível para compra."

                    });
            }


            // =================================================
            // PREÇO
            // =================================================

            const valor =
                Number(
                    configuracao.valor
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
            // TENTAR PEGAR E-MAIL DO FIREBASE
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
                    usuario.email ||
                    "";

            } catch (erroAuth) {

                console.warn(
                    "Não foi possível obter e-mail do Firebase:",
                    erroAuth.message
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

                    curso:
                        configuracao.nome ||
                        curso,

                    categoria:
                        configuracao.categoria ||
                        "EAD",

                    descricao:
                        configuracao.descricao ||
                        "Curso adquirido na plataforma.",

                    valor:
                        valor,

                    linkCurso:
                        configuracao.linkCurso ||
                        "",

                    // =================================================
                    // NÃO PRECISAMOS MAIS DE usosRestantes
                    // =================================================

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
                                                        configuracao.nome ||
                                                        curso,

                                                    description:
                                                        configuracao.descricao ||
                                                        "Curso online."

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

                        metadata:
                            {

                                pedidoId:
                                    pedidoId,

                                usuarioId:
                                    usuarioId,

                                curso:
                                    configuracao.nome ||
                                    curso,

                                categoria:
                                    configuracao.categoria ||
                                    "EAD"

                            },

                        success_url:
                            "https://igorpintoguedesdebarros2-sudo.github.io/PLATAFORMA/sucesso.html?session_id={CHECKOUT_SESSION_ID}",

                        cancel_url:
                            "https://igorpintoguedesdebarros2-sudo.github.io/PLATAFORMA/pagamento.html"

                    });


            // =================================================
            // SALVAR SESSION ID
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
                "======================================"
            );

            console.log(
                "PAGAMENTO CRIADO"
            );

            console.log(
                "Session:",
                session.id
            );

            console.log(
                "Pedido:",
                pedidoId
            );

            console.log(
                "Curso:",
                curso
            );

            console.log(
                "Valor:",
                valor
            );

            console.log(
                "======================================"
            );


            return res.json({

                sucesso:
                    true,

                id:
                    session.id,

                sessionId:
                    session.id,

                pedidoId:
                    pedidoId

            });


        } catch (error) {

            console.error(
                "Erro em /criar-pagamento:",
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


            if (!session) {

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


            const pago =
                session.payment_status ===
                "paid";


            const metadata =
                session.metadata || {};


            const usuarioId =
                metadata.usuarioId ||
                metadata.userId ||
                session.client_reference_id ||
                "";


            const pedidoId =
                metadata.pedidoId ||
                metadata.pedido ||
                "";


            let curso =
                metadata.curso ||
                "";


            let categoria =
                metadata.categoria ||
                "EAD";


            let descricao =
                "Curso adquirido na plataforma.";


            let linkCurso =
                "";


            let cursoConcluido =
                false;


            let valor =
                0;


            let email =
                "";


            // =================================================
            // BUSCAR PEDIDO
            // =================================================

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

                    const pedido =
                        pedidoSnapshot.data() || {};


                    curso =
                        pedido.curso ||
                        curso;


                    categoria =
                        pedido.categoria ||
                        categoria;


                    descricao =
                        pedido.descricao ||
                        descricao;


                    valor =
                        Number(
                            pedido.valor
                        ) || 0;


                    email =
                        pedido.email ||
                        "";


                    cursoConcluido =
                        pedido.cursoConcluido === true;


                    if (pago) {

                        linkCurso =
                            pedido.linkCurso ||
                            "";

                    }
                }
            }


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

                            email:
                                email,

                            curso:
                                curso,

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

                curso:
                    curso,

                categoria:
                    categoria,

                descricao:
                    descricao,

                cursoConcluido:
                    cursoConcluido,

                linkCurso:
                    pago
                        ? linkCurso
                        : "",

                valor:
                    valor,

                paymentStatus:
                    session.payment_status

            });


        } catch (error) {

            console.error(
                "Erro em /consultar-pagamento:",
                error
            );


            if (
                error &&
                (
                    error.code ===
                    "StripeInvalidRequestError" ||

                    error.statusCode ===
                    404
                )
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

        try {

            const {
                pedidoId,
                usuarioId,
                data,
                horario
            } =
                req.body || {};


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


            // =================================================
            // PEDIDO
            // =================================================

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
                pedidoSnapshot.data() || {};


            // =================================================
            // USUÁRIO
            // =================================================

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


            // =================================================
            // PAGAMENTO
            // =================================================

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


            // =================================================
            // CATEGORIA
            // =================================================

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
            // DUPLICIDADE
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
            // AGENDAMENTO
            // =================================================

            const agendamento = {

                pedidoId:
                    pedidoId,

                usuarioId:
                    usuarioId,

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

                        agendamento:
                            {

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


            console.log(
                "Agendamento criado:",
                referencia.id
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
                "Erro ao agendar curso:",
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
    (req, res) => {

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
            "Senha de curso: ILIMITADA"
        );

        console.log(
            "Rota /usar-senha-curso: OK"
        );

        console.log(
            "Rota /criar-pagamento: OK"
        );

        console.log(
            "Rota /consultar-pagamento: OK"
        );

        console.log(
            "Rota /agendar-curso: OK"
        );

        console.log(
            "Rota /concluir-curso: OK"
        );

        console.log(
            "Servidor online."
        );

        console.log(
            "======================================"
        );
    }
);