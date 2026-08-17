import {
    auth,
    db
} from "./firebase.js";

import {
    onAuthStateChanged
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";

import {
    ref,
    set
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-database.js";

// =====================================================
// BACKEND
// =====================================================

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
        cursosComprados.innerHTML = `
            <p>
                Sessão de pagamento não encontrada.
            </p>
        `;
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

        const url =
            `${API_URL}/consultar-pagamento?session_id=${encodeURIComponent(sessionId)}`;

        console.log(
            "Consultando pagamento:",
            url
        );

        const resposta =
            await fetch(url);

        const texto =
            await resposta.text();

        let dados;

        try {

            dados =
                JSON.parse(texto);

        } catch (erro) {

            console.error(
                "Resposta não é JSON:",
                texto
            );

            throw new Error(
                "O servidor retornou uma resposta inválida."
            );
        }

        console.log(
            "Resposta do servidor:",
            dados
        );

        if (!resposta.ok) {

            throw new Error(
                dados.erro ||
                "Erro ao consultar pagamento."
            );
        }

        // =================================================
        // VERIFICAR USUÁRIO
        // =================================================

        if (
            dados.usuarioId &&
            dados.usuarioId !== usuarioAtual.uid
        ) {

            throw new Error(
                "O pagamento não pertence ao usuário autenticado."
            );
        }

        // =================================================
        // VERIFICAR PAGAMENTO
        // =================================================

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

        // =================================================
        // VERIFICAR CURSO
        // =================================================

        if (!dados.curso) {

            console.error(
                "O servidor não retornou os dados do curso:",
                dados
            );

            if (cursosComprados) {
                cursosComprados.innerHTML = `
                    <p>
                        Pagamento confirmado, mas os dados
                        do curso não foram encontrados.
                    </p>
                `;
            }

            return;
        }

        cursosPresenciais = [];

        if (cursosComprados) {
            cursosComprados.innerHTML = "";
        }

        mostrarCurso(
            dados.curso,
            dados.pedidoId
        );

    }
    catch (error) {

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

                <p>
                    ${escaparHTML(error.message)}
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

    if (!curso) {
        return;
    }

    // =================================================
    // DADOS DO CURSO
    // =================================================

    const nomeCurso =
        curso.curso ||
        curso.nome ||
        "Curso";

    const categoria =
        curso.categoria ||
        "EAD";

    const descricao =
        curso.descricao ||
        "Curso adquirido na plataforma.";

    const link =
        curso.linkCurso ||
        "";

    const valor =
        Number(
            curso.valor || 0
        );

    const senha =
        curso.senhaCurso ||
        "";

    const usosRestantes =
        Number(
            curso.usosRestantes ?? 0
        );

    const categoriaNormalizada =
        String(categoria)
            .trim()
            .toLowerCase();

    // =================================================
    // LOG PARA DEBUG
    // =================================================

    console.log(
        "======================================"
    );

    console.log(
        "CURSO RECEBIDO"
    );

    console.log(
        "Curso:",
        nomeCurso
    );

    console.log(
        "Categoria:",
        categoria
    );

    console.log(
        "Pedido:",
        id
    );

    console.log(
        "Senha oficial:",
        senha || "não informada"
    );

    console.log(
        "Usos restantes:",
        usosRestantes
    );

    console.log(
        "Link:",
        link
    );

    console.log(
        "======================================"
    );

    // =================================================
    // CURSO EAD
    // =================================================

    if (
        categoriaNormalizada ===
        "ead"
    ) {

        if (cursosComprados) {

            let html = `

                <div class="curso-card">

                    <h3>
                        ${escaparHTML(nomeCurso)}
                    </h3>

                    <p>
                        <strong>
                            Categoria:
                        </strong>
                        EAD
                    </p>

                    <p>
                        ${escaparHTML(descricao)}
                    </p>

                    <p>
                        <strong>
                            Pagamento:
                        </strong>
                        Confirmado
                    </p>

            `;

            // =================================================
            // SENHA OFICIAL
            // =================================================

            if (senha) {

                html += `

                    <div class="senha-curso">

                        <p>
                            <strong>
                                Senha de acesso:
                            </strong>
                        </p>

                        <code>
                            ${escaparHTML(senha)}
                        </code>

                        <p>
                            Esta é a senha oficial
                            gerada pelo servidor.
                        </p>

                        <p>
                            <strong>
                                Usos restantes:
                            </strong>
                            ${usosRestantes}
                        </p>

                    </div>

                `;

            } else {

                html += `

                    <div class="senha-curso">

                        <p>
                            <strong>
                                Senha de acesso:
                            </strong>
                        </p>

                        <p>
                            A senha ainda não foi
                            disponibilizada pelo servidor.
                        </p>

                    </div>

                `;
            }

            // =================================================
            // LINK DO CURSO
            // =================================================

            if (link) {

                html += `

                    <a
                        href="${escaparAtributo(link)}"
                        target="_blank"
                        rel="noopener noreferrer"
                    >

                        <button
                            type="button"
                        >
                            Acessar curso
                        </button>

                    </a>

                `;

            } else {

                html += `

                    <p>
                        O link do curso ainda não
                        foi configurado.
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

            id:
                id
        });

        if (cursosComprados) {

            cursosComprados.innerHTML += `

                <div class="curso-card">

                    <h3>
                        ${escaparHTML(nomeCurso)}
                    </h3>

                    <p>
                        <strong>
                            Categoria:
                        </strong>
                        Presencial
                    </p>

                    <p>
                        ${escaparHTML(descricao)}
                    </p>

                    <p>
                        <strong>
                            Pagamento:
                        </strong>
                        Confirmado
                    </p>

                    <p>
                        <strong>
                            Valor pago:
                        </strong>
                        R$
                        ${valor
                            .toFixed(2)
                            .replace(".", ",")}
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
                                        ${escaparHTML(
                                            curso.curso
                                        )}
                                    </h3>

                                    <p>
                                        <strong>
                                            Data:
                                        </strong>
                                        ${escaparHTML(data)}
                                    </p>

                                    <p>
                                        <strong>
                                            Horário:
                                        </strong>
                                        ${escaparHTML(horario)}
                                    </p>

                                    <p>
                                        Agendamento salvo
                                        com sucesso.
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

            }
            catch (error) {

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
