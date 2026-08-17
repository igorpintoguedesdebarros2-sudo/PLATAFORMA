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
// ELEMENTOS
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
// SESSION ID STRIPE
// =====================================================

const parametros =
    new URLSearchParams(
        window.location.search
    );

const sessionId =
    parametros.get("session_id");

// =====================================================
// ESTADO
// =====================================================

let usuarioAtual = null;

let cursosPresenciais = [];

let ultimoPagamento = null;

// =====================================================
// LOG INICIAL
// =====================================================

console.log("======================================");
console.log("SUCESSO.JS INICIADO");
console.log("Session ID:", sessionId);
console.log("API:", API_URL);
console.log("======================================");

// =====================================================
// SESSION ID AUSENTE
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
    async (usuario) => {

        if (!usuario) {

            console.log(
                "Usuário não autenticado."
            );

            if (statusPagamento) {

                statusPagamento.textContent =
                    "Usuário não autenticado.";
            }

            return;
        }

        usuarioAtual = usuario;

        console.log(
            "Usuário autenticado:",
            usuarioAtual.uid
        );

        if (sessionId) {

            await procurarPagamento();
        }
    }
);

// =====================================================
// CONSULTAR PAGAMENTO
// =====================================================

async function procurarPagamento() {

    if (!usuarioAtual) {

        console.error(
            "Usuário não autenticado."
        );

        return;
    }

    if (!sessionId) {

        console.error(
            "Session ID não informado."
        );

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
            await fetch(
                url,
                {
                    method: "GET",
                    headers: {
                        "Accept":
                            "application/json"
                    }
                }
            );

        const texto =
            await resposta.text();

        console.log(
            "Resposta bruta do servidor:",
            texto
        );

        let dados;

        try {

            dados =
                JSON.parse(texto);

        }
        catch (erroJSON) {

            console.error(
                "Servidor não retornou JSON:",
                texto
            );

            throw new Error(
                "Resposta inválida do servidor."
            );
        }

        console.log(
            "Resposta do servidor:",
            dados
        );

        if (!resposta.ok) {

            throw new Error(
                dados.erro ||
                `Erro HTTP ${resposta.status}`
            );
        }

        // =================================================
        // VERIFICAR USUÁRIO
        // =================================================

        if (
            dados.usuarioId &&
            String(dados.usuarioId) !==
            String(usuarioAtual.uid)
        ) {

            throw new Error(
                "O pagamento não pertence ao usuário autenticado."
            );
        }

        // =================================================
        // PAGAMENTO NÃO CONFIRMADO
        // =================================================

        if (dados.pago !== true) {

            if (statusPagamento) {

                statusPagamento.textContent =
                    "Pagamento ainda não confirmado.";
            }

            if (cursosComprados) {

                cursosComprados.innerHTML = `
                    <p>
                        O pagamento ainda não foi confirmado pela Stripe.
                    </p>
                `;
            }

            return;
        }

        // =================================================
        // PAGAMENTO CONFIRMADO
        // =================================================

        ultimoPagamento =
            dados;

        if (statusPagamento) {

            statusPagamento.textContent =
                "Pagamento confirmado.";
        }

        // =================================================
        // LIMPAR ÁREA
        // =================================================

        cursosPresenciais = [];

        if (cursosComprados) {

            cursosComprados.innerHTML = "";
        }

        if (areaPresencial) {

            areaPresencial.style.display =
                "none";
        }

        // =================================================
        // CURSO
        // =================================================

        if (!dados.curso) {

            console.error(
                "Servidor confirmou pagamento, mas não enviou curso.",
                dados
            );

            if (cursosComprados) {

                cursosComprados.innerHTML = `
                    <p>
                        Pagamento confirmado, mas os dados do curso
                        não foram encontrados.
                    </p>
                `;
            }

            return;
        }

        console.log("======================================");
        console.log("CURSO RECEBIDO");
        console.log("Curso:", dados.curso);
        console.log("Categoria:", dados.categoria);
        console.log("Pedido:", dados.pedidoId);
        console.log(
            "Senha oficial:",
            dados.senhaCurso || "não informada"
        );
        console.log(
            "Usos restantes:",
            dados.usosRestantes
        );
        console.log("Link:", dados.linkCurso);
        console.log("======================================");

        mostrarCurso(
            dados,
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
                    ${escaparHTML(
                        error.message
                    )}
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

    const nomeCurso =
        curso.curso ||
        "Curso";

    const categoria =
        curso.categoria ||
        "EAD";

    const descricao =
        curso.descricao ||
        "Curso adquirido na plataforma.";

    const categoriaNormalizada =
        String(categoria)
            .trim()
            .toLowerCase();

    // =================================================
    // EAD
    // =================================================

    if (
        categoriaNormalizada ===
        "ead"
    ) {

        mostrarCursoEAD(
            curso,
            id,
            nomeCurso,
            descricao
        );

        return;
    }

    // =================================================
    // PRESENCIAL
    // =================================================

    if (
        categoriaNormalizada ===
        "presencial"
    ) {

        mostrarCursoPresencial(
            curso,
            id,
            nomeCurso,
            descricao
        );

        return;
    }

    // =================================================
    // CATEGORIA DESCONHECIDA
    // =================================================

    console.warn(
        "Categoria desconhecida:",
        categoria
    );

    mostrarCursoEAD(
        curso,
        id,
        nomeCurso,
        descricao
    );
}

// =====================================================
// MOSTRAR EAD
// =====================================================

function mostrarCursoEAD(
    curso,
    id,
    nomeCurso,
    descricao
) {

    if (!cursosComprados) {
        return;
    }

    // =================================================
    // SENHA OFICIAL
    // =================================================
    //
    // IMPORTANTE:
    //
    // NÃO GERAR SENHA AQUI.
    //
    // A senha precisa vir do server.js.
    //
    // =================================================

    const senha =
        curso.senhaCurso ||
        "";

    const usos =
        Number(
            curso.usosRestantes
        );

    const usosValidos =
        Number.isFinite(usos)
            ? usos
            : 0;

    const link =
        curso.linkCurso ||
        "";

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
    // SENHA
    // =================================================

    if (senha) {

        html += `

            <div class="senha-curso">

                <p>
                    <strong>
                        Senha do curso:
                    </strong>
                </p>

                <code
                    id="senhaCurso_${escaparHTML(id)}"
                >
                    ${escaparHTML(senha)}
                </code>

                <p>
                    Esta senha possui
                    <strong>
                        ${usosValidos}
                    </strong>
                    utilização(ões)
                    restante(s).
                </p>

                <button
                    type="button"
                    id="confirmarPagamento_${escaparHTML(id)}"
                    class="botao-confirmar-pagamento"
                >
                    Confirmar pagamento
                </button>

                <p
                    id="statusConfirmacao_${escaparHTML(id)}"
                ></p>

            </div>

        `;

    }
    else {

        html += `

            <div class="senha-curso">

                <p>
                    <strong>
                        Senha do curso:
                    </strong>
                </p>

                <p>
                    A senha oficial ainda não foi retornada
                    pelo servidor.
                </p>

                <button
                    type="button"
                    id="confirmarPagamento_${escaparHTML(id)}"
                    class="botao-confirmar-pagamento"
                >
                    Confirmar pagamento
                </button>

                <p
                    id="statusConfirmacao_${escaparHTML(id)}"
                ></p>

            </div>

        `;
    }

    // =================================================
    // LINK
    // =================================================

    if (link) {

        html += `

            <div class="acesso-curso">

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

            </div>

        `;

    }
    else {

        html += `

            <p>
                O link do curso ainda não foi configurado.
            </p>

        `;
    }

    html += `

        </div>

    `;

    cursosComprados.innerHTML =
        html;

    // =================================================
    // BOTÃO CONFIRMAR PAGAMENTO
    // =================================================

    const botaoConfirmar =
        document.getElementById(
            `confirmarPagamento_${id}`
        );

    if (botaoConfirmar) {

        botaoConfirmar.onclick =
            async () => {

                await confirmarPagamento(
                    botaoConfirmar,
                    id
                );
            };
    }
}

// =====================================================
// CONFIRMAR PAGAMENTO
// =====================================================
//
// Este botão NÃO cria outra senha.
//
// Ele simplesmente consulta novamente o servidor.
//
// O servidor é a única fonte oficial da senha.
//
// =====================================================

async function confirmarPagamento(
    botao,
    id
) {

    if (!usuarioAtual) {

        alert(
            "Usuário não autenticado."
        );

        return;
    }

    if (!sessionId) {

        alert(
            "Session ID não encontrado."
        );

        return;
    }

    const status =
        document.getElementById(
            `statusConfirmacao_${id}`
        );

    try {

        botao.disabled = true;

        botao.textContent =
            "Confirmando...";

        if (status) {

            status.textContent =
                "Consultando servidor...";
        }

        const url =
            `${API_URL}/consultar-pagamento?session_id=${encodeURIComponent(sessionId)}`;

        console.log(
            "Confirmando pagamento:",
            url
        );

        const resposta =
            await fetch(
                url,
                {
                    method: "GET",
                    headers: {
                        "Accept":
                            "application/json"
                    }
                }
            );

        const dados =
            await resposta.json();

        console.log(
            "Resultado da confirmação:",
            dados
        );

        if (!resposta.ok) {

            throw new Error(
                dados.erro ||
                "Erro ao confirmar pagamento."
            );
        }

        if (
            dados.usuarioId &&
            String(dados.usuarioId) !==
            String(usuarioAtual.uid)
        ) {

            throw new Error(
                "Este pagamento pertence a outro usuário."
            );
        }

        if (dados.pago !== true) {

            if (status) {

                status.textContent =
                    "Pagamento ainda não confirmado.";
            }

            botao.disabled =
                false;

            botao.textContent =
                "Confirmar pagamento";

            return;
        }

        // =================================================
        // CONFIRMADO
        // =================================================

        if (status) {

            status.textContent =
                "Pagamento confirmado com sucesso.";
        }

        if (statusPagamento) {

            statusPagamento.textContent =
                "Pagamento confirmado.";
        }

        // =================================================
        // SE FOR EAD, MOSTRAR SENHA OFICIAL
        // =================================================

        if (
            String(
                dados.categoria || ""
            )
                .trim()
                .toLowerCase() ===
            "ead"
        ) {

            if (dados.senhaCurso) {

                const senhaElemento =
                    document.getElementById(
                        `senhaCurso_${id}`
                    );

                if (senhaElemento) {

                    senhaElemento.textContent =
                        dados.senhaCurso;
                }

                const dadosCurso =
                    {
                        ...dados
                    };

                mostrarCursoEAD(
                    dadosCurso,
                    id,
                    dados.curso || "Curso",
                    dados.descricao ||
                    "Curso adquirido na plataforma."
                );
            }
            else {

                if (status) {

                    status.textContent =
                        "Pagamento confirmado, mas o servidor não retornou a senha oficial.";
                }
            }
        }

        botao.disabled =
            false;

        botao.textContent =
            "Pagamento confirmado";

    }
    catch (error) {

        console.error(
            "Erro ao confirmar pagamento:",
            error
        );

        if (status) {

            status.textContent =
                error.message;
        }

        botao.disabled =
            false;

        botao.textContent =
            "Confirmar pagamento";
    }
}

// =====================================================
// MOSTRAR CURSO PRESENCIAL
// =====================================================

function mostrarCursoPresencial(
    curso,
    id,
    nomeCurso,
    descricao
) {

    cursosPresenciais.push({

        ...curso,

        id: id

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
            // USUÁRIO
            // =============================================

            if (!usuarioAtual) {

                alert(
                    "Usuário não autenticado."
                );

                return;
            }

            // =============================================
            // CURSOS
            // =============================================

            if (
                cursosPresenciais.length ===
                0
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

            if (!data) {

                alert(
                    "Selecione uma data."
                );

                return;
            }

            // =============================================
            // HORÁRIO
            // =============================================

            const horario =
                horarioCurso
                    ? horarioCurso.value
                    : "";

            if (!horario) {

                alert(
                    "Selecione um horário."
                );

                return;
            }

            // =============================================
            // ENVIAR PARA BACKEND
            // =============================================

            try {

                for (
                    const curso
                    of cursosPresenciais
                ) {

                    const resposta =
                        await fetch(
                            `${API_URL}/agendar-curso`,
                            {
                                method: "POST",

                                headers: {
                                    "Content-Type":
                                        "application/json"
                                },

                                body:
                                    JSON.stringify({

                                        pedidoId:
                                            curso.pedidoId ||
                                            curso.id,

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

                        throw new Error(
                            dados.erro ||
                            "Erro ao agendar curso."
                        );
                    }
                }

                if (statusPagamento) {

                    statusPagamento.textContent =
                        "Pagamento confirmado e curso presencial agendado.";
                }

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

                                        ${escaparHTML(
                                            data
                                        )}
                                    </p>

                                    <p>
                                        <strong>
                                            Horário:
                                        </strong>

                                        ${escaparHTML(
                                            horario
                                        )}
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

            }
            catch (error) {

                console.error(
                    "Erro ao agendar:",
                    error
                );

                alert(
                    error.message ||
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
// ESCAPAR ATRIBUTO
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