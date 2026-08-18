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

const EMAIL_FROM =
    process.env.EMAIL_FROM ||
    "Plataforma <onboarding@resend.dev>";


// =====================================================
// VALIDAÇÃO DAS VARIÁVEIS
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
// express.raw() precisa ficar antes de express.json().
// =====================================================

app.post(

    "/webhook-stripe",

    express.raw({
        type: "application/json"
    }),

    async (req, res) => {

        if (!STRIPE_WEBHOOK_SECRET) {

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
                "ERRO DE ASSINATURA STRIPE:",
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
                "WEBHOOK:",
                evento.type
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


            return res.json({

                recebido:
                    true

            });

        }
        catch (error) {

            console.error(
                "ERRO PROCESSANDO WEBHOOK:",
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
// BUSCAR CURSO PELA SENHA
// =====================================================
//
// A senha fica somente no backend/Firestore.
// Ela nunca é enviada de volta ao navegador.
// =====================================================

async function buscarCursoPorSenha(senha) {

    const senhaNormalizada =
        String(
            senha || ""
        ).trim();


    if (!senhaNormalizada) {

        return null;
    }


    const snapshot =
        await db
            .collection("cursos_config")
            .where(
                "senhaCurso",
                "==",
                senhaNormalizada
            )
            .limit(1)
            .get();


    if (snapshot.empty) {

        return null;
    }


    const documento =
        snapshot.docs[0];

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
// AUTENTICAR TOKEN FIREBASE
// =====================================================
//
// Se o frontend enviar:
//
// Authorization: Bearer TOKEN
//
// o backend valida o token.
//
// O sistema continua aceitando usuarioId para
// compatibilidade com seu NR1.js atual.
// =====================================================

async function verificarTokenFirebase(req) {

    const authorization =
        req.headers.authorization;


    if (
        !authorization ||
        !authorization.startsWith("Bearer ")
    ) {

        return null;
    }


    const token =
        authorization
            .substring(7)
            .trim();


    if (!token) {

        return null;
    }


    try {

        const decoded =
            await firebaseAuth.verifyIdToken(
                token
            );


        return decoded;

    }
    catch (error) {

        console.warn(
            "Token Firebase inválido:",
            error.message
        );

        return null;
    }
}


// =====================================================
// USAR SENHA DO CURSO
// =====================================================
//
// ROTA USADA PELO NR1.js:
//
// POST /usar-senha-curso
//
// Body:
//
// {
//     senha: "...",
//     usuarioId: "..."
// }
//
// Fluxo:
//
// 1. Verifica usuário.
// 2. Procura curso pela senha.
// 3. Verifica se curso está ativo.
// 4. Procura pedido pago do usuário.
// 5. Retorna autorização.
// =====================================================

app.post(

    "/usar-senha-curso",

    async (req, res) => {

        try {

            console.log(
                "======================================"
            );

            console.log(
                "SOLICITAÇÃO DE ACESSO AO CURSO"
            );


            const senha =
                String(
                    req.body?.senha ||
                    ""
                ).trim();


            const usuarioId =
                String(
                    req.body?.usuarioId ||
                    ""
                ).trim();


            // =================================================
            // VALIDAR SENHA
            // =================================================

            if (!senha) {

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
            // VALIDAR USUÁRIO
            // =================================================

            if (!usuarioId) {

                return res
                    .status(401)
                    .json({

                        valido:
                            false,

                        erro:
                            "Usuário não autenticado."

                    });
            }


            // =================================================
            // TOKEN FIREBASE
            // =================================================

            const usuarioToken =
                await verificarTokenFirebase(
                    req
                );


            if (
                usuarioToken &&
                usuarioToken.uid !== usuarioId
            ) {

                return res
                    .status(403)
                    .json({

                        valido:
                            false,

                        erro:
                            "O token não pertence ao usuário informado."

                    });
            }


            // =================================================
            // BUSCAR CURSO PELA SENHA
            // =================================================

            const curso =
                await buscarCursoPorSenha(
                    senha
                );


            if (!curso) {

                console.warn(
                    "Senha inválida."
                );

                return res
                    .status(401)
                    .json({

                        valido:
                            false,

                        erro:
                            "Senha do curso inválida."

                    });
            }


            // =================================================
            // CURSO DESATIVADO
            // =================================================

            if (!curso.ativo) {

                return res
                    .status(403)
                    .json({

                        valido:
                            false,

                        erro:
                            "Este curso está temporariamente indisponível."

                    });
            }


            console.log(
                "Curso encontrado:",
                curso.id
            );


            // =================================================
            // PROCURAR PEDIDO DO USUÁRIO
            // =================================================
            //
            // Procuramos pelo usuário e depois verificamos
            // curso + pagamento.
            //
            // Isso evita liberar o curso apenas porque
            // alguém descobriu a senha.
            // =================================================

            const pedidosSnapshot =
                await db
                    .collection("pedidos")
                    .where(
                        "usuarioId",
                        "==",
                        usuarioId
                    )
                    .get();


            if (pedidosSnapshot.empty) {

                return res
                    .status(403)
                    .json({

                        valido:
                            false,

                        erro:
                            "Você não possui uma compra registrada para este curso."

                    });
            }


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


                const pedidoCursoNome =
                    String(
                        pedido.curso ||
                        ""
                    ).trim()
                    .toUpperCase();


                const cursoNome =
                    String(
                        curso.nome ||
                        ""
                    ).trim()
                    .toUpperCase();


                const cursoCorresponde =
                    pedidoCursoId === curso.id ||
                    pedidoCursoNome === cursoNome;


                const pagamentoConfirmado =
                    pedido.pago === true ||
                    pedido.paymentStatus === "paid";


                if (
                    cursoCorresponde &&
                    pagamentoConfirmado
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
            // NENHUMA COMPRA
            // =================================================

            if (!pedidoEncontrado) {

                console.warn(
                    "Usuário não possui compra paga:",
                    usuarioId,
                    curso.id
                );

                return res
                    .status(403)
                    .json({

                        valido:
                            false,

                        erro:
                            "Você não possui acesso liberado para este curso."

                    });
            }


            // =================================================
            // VERIFICAR USOS
            // =================================================

            let usosRestantes;


            if (
                pedidoEncontrado.usosRestantes !==
                undefined
            ) {

                usosRestantes =
                    Number(
                        pedidoEncontrado.usosRestantes
                    );

            } else {

                // Primeiro acesso.
                // Se não existir contador no pedido,
                // consideramos 1 acesso disponível.
                usosRestantes = 1;
            }


            if (
                !Number.isFinite(
                    usosRestantes
                )
            ) {

                usosRestantes = 1;
            }


            if (
                usosRestantes <= 0
            ) {

                return res
                    .status(403)
                    .json({

                        valido:
                            false,

                        erro:
                            "Este acesso ao curso não possui mais usos disponíveis."

                    });
            }


            // =================================================
            // NÃO CONSUMIR O USO
            // =================================================
            //
            // O login no curso não reduz o contador.
            // Assim, o usuário pode sair e entrar novamente.
            //
            // Caso queira limitar quantidade de acessos,
            // podemos alterar isso depois.
            // =================================================


            // =================================================
            // AUTORIZAÇÃO
            // =================================================

            const autorizadoEm =
                new Date()
                    .toISOString();


            console.log(
                "ACESSO AUTORIZADO"
            );

            console.log(
                "Usuário:",
                usuarioId
            );

            console.log(
                "Pedido:",
                pedidoEncontrado.id
            );

            console.log(
                "Curso:",
                curso.nome
            );


            // =================================================
            // RESPOSTA
            // =================================================
            //
            // IMPORTANTE:
            // senhaCurso NÃO é enviada.
            // =================================================

            return res.json({

                valido:
                    true,

                pedidoId:
                    pedidoEncontrado.id,

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

                usosRestantes,

                autorizadoEm

            });

        }
        catch (error) {

            console.error(
                "======================================"
            );

            console.error(
                "ERRO EM /usar-senha-curso:"
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
                        "Erro interno ao validar o acesso ao curso."

                });
        }
    }
);


// =====================================================
// PROCESSAR CHECKOUT CONCLUÍDO
// =====================================================

async function processarCheckoutConcluido(
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
            metadata.cursoId || ""
        ).trim();


    const pago =
        session.payment_status ===
        "paid";


    const emailStripe =
        session.customer_details?.email ||
        session.customer_email ||
        "";


    if (!pedidoId) {

        throw new Error(
            "Webhook sem pedidoId."
        );
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


    const dadosAtuais =
        pedidoSnapshot.exists
            ? pedidoSnapshot.data() || {}
            : {};


    // =================================================
    // E-MAIL
    // =================================================

    const emailUsuario =
        await buscarEmailUsuario({

            usuarioId,

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
            `Curso "${cursoIdFinal}" não encontrado.`
        );
    }


    // =================================================
    // ATUALIZAR PEDIDO
    //
    // NÃO armazenamos a senha aqui.
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

        pago,

        paymentStatus:
            session.payment_status,

        atualizadoEm:
            FieldValue
                .serverTimestamp()

    }, {

        merge:
            true

    });


    // =================================================
    // PAGAMENTO
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

            pago,

            paymentStatus:
                session.payment_status,

            atualizadoEm:
                FieldValue
                    .serverTimestamp()

        }, {

            merge:
                true

        });


    // =================================================
    // E-MAIL
    // =================================================

    if (pago) {

        await enviarSenhaCursoPorEmail({

            pedidoId,

            usuarioId,

            email:
                emailUsuario,

            cursoId:
                curso.id

        });

    }
}


// =====================================================
// ENVIAR SENHA DO CURSO
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


    // =================================================
    // VERIFICAR SE JÁ FOI ENVIADO
    // =================================================

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


    if (
        pedido.senhaEmailEnviado ===
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
            `Curso "${cursoId}" não encontrado.`
        );
    }


    if (!curso.senhaCurso) {

        throw new Error(
            `O curso "${curso.nome}" não possui senha.`
        );
    }


    // =================================================
    // HTML
    // =================================================

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


    // =================================================
    // TEXTO
    // =================================================

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

        throw new Error(
            resultado.error.message ||
            "Erro ao enviar e-mail."
        );
    }


    const messageId =
        resultado.data?.id ||
        "";


    // =================================================
    // REGISTRAR ENVIO
    // =================================================

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

                criadoEm:
                    FieldValue
                        .serverTimestamp(),

                atualizadoEm:
                    FieldValue
                        .serverTimestamp()

            });


            // =================================================
            // URLS
            // =================================================

            const successUrl =
                `${FRONTEND_URL}/sucesso.html?session_id={CHECKOUT_SESSION_ID}&pedidoId=${encodeURIComponent(pedidoId)}`;


            const cancelUrl =
                `${FRONTEND_URL}/pagamento.html?cancelado=true&pedidoId=${encodeURIComponent(pedidoId)}`;


            // =================================================
            // STRIPE CHECKOUT
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

                        pedidoId,

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

                paymentStatus:
                    session.status ||
                    "open",

                atualizadoEm:
                    FieldValue
                        .serverTimestamp()

            }, {

                merge:
                    true

            });


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
            // STRIPE
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
            // SE PAGOU
            // =================================================

            if (
                pago &&
                pedidoId &&
                curso
            ) {

                const emailUsuario =
                    await buscarEmailUsuario({

                        usuarioId,

                        emailStripe,

                        emailPedido:
                            dadosPedido.email

                    });


                await db
                    .collection("pedidos")
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

                    }, {

                        merge:
                            true

                    });


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
                            session.payment_status,

                        atualizadoEm:
                            FieldValue
                                .serverTimestamp()

                    }, {

                        merge:
                            true

                    });


                dadosPedido = {

                    ...dadosPedido,

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
                        session.payment_status

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

            sistema:
                "Curso por ID + Stripe",

            pagamento:
                "Stripe Checkout",

            consultaPagamento:
                "/consultar-pagamento",

            validarCurso:
                "/usar-senha-curso",

            cursos:
                "Firestore /cursos_config",

            emailProvider:
                "Resend",

            senhaNoEmail:
                true,

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
                            O sistema de e-mail
                            está funcionando.
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
            "Webhook: /webhook-stripe"
        );

        console.log(
            "Pagamento: /criar-pagamento"
        );

        console.log(
            "Consulta: /consultar-pagamento"
        );

        console.log(
            "Acesso curso: /usar-senha-curso"
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
            "======================================"
        );

    }
);