import {
    auth
} from "./firebase.js";

import {
    onAuthStateChanged
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";

// =====================================================
// CONFIGURAÇÃO DO BACKEND
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

        // =================================================
        // URL DO SERVIDOR
        // =================================================

        const url =
            `${API_URL}/consultar-pagamento?session_id=${encodeURIComponent(sessionId)}`;

        console.log(
            "Consultando pagamento:",
            url
        );

        // =================================================
        // REQUISIÇÃO
        // =================================================

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

        // =================================================
        // LER RESPOSTA
        // =================================================

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
                "Resposta não é JSON:",
                texto
            );

            throw new Error(
                "O servidor não retornou uma resposta JSON válida."
            );
        }

        console.log(
            "Resposta do servidor:",
            dados
        );

        // =================================================
        // ERRO HTTP
        // =================================================

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
        // VERIFICAR PAGAMENTO
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

        console.log(
            "Pagamento confirmado."
        );

        if (statusPagamento) {

            statusPagamento.textContent =
                "Pagamento confirmado.";
        }

        // =================================================
        // LIMPAR ÁREAS
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
        // VERIFICAR CURSO
        // =================================================

        if (!dados.curso) {

            console.error(
                "Pagamento confirmado, mas curso não foi retornado.",
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

        // =================================================
        // LOG DO CURSO
        // =================================================

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
        console.log(
            "Link:",
            dados.linkCurso
        );
        console.log("======================================");

        // =================================================
        // MOSTRAR CURSO
        // =================================================

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
// MOSTRAR CURSO EAD
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
    // SENHA OFICIAL DO SERVIDOR
    // =================================================

    const senha =
        curso.senhaCurso ||
        "";

    // =================================================
    // USOS
    // =================================================

    const usos =
        Number(
            curso.usosRestantes
        );

    const usosValidos =
        Number.isFinite(usos)
            ? usos
            : 0;

    // =================================================
    // LINK
    // =================================================

    const link =
        curso.linkCurso ||
        "";

    // =================================================
    // ID SEGURO
    // =================================================

    const idSeguro =
        escaparHTML(id);

    // =================================================
    // HTML
    // =================================================

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

    html += `

        <div class="senha-curso">

            <p>
                <strong>
                    Senha do curso:
                </strong>
            </p>
    `;

    // =================================================
    // SENHA EXISTE
    // =================================================

    if (senha) {

        html += `

            <code
                id="senhaCurso_${idSeguro}"
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

        `;
    }

    // =================================================
    // SENHA NÃO EXISTE
    // =================================================

    else {

        html += `

            <p
                id="senhaCurso_${idSeguro}"
            >
                A senha oficial ainda não foi
                disponibilizada pelo servidor.
            </p>

            <p>
                Não é possível criar uma senha
                pelo navegador.
            </p>

        `;
    }

    // =================================================
    // BOTÃO CONFIRMAR PAGAMENTO
    // =================================================
    //
    // O botão fica ABAIXO da senha.
    //
    // =================================================

    html += `

            <button
                type="button"
                id="confirmarPagamento_${idSeguro}"
                class="botao-confirmar-pagamento"
            >
                Confirmar pagamento
            </button>

            <p
                id="statusConfirmacao_${idSeguro}"
            ></p>

        </div>

    `;

    // =================================================
    // ACESSO AO CURSO
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

    // =================================================
    // FECHAR CARD
    // =================================================

    html += `

        </div>

    `;

    // =================================================
    // INSERIR NA PÁGINA
    // =================================================

    cursosComprados.innerHTML =
        html;

    // =================================================
    // BOTÃO
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

        botao.disabled =
            true;

        botao.textContent =
            "Confirmando...";

        if (status) {

            status.textContent =
                "Consultando servidor...";
        }

        // =================================================
        // URL
        // =================================================

        const url =
            `${API_URL}/consultar-pagamento?session_id=${encodeURIComponent(sessionId)}`;

        console.log(
            "Confirmando pagamento:",
            url
        );

        // =================================================
        // CONSULTA
        // =================================================

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

        // =================================================
        // RESPOSTA
        // =================================================

        const texto =
            await resposta.text();

        let dados;

        try {

            dados =
                JSON.parse(texto);

        }
        catch (erro) {

            throw new Error(
                "O servidor retornou uma resposta inválida."
            );
        }

        console.log(
            "Resultado da confirmação:",
            dados
        );

        // =================================================
        // HTTP
        // =================================================

        if (!resposta.ok) {

            throw new Error(
                dados.erro ||
                `Erro HTTP ${resposta.status}`
            );
        }

        // =================================================
        // USUÁRIO
        // =================================================

        if (
            dados.usuarioId &&
            String(dados.usuarioId) !==
            String(usuarioAtual.uid)
        ) {

            throw new Error(
                "Este pagamento pertence a outro usuário."
            );
        }

        // =================================================
        // PAGAMENTO
        // =================================================

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
        // ATUALIZAR PAGAMENTO
        // =================================================

        ultimoPagamento =
            dados;

        if (statusPagamento) {

            statusPagamento.textContent =
                "Pagamento confirmado.";
        }

        // =================================================
        // SENHA
        // =================================================

        const senha =
            dados.senhaCurso ||
            "";

        const senhaElemento =
            document.getElementById(
                `senhaCurso_${id}`
            );

        if (senhaElemento && senha) {

            senhaElemento.textContent =
                senha;
        }

        // =================================================
        // USOS
        // =================================================

        const usos =
            Number(
                dados.usosRestantes
            );

        const usosValidos =
            Number.isFinite(usos)
                ? usos
                : 0;

        // =================================================
        // STATUS
        // =================================================

        if (status) {

            if (senha) {

                status.textContent =
                    `Pagamento confirmado. Senha oficial recebida. ${usosValidos} utilização(ões) restante(s).`;

            }
            else {

                status.textContent =
                    "Pagamento confirmado, mas o servidor ainda não retornou a senha oficial.";
            }
        }

        // =================================================
        // ATUALIZAR CARD COMPLETO
        // =================================================

        if (
            String(
                dados.categoria || ""
            )
                .trim()
                .toLowerCase() ===
            "ead"
        ) {

            mostrarCursoEAD(
                dados,
                id,
                dados.curso ||
                "Curso",
                dados.descricao ||
                "Curso adquirido na plataforma."
            );
        }

        // =================================================
        // BOTÃO
        // =================================================

        const novoBotao =
            document.getElementById(
                `confirmarPagamento_${id}`
            );

        if (novoBotao) {

            novoBotao.disabled =
                false;

            novoBotao.textContent =
                "Pagamento confirmado";
        }

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

    // =================================================
    // EVITAR DUPLICAÇÃO
    // =================================================

    const jaExiste =
        cursosPresenciais.some(
            cursoExistente =>
                String(cursoExistente.id) ===
                String(id)
        );

    if (!jaExiste) {

        cursosPresenciais.push({

            ...curso,

            id: id

        });
    }

    // =================================================
    // CARD
    // =================================================

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

    // =================================================
    // MOSTRAR ÁREA
    // =================================================

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
                                        "application/json",

                                    "Accept":
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

                    const texto =
                        await resposta.text();

                    let dados;

                    try {

                        dados =
                            JSON.parse(texto);

                    }
                    catch {

                        throw new Error(
                            "O servidor retornou uma resposta inválida ao agendar."
                        );
                    }

                    if (!resposta.ok) {

                        throw new Error(
                            dados.erro ||
                            "Erro ao agendar curso."
                        );
                    }
                }

                // =========================================
                // STATUS
                // =========================================

                if (statusPagamento) {

                    statusPagamento.textContent =
                        "Pagamento confirmado e curso presencial agendado.";
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