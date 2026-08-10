import { auth } from "./firebase.js";

import {
    onAuthStateChanged
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";

// =====================================================
// CONFIGURAÇÃO
// =====================================================

const API_URL =
    "https://plataforma-56gy.onrender.com";

// =====================================================
// ELEMENTOS HTML
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
// STRIPE SESSION
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

// =====================================================
// AUXILIARES
// =====================================================

function mostrarStatus(mensagem) {

    if (statusPagamento) {
        statusPagamento.textContent =
            mensagem;
    }

}

// =====================================================

function limparCursos() {

    if (cursosComprados) {
        cursosComprados.innerHTML = "";
    }

}

// =====================================================

function criarElemento(tag, texto = "") {

    const elemento =
        document.createElement(tag);

    if (texto !== "") {
        elemento.textContent =
            texto;
    }

    return elemento;

}

// =====================================================
// CARD EAD
// =====================================================

function criarCardEAD(curso, pedidoId) {

    const card =
        criarElemento("div");

    card.className =
        "curso-card";

    // -------------------------------------------------
    // NOME
    // -------------------------------------------------

    card.appendChild(
        criarElemento(
            "h3",
            curso.curso || "Curso"
        )
    );

    // -------------------------------------------------
    // CATEGORIA
    // -------------------------------------------------

    card.appendChild(
        criarElemento(
            "p",
            "Categoria: EAD"
        )
    );

    // -------------------------------------------------
    // DESCRIÇÃO
    // -------------------------------------------------

    card.appendChild(
        criarElemento(
            "p",
            curso.descricao ||
            "Curso adquirido na plataforma."
        )
    );

    // -------------------------------------------------
    // PAGAMENTO
    // -------------------------------------------------

    card.appendChild(
        criarElemento(
            "p",
            "Pagamento confirmado."
        )
    );

    // -------------------------------------------------
    // VALOR
    // -------------------------------------------------

    if (
        curso.valor !== undefined &&
        curso.valor !== null
    ) {

        const valorNumerico =
            Number(curso.valor);

        if (
            Number.isFinite(
                valorNumerico
            )
        ) {

            card.appendChild(
                criarElemento(
                    "p",
                    "Valor pago: R$ " +
                    valorNumerico
                        .toFixed(2)
                        .replace(".", ",")
                )
            );

        }

    }

    // -------------------------------------------------
    // SENHA
    // -------------------------------------------------

    if (curso.senhaCurso) {

        const senhaContainer =
            criarElemento("p");

        const strong =
            criarElemento(
                "strong",
                "Senha do curso: "
            );

        const codigo =
            criarElemento(
                "code",
                curso.senhaCurso
            );

        senhaContainer.appendChild(
            strong
        );

        senhaContainer.appendChild(
            codigo
        );

        card.appendChild(
            senhaContainer
        );

        card.appendChild(
            criarElemento(
                "p",
                "Guarde esta senha para acessar o curso."
            )
        );

    }

    // -------------------------------------------------
    // ACESSOS
    // -------------------------------------------------

    if (
        curso.usosRestantes !== undefined &&
        curso.usosRestantes !== null
    ) {

        card.appendChild(
            criarElemento(
                "p",
                "Acessos restantes: " +
                curso.usosRestantes
            )
        );

    }

    // -------------------------------------------------
    // LINK DO CURSO
    // -------------------------------------------------

    if (curso.linkCurso) {

        const link =
            document.createElement("a");

        link.href =
            curso.linkCurso;

        link.target =
            "_blank";

        link.rel =
            "noopener noreferrer";

        const botao =
            criarElemento(
                "button",
                "Acessar curso"
            );

        botao.type =
            "button";

        link.appendChild(
            botao
        );

        card.appendChild(
            link
        );

    }
    else {

        card.appendChild(
            criarElemento(
                "p",
                "O link do curso ainda não foi disponibilizado."
            )
        );

    }

    // -------------------------------------------------
    // PEDIDO
    // -------------------------------------------------

    if (pedidoId) {

        const pedido =
            criarElemento(
                "small",
                "Pedido: " +
                pedidoId
            );

        pedido.style.display =
            "block";

        pedido.style.marginTop =
            "10px";

        card.appendChild(
            pedido
        );

    }

    // -------------------------------------------------
    // ADICIONAR NA TELA
    // -------------------------------------------------

    if (cursosComprados) {

        cursosComprados.appendChild(
            card
        );

    }

}

// =====================================================
// CARD PRESENCIAL
// =====================================================

function criarCardPresencial(
    curso,
    pedidoId
) {

    cursosPresenciais.push({

        id:
            pedidoId,

        curso:
            curso

    });

    const card =
        criarElemento("div");

    card.className =
        "curso-card";

    // -------------------------------------------------
    // NOME
    // -------------------------------------------------

    card.appendChild(
        criarElemento(
            "h3",
            curso.curso ||
            "Curso presencial"
        )
    );

    // -------------------------------------------------
    // CATEGORIA
    // -------------------------------------------------

    card.appendChild(
        criarElemento(
            "p",
            "Categoria: Presencial"
        )
    );

    // -------------------------------------------------
    // DESCRIÇÃO
    // -------------------------------------------------

    card.appendChild(
        criarElemento(
            "p",
            curso.descricao ||
            "Curso presencial adquirido na plataforma."
        )
    );

    // -------------------------------------------------
    // PAGAMENTO
    // -------------------------------------------------

    card.appendChild(
        criarElemento(
            "p",
            "Pagamento confirmado."
        )
    );

    // -------------------------------------------------
    // VALOR
    // -------------------------------------------------

    if (
        curso.valor !== undefined &&
        curso.valor !== null
    ) {

        const valorNumerico =
            Number(curso.valor);

        if (
            Number.isFinite(
                valorNumerico
            )
        ) {

            card.appendChild(
                criarElemento(
                    "p",
                    "Valor pago: R$ " +
                    valorNumerico
                        .toFixed(2)
                        .replace(".", ",")
                )
            );

        }

    }

    // -------------------------------------------------
    // AGENDAMENTO EXISTENTE
    // -------------------------------------------------

    if (curso.agendamento) {

        const agendamento =
            curso.agendamento;

        card.appendChild(
            criarElemento(
                "p",
                "Curso já agendado."
            )
        );

        card.appendChild(
            criarElemento(
                "p",
                "Data: " +
                (
                    agendamento.data ||
                    ""
                )
            )
        );

        card.appendChild(
            criarElemento(
                "p",
                "Horário: " +
                (
                    agendamento.horario ||
                    ""
                )
            )
        );

        card.appendChild(
            criarElemento(
                "p",
                "Status: " +
                (
                    agendamento.status ||
                    "Agendado"
                )
            )
        );

    }
    else {

        card.appendChild(
            criarElemento(
                "p",
                "Escolha abaixo a data e o horário da aula."
            )
        );

    }

    // -------------------------------------------------
    // ADICIONAR
    // -------------------------------------------------

    if (cursosComprados) {

        cursosComprados.appendChild(
            card
        );

    }

    // -------------------------------------------------
    // MOSTRAR ÁREA PRESENCIAL
    // -------------------------------------------------

    if (areaPresencial) {

        areaPresencial.style.display =
            "block";

    }

}

// =====================================================
// MOSTRAR CURSO
// =====================================================

function mostrarCurso(
    curso,
    pedidoId
) {

    if (!curso) {
        return;
    }

    const categoria =
        String(
            curso.categoria ||
            "EAD"
        ).toLowerCase();

    if (
        categoria === "ead"
    ) {

        criarCardEAD(
            curso,
            pedidoId
        );

        return;

    }

    if (
        categoria === "presencial"
    ) {

        criarCardPresencial(
            curso,
            pedidoId
        );

        return;

    }

    console.warn(
        "Categoria de curso desconhecida:",
        curso.categoria
    );

}

// =====================================================
// VERIFICAR PAGAMENTO
// =====================================================

async function verificarPagamento() {

    // -------------------------------------------------
    // SESSION ID
    // -------------------------------------------------

    if (!sessionId) {

        mostrarStatus(
            "Não foi possível identificar o pagamento."
        );

        limparCursos();

        if (cursosComprados) {

            cursosComprados.appendChild(
                criarElemento(
                    "p",
                    "session_id não encontrado na URL."
                )
            );

        }

        console.error(
            "session_id não encontrado."
        );

        return;

    }

    // -------------------------------------------------
    // USUÁRIO
    // -------------------------------------------------

    if (!usuarioAtual) {

        mostrarStatus(
            "Usuário ainda não identificado."
        );

        return;

    }

    mostrarStatus(
        "Verificando pagamento..."
    );

    try {

        // =================================================
        // CONSULTAR API
        // =================================================

        const url =
            API_URL +
            "/verificar-pagamento?session_id=" +
            encodeURIComponent(
                sessionId
            );

        console.log(
            "Consultando backend:",
            url
        );

        const resposta =
            await fetch(
                url,
                {
                    method:
                        "GET",

                    headers: {
                        "Accept":
                            "application/json"
                    }
                }
            );

        // =================================================
        // JSON
        // =================================================

        let dados = null;

        try {

            dados =
                await resposta.json();

        }
        catch (erroJSON) {

            console.error(
                "Backend não retornou JSON:",
                erroJSON
            );

        }

        console.log(
            "HTTP:",
            resposta.status
        );

        console.log(
            "Resposta:",
            dados
        );

        // =================================================
        // ERRO HTTP
        // =================================================

        if (!resposta.ok) {

            throw new Error(

                dados?.detalhe ||
                dados?.erro ||
                dados?.message ||
                "Erro HTTP " +
                resposta.status

            );

        }

        // =================================================
        // PAGAMENTO AINDA NÃO PAGO
        // =================================================

        if (
            !dados ||
            dados.pago !== true
        ) {

            mostrarStatus(
                dados?.mensagem ||
                "O pagamento ainda não foi confirmado."
            );

            limparCursos();

            if (cursosComprados) {

                cursosComprados.appendChild(
                    criarElemento(
                        "p",
                        "Status: " +
                        (
                            dados?.status ||
                            "processando"
                        )
                    )
                );

            }

            return;

        }

        // =================================================
        // VALIDAR USUÁRIO
        // =================================================

        if (
            dados.usuarioId &&
            String(
                dados.usuarioId
            ) !==
            String(
                usuarioAtual.uid
            )
        ) {

            console.error(
                "Pagamento pertence a outro usuário.",
                {
                    pagamento:
                        dados.usuarioId,

                    usuarioAtual:
                        usuarioAtual.uid
                }
            );

            mostrarStatus(
                "Este pagamento não pertence ao usuário atual."
            );

            limparCursos();

            if (cursosComprados) {

                cursosComprados.appendChild(
                    criarElemento(
                        "p",
                        "Pagamento associado a outro usuário."
                    )
                );

            }

            return;

        }

        // =================================================
        // CRIAR OBJETO DO CURSO
        // =================================================

        const curso = {

            curso:
                dados.curso,

            valor:
                dados.valor,

            status:
                dados.status ||
                "liberado",

            pago:
                true,

            pagamentoId:
                dados.pagamentoId ||
                sessionId,

            linkCurso:
                dados.linkCurso ||
                "",

            categoria:
                dados.categoria ||
                "EAD",

            descricao:
                dados.descricao ||
                "",

            senhaCurso:
                dados.senhaCurso ||
                "",

            usosRestantes:
                dados.usosRestantes,

            dataPagamento:
                dados.dataPagamento,

            pedidoId:
                dados.pedidoId,

            agendamento:
                dados.agendamento ||
                null

        };

        // =================================================
        // VALIDAR CURSO
        // =================================================

        if (!curso.curso) {

            throw new Error(
                "O backend confirmou o pagamento, mas não retornou o curso."
            );

        }

        // =================================================
        // LIMPAR
        // =================================================

        limparCursos();

        cursosPresenciais = [];

        if (areaPresencial) {

            areaPresencial.style.display =
                "none";

        }

        // =================================================
        // MOSTRAR
        // =================================================

        mostrarCurso(
            curso,
            dados.pedidoId ||
            sessionId
        );

        // =================================================
        // STATUS
        // =================================================

        mostrarStatus(
            "Pagamento confirmado. Curso liberado."
        );

        console.log(
            "Curso liberado:",
            curso
        );

    }
    catch (erro) {

        console.error(
            "Erro ao verificar pagamento:",
            erro
        );

        mostrarStatus(
            "Erro ao verificar o pagamento."
        );

        limparCursos();

        if (cursosComprados) {

            cursosComprados.appendChild(
                criarElemento(
                    "p",
                    "Não foi possível confirmar o pagamento."
                )
            );

            cursosComprados.appendChild(
                criarElemento(
                    "p",
                    erro.message ||
                    "Erro desconhecido."
                )
            );

        }

    }

}

// =====================================================
// DATA MÍNIMA
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
// AGENDAR CURSO PRESENCIAL
// =====================================================

if (botaoAgendar) {

    botaoAgendar.addEventListener(
        "click",
        async function () {

            // -------------------------------------------------
            // USUÁRIO
            // -------------------------------------------------

            if (!usuarioAtual) {

                alert(
                    "Usuário não autenticado."
                );

                return;

            }

            // -------------------------------------------------
            // CURSOS
            // -------------------------------------------------

            if (
                cursosPresenciais.length ===
                0
            ) {

                alert(
                    "Nenhum curso presencial encontrado."
                );

                return;

            }

            // -------------------------------------------------
            // DATA
            // -------------------------------------------------

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

            // -------------------------------------------------
            // HORÁRIO
            // -------------------------------------------------

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

            // -------------------------------------------------
            // BLOQUEAR BOTÃO
            // -------------------------------------------------

            botaoAgendar.disabled =
                true;

            const textoOriginal =
                botaoAgendar.textContent;

            botaoAgendar.textContent =
                "Agendando...";

            try {

                // =================================================
                // ENVIAR PARA O BACKEND
                // =================================================

                for (
                    const item
                    of cursosPresenciais
                ) {

                    const resposta =
                        await fetch(
                            API_URL +
                            "/agendar-curso",
                            {

                                method:
                                    "POST",

                                headers: {

                                    "Content-Type":
                                        "application/json",

                                    "Accept":
                                        "application/json"

                                },

                                body:
                                    JSON.stringify({

                                        pedidoId:
                                            item.id,

                                        usuarioId:
                                            usuarioAtual.uid,

                                        data:
                                            data,

                                        horario:
                                            horario

                                    })

                            }
                        );

                    let dados =
                        null;

                    try {

                        dados =
                            await resposta.json();

                    }
                    catch {

                        dados =
                            null;

                    }

                    console.log(
                        "Resposta do agendamento:",
                        dados
                    );

                    if (!resposta.ok) {

                        throw new Error(

                            dados?.erro ||
                            dados?.detalhe ||
                            "Erro HTTP " +
                            resposta.status

                        );

                    }

                    if (
                        dados &&
                        dados.sucesso === false
                    ) {

                        throw new Error(

                            dados.erro ||
                            "Não foi possível agendar o curso."

                        );

                    }

                }

                // =================================================
                // SUCESSO
                // =================================================

                mostrarStatus(
                    "Pagamento confirmado e curso presencial agendado."
                );

                if (areaPresencial) {

                    areaPresencial.innerHTML =
                        "";

                    areaPresencial.appendChild(
                        criarElemento(
                            "h2",
                            "Curso agendado"
                        )
                    );

                    for (
                        const item
                        of cursosPresenciais
                    ) {

                        const card =
                            criarElemento(
                                "div"
                            );

                        card.className =
                            "curso-card";

                        card.appendChild(
                            criarElemento(
                                "h3",
                                item.curso.curso
                            )
                        );

                        card.appendChild(
                            criarElemento(
                                "p",
                                "Data: " +
                                data
                            )
                        );

                        card.appendChild(
                            criarElemento(
                                "p",
                                "Horário: " +
                                horario
                            )
                        );

                        card.appendChild(
                            criarElemento(
                                "p",
                                "Status: Agendado"
                            )
                        );

                        areaPresencial.appendChild(
                            card
                        );

                    }

                    areaPresencial.appendChild(
                        criarElemento(
                            "p",
                            "O agendamento foi salvo no sistema."
                        )
                    );

                }

            }
            catch (erro) {

                console.error(
                    "Erro ao agendar:",
                    erro
                );

                alert(
                    erro.message ||
                    "Erro ao salvar o agendamento."
                );

            }
            finally {

                botaoAgendar.disabled =
                    false;

                botaoAgendar.textContent =
                    textoOriginal;

            }

        }
    );

}

// =====================================================
// AUTENTICAÇÃO
// =====================================================

onAuthStateChanged(
    auth,
    async function (usuario) {

        if (!usuario) {

            console.warn(
                "Nenhum usuário autenticado."
            );

            mostrarStatus(
                "Usuário não autenticado."
            );

            return;

        }

        usuarioAtual =
            usuario;

        console.log(
            "Usuário autenticado:",
            usuario.uid
        );

        console.log(
            "Stripe session:",
            sessionId
        );

        await verificarPagamento();

    }
);