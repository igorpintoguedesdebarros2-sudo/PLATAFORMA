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
    push,
    set,
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
// BACKEND RENDER
// =====================================================

const API_URL =
    "https://plataforma-56gy.onrender.com";


// =====================================================
// CURSOS DISPONÍVEIS
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

            window.location.href = "index.html";

            return;
        }

        usuarioAtual = usuario;

        carregarCursos();
    }
);


// =====================================================
// CARREGAR CURSOS
// =====================================================

function carregarCursos() {

    const solicitacoes =
        document.getElementById("solicitacoes");

    const liberados =
        document.getElementById("cursosLiberados");


    if (!solicitacoes || !liberados) {

        console.error(
            "Elementos de cursos não encontrados."
        );

        return;
    }


    onValue(
        ref(db, "solicitacoes_cursos"),
        (snapshot) => {

            solicitacoes.innerHTML = "";
            liberados.innerHTML = "";


            let encontrouSolicitacao = false;
            let encontrouLiberado = false;


            snapshot.forEach(
                (item) => {

                    const curso =
                        item.val();

                    const id =
                        item.key;


                    if (!curso) {
                        return;
                    }


                    if (
                        curso.usuarioId !==
                        usuarioAtual.uid
                    ) {
                        return;
                    }


                    const dadosCurso =
                        cursosDisponiveis[curso.curso];


                    const categoria =
                        curso.categoria ||
                        dadosCurso?.categoria ||
                        "EAD";


                    const descricao =
                        curso.descricao ||
                        dadosCurso?.descricao ||
                        "Curso disponível na plataforma.";


                    // =================================================
                    // AGUARDANDO
                    // =================================================

                    if (
                        curso.status ===
                        "aguardando"
                    ) {

                        encontrouSolicitacao = true;


                        solicitacoes.innerHTML += `
                            <div class="curso-card">

                                <h3>
                                    ${curso.curso}
                                </h3>

                                <p>
                                    <strong>Categoria:</strong>
                                    ${categoria}
                                </p>

                                <p>
                                    ${descricao}
                                </p>

                                <p>
                                    Aguardando aprovação
                                    do administrador.
                                </p>

                            </div>
                        `;
                    }


                    // =================================================
                    // AGUARDANDO PAGAMENTO
                    // =================================================

                    if (
                        curso.status ===
                        "aguardando_pagamento"
                    ) {

                        encontrouSolicitacao = true;


                        solicitacoes.innerHTML += `
                            <div class="curso-card">

                                <h3>
                                    ${curso.curso}
                                </h3>

                                <p>
                                    <strong>Categoria:</strong>
                                    ${categoria}
                                </p>

                                <p>
                                    ${descricao}
                                </p>

                                <p>
                                    <strong>Valor:</strong>
                                    R$ ${Number(curso.valor).toFixed(2)}
                                </p>

                                <button
                                    type="button"
                                    onclick="pagarCurso('${id}')"
                                >
                                    Pagar
                                </button>

                            </div>
                        `;
                    }


                    // =================================================
                    // CURSO LIBERADO
                    // =================================================

                    if (
                        curso.status ===
                        "liberado"
                    ) {

                        encontrouLiberado = true;


                        // =============================================
                        // CURSO PRESENCIAL
                        // =============================================

                        if (
                            categoria.toLowerCase() ===
                            "presencial"
                        ) {

                            liberados.innerHTML += `
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
                                        Pagamento confirmado.
                                    </p>

                                    <button
                                        type="button"
                                        onclick="abrirAgendamento('${id}')"
                                    >
                                        Agendar curso
                                    </button>

                                </div>
                            `;

                        }


                        // =============================================
                        // CURSO EAD
                        // =============================================

                        else {

                            liberados.innerHTML += `
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
                                        Pagamento confirmado.
                                    </p>

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
                                                    Link do curso ainda não foi configurado.
                                                </p>
                                            `
                                    }

                                </div>
                            `;
                        }
                    }

                }
            );


            if (!encontrouSolicitacao) {

                solicitacoes.innerHTML =
                    "<p>Nenhuma solicitação.</p>";
            }


            if (!encontrouLiberado) {

                liberados.innerHTML =
                    "<p>Nenhum curso liberado.</p>";
            }

        }
    );
}


// =====================================================
// SOLICITAR CURSO
// =====================================================

const botaoSolicitar =
    document.getElementById("solicitar");


if (botaoSolicitar) {

    botaoSolicitar.onclick =
        async () => {

            try {

                const select =
                    document.getElementById("curso");


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


                const dadosCurso =
                    cursosDisponiveis[curso];


                if (!dadosCurso) {

                    alert(
                        "Curso não cadastrado."
                    );

                    return;
                }


                const pedido =
                    push(
                        ref(
                            db,
                            "solicitacoes_cursos"
                        )
                    );


                await set(
                    pedido,
                    {

                        usuarioId:
                            usuarioAtual.uid,

                        nomeUsuario:
                            usuarioAtual.displayName ||
                            "Usuário",

                        email:
                            usuarioAtual.email,

                        curso:
                            curso,

                        categoria:
                            dadosCurso.categoria,

                        descricao:
                            dadosCurso.descricao,

                        valor:
                            0,

                        status:
                            "aguardando",

                        pago:
                            false,

                        linkCurso:
                            ""

                    }
                );


                alert(
                    "Curso enviado para análise."
                );

            }
            catch (error) {

                console.error(
                    "Erro ao solicitar curso:",
                    error
                );

                alert(
                    "Erro ao solicitar curso."
                );
            }

        };
}


// =====================================================
// PAGAR CURSO
// =====================================================

window.pagarCurso =
    async (id) => {

        try {

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


            if (curso.pago === true) {

                alert(
                    "Este curso já foi pago."
                );

                return;
            }


            if (
                !curso.valor ||
                Number(curso.valor) <= 0
            ) {

                alert(
                    "O administrador ainda não definiu o valor."
                );

                return;
            }


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
                                    id,

                                usuarioId:
                                    usuarioAtual.uid,

                                curso:
                                    curso.curso,

                                valor:
                                    Number(curso.valor),

                                categoria:
                                    curso.categoria ||
                                    "EAD",

                                descricao:
                                    curso.descricao ||
                                    ""

                            })
                    }
                );


            if (!resposta.ok) {

                const texto =
                    await resposta.text();

                console.error(
                    "Erro do servidor:",
                    texto
                );

                alert(
                    "O servidor não conseguiu criar o pagamento."
                );

                return;
            }


            const dados =
                await resposta.json();


            if (!dados.id) {

                console.error(
                    "Resposta Stripe:",
                    dados
                );

                alert(
                    "Erro ao criar pagamento."
                );

                return;
            }


            const checkout =
                await stripe.redirectToCheckout({

                    sessionId:
                        dados.id

                });


            if (checkout.error) {

                alert(
                    checkout.error.message
                );
            }

        }
        catch (error) {

            console.error(
                "Erro no pagamento:",
                error
            );

            alert(
                "Erro ao iniciar pagamento."
            );
        }
    };


// =====================================================
// AGENDAMENTO PRESENCIAL
// =====================================================

window.abrirAgendamento =
    async (id) => {

        try {

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
                    "Esse curso não é presencial."
                );

                return;
            }


            const data =
                prompt(
                    "Digite a data do curso (DD/MM/AAAA):"
                );


            if (!data) {
                return;
            }


            const horario =
                prompt(
                    "Digite o horário (exemplo: 14:00):"
                );


            if (!horario) {
                return;
            }


            await set(
                ref(
                    db,
                    "agendamentos/" +
                    id
                ),
                {

                    usuarioId:
                        usuarioAtual.uid,

                    pedidoId:
                        id,

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
                        new Date().toISOString()

                }
            );


            alert(
                "Curso agendado com sucesso."
            );

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
    document.getElementById("sair");


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