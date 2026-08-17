import express from "express";
import cors from "cors";
import Stripe from "stripe";
import admin from "firebase-admin";

// =====================================================
// CONFIGURAÇÃO
// =====================================================

const app = express();

const PORT = process.env.PORT || 10000;

const stripe = new Stripe(
    process.env.STRIPE_SECRET_KEY
);

// =====================================================
// FIREBASE ADMIN
// =====================================================

if (!admin.apps.length) {

    const firebasePrivateKey =
        process.env.FIREBASE_PRIVATE_KEY
            ?.replace(/\\n/g, "\n");

    admin.initializeApp({

        credential:
            admin.credential.cert({

                projectId:
                    process.env.FIREBASE_PROJECT_ID,

                clientEmail:
                    process.env.FIREBASE_CLIENT_EMAIL,

                privateKey:
                    firebasePrivateKey
            })
    });
}

const db =
    admin.firestore();

// =====================================================
// MIDDLEWARE
// =====================================================

app.use(
    cors({
        origin: "*"
    })
);

app.use(
    express.json()
);

// =====================================================
// TESTE DO SERVIDOR
// =====================================================

app.get(
    "/",
    (req, res) => {

        res.json({
            ok: true,
            servidor: "Plataforma",
            status: "online"
        });
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
                req.query.session_id;

            if (!sessionId) {

                return res.status(400).json({

                    valido: false,

                    pago: false,

                    erro:
                        "session_id não informado."
                });
            }

            console.log(
                "Consultando Stripe:",
                sessionId
            );

            // =================================================
            // BUSCAR SESSÃO NA STRIPE
            // =================================================

            const session =
                await stripe.checkout.sessions.retrieve(
                    sessionId
                );

            if (!session) {

                return res.status(404).json({

                    valido: false,

                    pago: false,

                    erro:
                        "Sessão de pagamento não encontrada."
                });
            }

            // =================================================
            // VERIFICAR PAGAMENTO
            // =================================================

            const pago =
                session.payment_status ===
                "paid";

            // =================================================
            // METADADOS
            // =================================================

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

            const curso =
                metadata.curso ||
                "";

            const categoria =
                metadata.categoria ||
                "EAD";

            const descricao =
                metadata.descricao ||
                "Curso adquirido na plataforma.";

            const linkCurso =
                metadata.linkCurso ||
                "";

            // =================================================
            // SENHA
            // =================================================

            const senhaCurso =
                metadata.senhaCurso ||
                metadata.senha ||
                metadata.senhaOficial ||
                metadata.senhaAcesso ||
                "";

            // =================================================
            // USOS
            // =================================================

            const usosRestantesNumero =
                Number(
                    metadata.usosRestantes
                );

            const usosRestantes =
                Number.isFinite(
                    usosRestantesNumero
                )
                    ? usosRestantesNumero
                    : 0;

            // =================================================
            // RESULTADO
            // =================================================

            const resultado = {

                valido: true,

                pago: pago,

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

                senhaCurso:
                    senhaCurso,

                usosRestantes:
                    usosRestantes,

                linkCurso:
                    linkCurso
            };

            console.log(
                "Pagamento consultado:",
                resultado
            );

            return res.json(
                resultado
            );

        }
        catch (error) {

            console.error(
                "Erro em /consultar-pagamento:",
                error
            );

            return res.status(500).json({

                valido: false,

                pago: false,

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

            } = req.body;

            // =================================================
            // VALIDAÇÃO
            // =================================================

            if (!pedidoId) {

                return res.status(400).json({

                    erro:
                        "pedidoId não informado."
                });
            }

            if (!usuarioId) {

                return res.status(400).json({

                    erro:
                        "usuarioId não informado."
                });
            }

            if (!data) {

                return res.status(400).json({

                    erro:
                        "Data não informada."
                });
            }

            if (!horario) {

                return res.status(400).json({

                    erro:
                        "Horário não informado."
                });
            }

            // =================================================
            // SALVAR AGENDAMENTO
            // =================================================

            const agendamento = {

                pedidoId:
                    pedidoId,

                usuarioId:
                    usuarioId,

                data:
                    data,

                horario:
                    horario,

                status:
                    "agendado",

                criadoEm:
                    admin.firestore.FieldValue.serverTimestamp()
            };

            const referencia =
                await db
                    .collection(
                        "agendamentos"
                    )
                    .add(
                        agendamento
                    );

            console.log(
                "Agendamento criado:",
                referencia.id
            );

            return res.json({

                sucesso: true,

                agendamentoId:
                    referencia.id,

                mensagem:
                    "Curso agendado com sucesso."
            });

        }
        catch (error) {

            console.error(
                "Erro ao agendar curso:",
                error
            );

            return res.status(500).json({

                sucesso: false,

                erro:
                    error.message ||
                    "Erro ao salvar agendamento."
            });
        }
    }
);

// =====================================================
// WEBHOOK STRIPE
// =====================================================
//
// IMPORTANTE:
// O webhook precisa receber o corpo bruto.
// Por isso ele fica ANTES do express.json() caso
// você queira utilizar esta rota.
//
// Nesta versão deixamos apenas a estrutura.
// =====================================================

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
            `Servidor iniciado na porta ${PORT}`
        );

        console.log(
            "Stripe: configurada"
        );

        console.log(
            "Firebase Admin: configurado"
        );

        console.log(
            "======================================"
        );
    }
);
