import {
    auth,
    db
} from "./firebase.js";

import {
    onAuthStateChanged,
    signOut
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";

import {
    ref,
    onValue,
    get
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-database.js";

// =====================================================
// STRIPE
// =====================================================

const stripe = Stripe(
    "pk_test_51TE8ZZLs51eEGUV1zJcylus26Ox4xxRVL8iiCeMmGngVvnbnRoR2laAVPhHxldhn0jkKs8kjugG4woYDr93qJX6z00QMKrOCbX"
);

// =====================================================
// BACKEND
// =====================================================

const API_URL =
    "https://plataforma-56gy.onrender.com";

// =====================================================
// CURSOS DISPONÍVEIS
// =====================================================
//
// IMPORTANTE:
//
// O valor NÃO fica aqui.
//
// O preço oficial é definido no server.js.
//
// O frontend apenas informa qual curso
// o usuário deseja comprar.
//
// =====================================================

const cursosDisponiveis = {

    "HTML Completo": {
        categoria: "EAD",
        descricao:
            "Curso completo de HTML, do básico ao avançado."
    },

    "CSS Completo": {
        categoria: "EAD",
        descricao:
            "Curso completo de CSS para criação de interfaces modernas."
    },

    "JavaScript": {
        categoria: "EAD",
        descricao:
            "Curso completo de JavaScript para desenvolvimento web."
    },

    "Python": {
        categoria: "EAD",
        descricao:
            "Curso completo de Python, programação e automação."
    },

    "Firebase": {
        categoria: "EAD",
        descricao:
            "Curso completo de Firebase e integração com aplicações."
    },

    "Python Presencial": {
        categoria: "Presencial",
        descricao:
            "Curso presencial de Python com aulas práticas."
    }

};

// =====================================================
// USUÁRIO ATUAL
// =====================================================

let usuarioAtual = null;

// =====================================================
// AUTENTICAÇÃO
// =====================================================

onAuthStateChanged(
    auth,
    (usuario) => {

        if (!usuario) {

            window.location.href =
                "index.html";

            return;
        }

        usuarioAtual =
            usuario;

        carregarCursosComprados();

    }
);

// =====================================================
// CARREGAR CURSOS JÁ COMPRADOS
// =====================================================
//
// Agora o Firebase contém somente cursos
// que já passaram pelo pagamento.
//
// Não existe mais:
// aguardando
// aguardando_pagamento
//
// =====================================================

function carregarCursosComprados() {

    const cursosLiberados =
        document.getElementById(
            "cursosLiberados"
        );

    const solicitacoes =
        document.getElementById(
            "solicitacoes"
        );

    if (solicitacoes) {

        solicitacoes.innerHTML = "";

        solicitacoes.innerHTML =
            "<p>Os cursos são liberados automaticamente após o pagamento.</p>";
    }

    if (!cursosLiberados) {

        console.error(
            "Elemento cursosLiberados não encontrado."
        );

        return;
    }

    onValue(
        ref(
            db,
            "solicitacoes_cursos"
        ),
        (snapshot) => {

            cursosLiberados.innerHTML = "";

            let encontrou =
                false;

            snapshot.forEach(
                (item) => {

                    const curso =
                        item.val();

                    const id =
                        item.key;

                    if (!curso) {
                        return;
                    }

                    // ---------------------------------------------
                    // SOMENTE CURSOS DO USUÁRIO LOGADO
                    // ---------------------------------------------

                    if (
                        curso.usuarioId !==
                        usuarioAtual.uid
                    ) {
                        return;
                    }

                    // ---------------------------------------------
                    // SOMENTE CURSOS PAGOS
                    // ---------------------------------------------

                    if (
                        curso.pago !== true
                    ) {
                        return;
                    }

                    encontrou = true;

                    const dadosCurso =
                        cursosDisponiveis[
                            curso.curso
                        ];

                    const categoria =
                        curso.categoria ||
                        dadosCurso?.categoria ||
                        "EAD";

                    const descricao =
                        curso.descricao ||
                        dadosCurso?.descricao ||
                        "Curso adquirido na plataforma.";

                    // =================================================
                    // PRESENCIAL
                    // =================================================

                    if (
                        categoria.toLowerCase() ===
                        "presencial"
                    ) {

                        cursosLiberados.innerHTML += `

                            <div class="curso-card">

                                <h3>
                                    ${curso.curso}
                                </h3>

                                <p>
                                    <strong>Categoria:</strong>
                                    Presencial
                                </p>

                                <p>
                                    ${descricao}
                                </p>

                                <p>
                                    <strong>Pagamento:</strong>
                                    Confirmado
                                </p>

                                <p>
                                    <strong>Valor pago:</strong>
                                    R$ ${Number(
                                        curso.valor || 0
                                    ).toFixed(2).replace(".", ",")}
                                </p>

                                ${
                                    curso.agendamento
                                    ? `

                                        <p>
                                            <strong>Data:</strong>
                                            ${curso.agendamento.data}
                                        </p>

                                        <p>
                                            <strong>Horário:</strong>
                                            ${curso.agendamento.horario}
                                        </p>

                                        <p>
                                            <strong>Status:</strong>
                                            Agendado
                                        </p>

                                    `
                                    : `

                                        <button
                                            type="button"
                                            onclick="abrirAgendamento('${id}')"
                                        >
                                            Agendar curso
                                        </button>

                                    `
                                }

                            </div>

                        `;

                        return;
                    }

                    // =================================================
                    // EAD
                    // =================================================

                    cursosLiberados.innerHTML += `

                        <div class="curso-card">

                            <h3>
                                ${curso.curso}
                            </h3>

                            <p>
                                <strong>Categoria:</strong>
                                EAD
                            </p>

                            <p>
                                ${descricao}
                            </p>

                            <p>
                                <strong>Pagamento:</strong>
                                Confirmado
                            </p>

                            <p>
                                <strong>Valor pago:</strong>
                                R$ ${Number(
                                    curso.valor || 0
                                ).toFixed(2).replace(".", ",")}
                            </p>

                            ${
                                curso.senhaCurso
                                ? `

                                    <p>
                                        <strong>
                                            Senha do curso:
                                        </strong>

                                        <code>
                                            ${curso.senhaCurso}
                                        </code>
                                    </p>

                                    <p>
                                        Esta senha possui
                                        ${curso.usosRestantes ?? 0}
                                        utilização(ões) restante(s).
                                    </p>

                                `
                                : ""
                            }

                            ${
                                curso.linkCurso
                                ? `

                                    <a
                                        href="${curso.linkCurso}"
                                        target="_blank"
                                        rel="noopener noreferrer"
                                    >

                                        <button
                                            type="button"
                                        >
                                            Acessar Curso
                                        </button>

                                    </a>

                                `
                                : `

                                    <p>
                                        Link do curso ainda não configurado.
                                    </p>

                                `
                            }

                        </div>

                    `;

                }
            );

            if (!encontrou) {

                cursosLiberados.innerHTML =
                    "<p>Você ainda não possui cursos pagos.</p>";
            }

        }
    );

}

// =====================================================
// COMPRAR CURSO
// =====================================================
//
// NOVO FLUXO:
//
// 1. Usuário escolhe curso
// 2. Frontend envia apenas o nome do curso
// 3. Backend encontra o preço fixo
// 4. Stripe cria o pagamento
// 5. Usuário vai para o Checkout
//
// NÃO cria solicitação.
// NÃO cria status aguardando.
// NÃO envia preço.
// NÃO depende do administrador.
// =====================================================

const botaoSolicitar =
    document.getElementById(
        "solicitar"
    );

if (botaoSolicitar) {

    botaoSolicitar.onclick =
        async () => {

            try {

                // ---------------------------------------------
                // VERIFICAR LOGIN
                // ---------------------------------------------

                if (!usuarioAtual) {

                    alert(
                        "Usuário não autenticado."
                    );

                    return;
                }

                // ---------------------------------------------
                // SELECT
                // ---------------------------------------------

                const select =
                    document.getElementById(
                        "curso"
                    );

                if (!select) {

                    alert(
                        "Campo de curso não encontrado."
                    );

                    return;
                }

                const curso =
                    select.value;

                if (!curso) {

                    alert(
                        "Selecione um curso."
                    );

                    return;
                }

                // ---------------------------------------------
                // VALIDAR CURSO
                // ---------------------------------------------

                const dadosCurso =
                    cursosDisponiveis[
                        curso
                    ];

                if (!dadosCurso) {

                    alert(
                        "Curso não cadastrado."
                    );

                    return;
                }

                // ---------------------------------------------
                // GERAR ID DO PEDIDO
                // ---------------------------------------------

                const pedidoId =
                    `pedido_${Date.now()}_${Math.random()
                        .toString(36)
                        .substring(2, 8)}`;

                // ---------------------------------------------
                // CRIAR PAGAMENTO
                // ---------------------------------------------
                //
                // IMPORTANTE:
                //
                // Não enviamos:
                //
                // valor
                // categoria
                // descricao
                //
                // O backend é a fonte oficial.
                // ---------------------------------------------

                const resposta =
                    await fetch(
                        API_URL +
                        "/criar-pagamento",
                        {

                            method:
                                "POST",

                            headers: {

                                "Content-Type":
                                    "application/json"

                            },

                            body:
                                JSON.stringify({

                                    pedidoId:
                                        pedidoId,

                                    usuarioId:
                                        usuarioAtual.uid,

                                    curso:
                                        curso

                                })

                        }
                    );

                // ---------------------------------------------
                // VERIFICAR RESPOSTA
                // ---------------------------------------------

                if (!resposta.ok) {

                    const texto =
                        await resposta.text();

                    console.error(
                        "Erro do servidor:",
                        texto
                    );

                    alert(
                        "Não foi possível iniciar o pagamento."
                    );

                    return;
                }

                const dados =
                    await resposta.json();

                console.log(
                    "Resposta do pagamento:",
                    dados
                );

                // ---------------------------------------------
                // REDIRECIONAR PARA STRIPE
                // ---------------------------------------------

                if (!dados.id) {

                    alert(
                        "Sessão de pagamento não criada."
                    );

                    return;
                }

                const checkout =
                    await stripe.redirectToCheckout({

                        sessionId:
                            dados.id

                    });

                if (
                    checkout &&
                    checkout.error
                ) {

                    alert(
                        checkout.error.message
                    );

                }

            }
            catch (error) {

                console.error(
                    "Erro ao iniciar pagamento:",
                    error
                );

                alert(
                    "Erro ao iniciar pagamento."
                );

            }

        };

}

// =====================================================
// AGENDAMENTO PRESENCIAL
// =====================================================
//
// O curso já está pago.
// O usuário somente escolhe data e horário.
//
// =====================================================

window.abrirAgendamento =
    async (id) => {

        try {

            if (!usuarioAtual) {

                alert(
                    "Usuário não autenticado."
                );

                return;
            }

            const resultado =
                await get(
                    ref(
                        db,
                        "solicitacoes_cursos/" +
                        id
                    )
                );

            const curso =
                resultado.val();

            if (!curso) {

                alert(
                    "Curso não encontrado."
                );

                return;
            }

            // ---------------------------------------------
            // VERIFICAR USUÁRIO
            // ---------------------------------------------

            if (
                curso.usuarioId !==
                usuarioAtual.uid
            ) {

                alert(
                    "Este curso pertence a outro usuário."
                );

                return;
            }

            // ---------------------------------------------
            // VERIFICAR PAGAMENTO
            // ---------------------------------------------

            if (
                curso.pago !== true
            ) {

                alert(
                    "O curso ainda não foi pago."
                );

                return;
            }

            // ---------------------------------------------
            // VERIFICAR CATEGORIA
            // ---------------------------------------------

            const categoria =
                curso.categoria ||
                cursosDisponiveis[
                    curso.curso
                ]?.categoria;

            if (
                !categoria ||
                categoria.toLowerCase() !==
                "presencial"
            ) {

                alert(
                    "Este curso não é presencial."
                );

                return;
            }

            // ---------------------------------------------
            // IMPEDIR NOVO AGENDAMENTO
            // ---------------------------------------------

            if (
                curso.agendamento
            ) {

                alert(
                    "Este curso já está agendado."
                );

                return;
            }

            // ---------------------------------------------
            // DATA
            // ---------------------------------------------

            const data =
                prompt(
                    "Digite a data do curso (DD/MM/AAAA):"
                );

            if (!data) {
                return;
            }

            // ---------------------------------------------
            // HORÁRIO
            // ---------------------------------------------

            const horario =
                prompt(
                    "Digite o horário (exemplo: 14:00):"
                );

            if (!horario) {
                return;
            }

            // ---------------------------------------------
            // ENVIAR PARA BACKEND
            // ---------------------------------------------
            //
            // O backend valida:
            //
            // - pedido
            // - usuário
            // - pagamento
            // - categoria
            //
            // ---------------------------------------------

            const resposta =
                await fetch(
                    API_URL +
                    "/agendar-curso",
                    {

                        method:
                            "POST",

                        headers: {

                            "Content-Type":
                                "application/json"

                        },

                        body:
                            JSON.stringify({

                                pedidoId:
                                    id,

                                usuarioId:
                                    usuarioAtual.uid,

                                data:
                                    data,

                                horario:
                                    horario

                            })

                    }
                );

            const dados =
                await resposta.json();

            if (!resposta.ok) {

                console.error(
                    "Erro agendamento:",
                    dados
                );

                alert(
                    dados.erro ||
                    "Não foi possível realizar o agendamento."
                );

                return;
            }

            alert(
                "Curso agendado com sucesso."
            );

            // Atualizar tela
            carregarCursosComprados();

        }
        catch (error) {

            console.error(
                "Erro ao agendar:",
                error
            );

            alert(
                "Não foi possível realizar o agendamento."
            );

        }

    };

// =====================================================
// SAIR
// =====================================================

const botaoSair =
    document.getElementById(
        "sair"
    );

if (botaoSair) {

    botaoSair.onclick =
        async () => {

            try {

                await signOut(auth);

                window.location.href =
                    "index.html";

            }
            catch (error) {

                console.error(
                    "Erro ao sair:",
                    error
                );

            }

        };

}