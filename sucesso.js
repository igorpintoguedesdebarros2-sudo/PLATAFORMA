import { auth } from "./firebase.js";

import {
    onAuthStateChanged
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";

const API_URL =
    "https://plataforma-56gy.onrender.com";

// =====================================================
// ELEMENTOS DA PÁGINA
// =====================================================

const statusPagamento =
    document.getElementById("statusPagamento");

const cursosComprados =
    document.getElementById("cursosComprados");

const areaPresencial =
    document.getElementById("areaPresencial");

const dataCurso =
    document.getElementById("dataCurso");

const horarioCurso =
    document.getElementById("horarioCurso");

const botaoAgendar =
    document.getElementById("agendarCurso");


// =====================================================
// SESSION ID DA STRIPE
// =====================================================

const parametros =
    new URLSearchParams(window.location.search);

const sessionId =
    parametros.get("session_id");


// =====================================================
// ESTADO
// =====================================================

let usuarioAtual = null;

let cursosPresenciais = [];


// =====================================================
// VERIFICAR SESSION ID
// =====================================================

if (!sessionId) {

    if (statusPagamento) {
        statusPagamento.textContent =
            "Não foi possível identificar o pagamento.";
    }

    if (cursosComprados) {
        cursosComprados.innerHTML =
            "<p>Sessão de pagamento não encontrada.</p>";
    }
}


// =====================================================
// AUTENTICAÇÃO
// =====================================================

onAuthStateChanged(
    auth,
    (usuario) => {

        if (!usuario) {

            if (statusPagamento) {
                statusPagamento.textContent =
                    "Usuário não autenticado.";
            }

            return;
        }

        usuarioAtual = usuario;

        if (sessionId) {
            procurarPagamento();
        }
    }
);


// =====================================================
// PROCURAR PAGAMENTO
// =====================================================

async function procurarPagamento() {

    if (!usuarioAtual || !sessionId) {
        return;
    }

    try {

        if (statusPagamento) {
            statusPagamento.textContent =
                "Consultando pagamento...";
        }

        const resposta = await fetch(
            `${API_URL}/consultar-pagamento?session_id=${encodeURIComponent(sessionId)}`
        );

        const dados = await resposta.json();

        if (!resposta.ok) {
            throw new Error(
                dados.erro ||
                "Erro ao consultar pagamento."
            );
        }

        if (
            dados.usuarioId &&
            dados.usuarioId !== usuarioAtual.uid
        ) {
            throw new Error(
                "O pagamento não pertence ao usuário autenticado."
            );
        }

        if (!dados.pago) {

            if (statusPagamento) {
                statusPagamento.textContent =
                    "Pagamento ainda não confirmado.";
            }

            return;
        }

        if (statusPagamento) {
            statusPagamento.textContent =
                "Pagamento confirmado.";
        }

        if (dados.curso) {

            cursosPresenciais = [];

            if (cursosComprados) {
                cursosComprados.innerHTML = "";
            }

            mostrarCurso(
                dados.curso,
                dados.pedidoId
            );
        }

    } catch (error) {

        console.error(
            "Erro ao consultar pagamento:",
            error
        );

        if (statusPagamento) {
            statusPagamento.textContent =
                "Erro ao consultar o pagamento.";
        }

        if (cursosComprados) {
            cursosComprados.innerHTML = `
                <p>
                    Não foi possível consultar o pagamento.
                </p>
            `;
        }
    }
}

// =====================================================
// MOSTRAR CURSO
// =====================================================

function mostrarCurso(
    curso,
    id
) {

    const categoria =
        curso.categoria || "EAD";


    const descricao =
        curso.descricao ||
        "Curso adquirido na plataforma.";


    const categoriaNormalizada =
        categoria
            .trim()
            .toLowerCase();


    // =================================================
    // CURSO EAD
    // =================================================

    if (
        categoriaNormalizada ===
        "ead"
    ) {

        let senha =
            curso.senhaAcesso;


        /*
         * Se o servidor ainda não criou
         * uma senha, criamos uma.
         */

        if (!senha) {

            senha =
                gerarSenhaUnica();

            salvarSenha(
                id,
                senha
            );
        }


        const link =
            curso.linkCurso || "";


        if (cursosComprados) {

            let html = `

                <div class="curso-card">

                    <h3>
                        ${escaparHTML(curso.curso)}
                    </h3>

                    <p>
                        <strong>Categoria:</strong>
                        EAD
                    </p>

                    <p>
                        ${escaparHTML(descricao)}
                    </p>

                    <p>
                        <strong>Pagamento:</strong>
                        Confirmado
                    </p>

                    <p>
                        <strong>Senha de acesso:</strong>
                        ${escaparHTML(senha)}
                    </p>

                    <p>
                        Utilize essa senha para acessar
                        o curso.
                    </p>
            `;


            if (link) {

                html += `

                    <a
                        href="${escaparAtributo(link)}"
                        target="_blank"
                        rel="noopener noreferrer"
                    >

                        <button type="button">
                            Acessar curso
                        </button>

                    </a>

                `;

            } else {

                html += `

                    <p>
                        O link do curso ainda não foi configurado.
                    </p>

                `;
            }


            html += `

                </div>

            `;


            cursosComprados.innerHTML +=
                html;
        }


        return;
    }


    // =================================================
    // CURSO PRESENCIAL
    // =================================================

    if (
        categoriaNormalizada ===
        "presencial"
    ) {

        cursosPresenciais.push({

            ...curso,

            id: id
        });


        if (cursosComprados) {

            cursosComprados.innerHTML += `

                <div class="curso-card">

                    <h3>
                        ${escaparHTML(curso.curso)}
                    </h3>

                    <p>
                        <strong>Categoria:</strong>
                        Presencial
                    </p>

                    <p>
                        ${escaparHTML(descricao)}
                    </p>

                    <p>
                        <strong>Pagamento:</strong>
                        Confirmado
                    </p>

                    <p>
                        Escolha abaixo a data
                        e o horário da aula.
                    </p>

                </div>

            `;
        }


        if (areaPresencial) {
            areaPresencial.style.display =
                "block";
        }
    }
}


// =====================================================
// GERAR SENHA ÚNICA
// =====================================================

function gerarSenhaUnica() {

    const caracteres =
        "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789";


    let senha = "";


    for (
        let i = 0;
        i < 10;
        i++
    ) {

        const indice =
            Math.floor(
                Math.random() *
                caracteres.length
            );


        senha +=
            caracteres[indice];
    }


    return senha;
}


// =====================================================
// SALVAR SENHA DO EAD
// =====================================================

async function salvarSenha(
    id,
    senha
) {

    try {

    } catch (error) {

        console.error(
            "Erro ao salvar senha:",
            error
        );
    }
}


// =====================================================
// CONFIGURAR DATA MÍNIMA
// =====================================================

if (dataCurso) {

    const hoje =
        new Date();


    const ano =
        hoje.getFullYear();


    const mes =
        String(
            hoje.getMonth() + 1
        ).padStart(
            2,
            "0"
        );


    const dia =
        String(
            hoje.getDate()
        ).padStart(
            2,
            "0"
        );


    dataCurso.min =
        `${ano}-${mes}-${dia}`;
}


// =====================================================
// AGENDAR CURSOS PRESENCIAIS
// =====================================================

if (botaoAgendar) {

    botaoAgendar.onclick =
        async () => {

            // =============================================
            // VERIFICAR USUÁRIO
            // =============================================

            if (!usuarioAtual) {

                alert(
                    "Usuário não autenticado."
                );

                return;
            }


            // =============================================
            // VERIFICAR CURSOS
            // =============================================

            if (
                cursosPresenciais.length === 0
            ) {

                alert(
                    "Nenhum curso presencial encontrado."
                );

                return;
            }


            // =============================================
            // DATA
            // =============================================

            const data =
                dataCurso
                    ? dataCurso.value
                    : "";


            // =============================================
            // HORÁRIO
            // =============================================

            const horario =
                horarioCurso
                    ? horarioCurso.value
                    : "";


            if (!data) {

                alert(
                    "Selecione uma data."
                );

                return;
            }


            if (!horario) {

                alert(
                    "Selecione um horário."
                );

                return;
            }


            // =============================================
            // SALVAR AGENDAMENTOS
            // =============================================

            try {

                for (
                    const curso
                    of cursosPresenciais
                ) {

                    await set(

                        ref(
                            db,
                            "agendamentos/" +
                            curso.id
                        ),

                        {

                            usuarioId:
                                usuarioAtual.uid,

                            pedidoId:
                                curso.id,

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
                                new Date()
                                    .toISOString()
                        }
                    );
                }


                // =========================================
                // STATUS
                // =========================================

                if (statusPagamento) {

                    statusPagamento.textContent =
                        "Pagamento confirmado e cursos presenciais agendados.";
                }


                // =========================================
                // CONFIRMAÇÃO
                // =========================================

                if (areaPresencial) {

                    let html = `

                        <h2>
                            Cursos agendados
                        </h2>

                    `;


                    cursosPresenciais.forEach(
                        (curso) => {

                            html += `

                                <div class="curso-card">

                                    <h3>
                                        ${escaparHTML(curso.curso)}
                                    </h3>

                                    <p>
                                        <strong>Data:</strong>
                                        ${escaparHTML(data)}
                                    </p>

                                    <p>
                                        <strong>Horário:</strong>
                                        ${escaparHTML(horario)}
                                    </p>

                                    <p>
                                        Agendamento salvo com sucesso.
                                    </p>

                                </div>

                            `;
                        }
                    );


                    html += `

                        <p>
                            O agendamento foi registrado
                            na plataforma.
                        </p>

                    `;


                    areaPresencial.innerHTML =
                        html;
                }

            } catch (error) {

                console.error(
                    "Erro ao agendar:",
                    error
                );

                alert(
                    "Erro ao salvar o agendamento."
                );
            }
        };
}


// =====================================================
// ESCAPAR HTML
// =====================================================

function escaparHTML(valor) {

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
// ESCAPAR ATRIBUTO HTML
// =====================================================

function escaparAtributo(valor) {

    return String(
        valor ?? ""
    )

        .replace(
            /&/g,
            "&amp;"
        )

        .replace(
            /"/g,
            "&quot;"
        )

        .replace(
            /</g,
            "&lt;"
        )

        .replace(
            />/g,
            "&gt;"
        );
}