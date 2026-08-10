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
// STRIPE SESSION ID
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
// FUNÇÕES AUXILIARES
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

        cursosComprados.innerHTML =
            "";

    }

}

// =====================================================

function criarElemento(
    tag,
    texto = ""
) {

    const elemento =
        document.createElement(tag);

    if (texto) {

        elemento.textContent =
            texto;

    }

    return elemento;

}

// =====================================================
// CRIAR CARD EAD
// =====================================================

function criarCardEAD(
    curso,
    id
) {

    const card =
        criarElemento("div");

    card.className =
        "curso-card";

    // =================================================
    // TÍTULO
    // =================================================

    const titulo =
        criarElemento(
            "h3",
            curso.curso ||
            "Curso"
        );

    card.appendChild(
        titulo
    );

    // =================================================
    // CATEGORIA
    // =================================================

    const categoria =
        criarElemento(
            "p",
            "Categoria: EAD"
        );

    card.appendChild(
        categoria
    );

    // =================================================
    // DESCRIÇÃO
    // =================================================

    const descricao =
        criarElemento(
            "p",
            curso.descricao ||
            "Curso adquirido na plataforma."
        );

    card.appendChild(
        descricao
    );

    // =================================================
    // PAGAMENTO
    // =================================================

    const pagamento =
        criarElemento(
            "p",
            "Pagamento confirmado."
        );

    card.appendChild(
        pagamento
    );

    // =================================================
    // VALOR
    // =================================================

    if (
        curso.valor !== undefined &&
        curso.valor !== null
    ) {

        const valor =
            Number(curso.valor)
                .toFixed(2)
                .replace(".", ",");

        const valorTexto =
            criarElemento(
                "p",
                "Valor pago: R$ " +
                valor
            );

        card.appendChild(
            valorTexto
        );

    }

    // =================================================
    // SENHA
    // =================================================

    if (curso.senhaCurso) {

        const senhaTitulo =
            criarElemento("p");

        const senhaStrong =
            criarElemento(
                "strong",
                "Senha do curso: "
            );

        const senhaCodigo =
            criarElemento(
                "code",
                curso.senhaCurso
            );

        senhaTitulo.appendChild(
            senhaStrong
        );

        senhaTitulo.appendChild(
            senhaCodigo
        );

        card.appendChild(
            senhaTitulo
        );

        const aviso =
            criarElemento(
                "p",
                "Guarde esta senha para acessar o curso."
            );

        card.appendChild(
            aviso
        );

    }

    // =================================================
    // USOS RESTANTES
    // =================================================

    if (
        curso.usosRestantes !== undefined &&
        curso.usosRestantes !== null
    ) {

        const usos =
            criarElemento(
                "p",
                "Acessos restantes: " +
                curso.usosRestantes
            );

        card.appendChild(
            usos
        );

    }

    // =================================================
    // BOTÃO ACESSAR CURSO
    // =================================================

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

        const semLink =
            criarElemento(
                "p",
                "O link do curso ainda não foi disponibilizado."
            );

        card.appendChild(
            semLink
        );

    }

    // =================================================
    // ID DO PEDIDO
    // =================================================

    if (id) {

        const pedido =
            criarElemento(
                "small",
                "Pedido: " + id
            );

        pedido.style.display =
            "block";

        pedido.style.marginTop =
            "10px";

        card.appendChild(
            pedido
        );

    }

    // =================================================
    // ADICIONAR
    // =================================================

    if (cursosComprados) {

        cursosComprados.appendChild(
            card
        );

    }

}

// =====================================================
// CRIAR CARD PRESENCIAL
// =====================================================

function criarCardPresencial(
    curso,
    id
) {

    cursosPresenciais.push({

        id:
            id,

        curso:
            curso

    });

    const card =
        criarElemento("div");

    card.className =
        "curso-card";

    // =================================================
    // TÍTULO
    // =================================================

    const titulo =
        criarElemento(
            "h3",
            curso.curso ||
            "Curso presencial"
        );

    card.appendChild(
        titulo
    );

    // =================================================
    // CATEGORIA
    // =================================================

    const categoria =
        criarElemento(
            "p",
            "Categoria: Presencial"
        );

    card.appendChild(
        categoria
    );

    // =================================================
    // DESCRIÇÃO
    // =================================================

    const descricao =
        criarElemento(
            "p",
            curso.descricao ||
            "Curso presencial adquirido na plataforma."
        );

    card.appendChild(
        descricao
    );

    // =================================================
    // PAGAMENTO
    // =================================================

    const pagamento =
        criarElemento(
            "p",
            "Pagamento confirmado."
        );

    card.appendChild(
        pagamento
    );

    // =================================================
    // VALOR
    // =================================================

    if (
        curso.valor !== undefined &&
        curso.valor !== null
    ) {

        const valor =
            Number(curso.valor)
                .toFixed(2)
                .replace(".", ",");

        const valorTexto =
            criarElemento(
                "p",
                "Valor pago: R$ " +
                valor
            );

        card.appendChild(
            valorTexto
        );

    }

    // =================================================
    // AGENDAMENTO
    // =================================================

    if (curso.agendamento) {

        const agendamento =
            curso.agendamento;

        const aviso =
            criarElemento(
                "p",
                "Curso já agendado."
            );

        card.appendChild(
            aviso
        );

        const data =
            criarElemento(
                "p",
                "Data: " +
                agendamento.data
        );

        const horario =
            criarElemento(
                "p",
                "Horário: " +
                agendamento.horario
        );

        const status =
            criarElemento(
                "p",
                "Status: " +
                (
                    agendamento.status ||
                    "Agendado"
                )
        );

        card.appendChild(
            data
        );

        card.appendChild(
            horario
        );

        card.appendChild(
            status
        );

    }
    else {

        const aviso =
            criarElemento(
                "p",
                "Escolha abaixo a data e o horário da aula."
            );

        card.appendChild(
            aviso
        );

    }

    // =================================================
    // ADICIONAR
    // =================================================

    if (cursosComprados) {

        cursosComprados.appendChild(
            card
        );

    }

    // =================================================
    // MOSTRAR ÁREA PRESENCIAL
    // =================================================

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
    id
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
        categoria ===
        "ead"
    ) {

        criarCardEAD(
            curso,
            id
        );

        return;

    }

    if (
        categoria ===
        "presencial"
    ) {

        criarCardPresencial(
            curso,
            id
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

    if (!sessionId) {

        mostrarStatus(
            "Não foi possível identificar o pagamento."
        );

        if (cursosComprados) {

            cursosComprados.innerHTML =
                "<p>Sessão de pagamento não encontrada.</p>";

        }

        console.error(
            "session_id não encontrado na URL."
        );

        return;

    }

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
        // CONSULTAR BACKEND
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
        // LER RESPOSTA
        // =================================================

        let dados = null;

        try {

            dados =
                await resposta.json();

        }
        catch (erroJSON) {

            console.error(
                "Resposta não é JSON:",
                erroJSON
            );

        }

        console.log(
            "HTTP:",
            resposta.status
        );

        console.log(
            "Resposta do backend:",
            dados
        );

        // =================================================
        // ERRO HTTP
        // =================================================

        if (!resposta.ok) {

            const mensagem =
                dados?.detalhe ||
                dados?.erro ||
                dados?.message ||
                "Erro HTTP " +
                resposta.status;

            throw new Error(
                mensagem
            );

        }

        // =================================================
        // PAGAMENTO NÃO CONFIRMADO
        // =================================================

        if (!dados?.pago) {

            mostrarStatus(
                dados?.mensagem ||
                "O pagamento ainda não foi confirmado."
            );

            if (cursosComprados) {

                cursosComprados.innerHTML =
                    "";

                const status =
                    criarElemento(
                        "p",
                        "Status: " +
                        (
                            dados?.status ||
                            "processando"
                        )
                    );

                cursosComprados.appendChild(
                    status
                );

            }

            return;

        }

        // =================================================
        // VALIDAR USUÁRIO
        // =================================================

        if (
            dados.usuarioId &&
            String(dados.usuarioId) !==
            String(usuarioAtual.uid)
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

            if (cursosComprados) {

                cursosComprados.innerHTML =
                    "<p>Pagamento associado a outro usuário.</p>";

            }

            return;

        }

        // =================================================
        // CURSO RECEBIDO DO BACKEND
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
                dados.linkCurso,

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
        // LIMPAR INTERFACE
        // =================================================

        limparCursos();

        cursosPresenciais = [];

        if (areaPresencial) {

            areaPresencial.style.display =
                "none";

        }

        // =================================================
        // MOSTRAR CURSO
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

        if (cursosComprados) {

            cursosComprados.innerHTML =
                "";

            const titulo =
                criarElemento(
                    "p",
                    "Não foi possível confirmar o pagamento."
                );

            const detalhe =
                criarElemento(
                    "p",
                    erro.message ||
                    "Erro desconhecido."
                );

            cursosComprados.appendChild(
                titulo
            );

            cursosComprados.appendChild(
                detalhe
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
        ano +
        "-" +
        mes +
        "-" +
        dia;

}

// =====================================================
// AGENDAR CURSO PRESENCIAL
// =====================================================

if (botaoAgendar) {

    botaoAgendar.onclick =
        async function () {

            if (!usuarioAtual) {

                alert(
                    "Usuário não autenticado."
                );

                return;

            }

            if (
                cursosPresenciais.length ===
                0
            ) {

                alert(
                    "Nenhum curso presencial encontrado."
                );

                return;

            }

            const data =
                dataCurso
                    ? dataCurso.value
                    : "";

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

            botaoAgendar.disabled =
                true;

            const textoOriginal =
                botaoAgendar.textContent;

            botaoAgendar.textContent =
                "Agendando...";

            try {

                // =================================================
                // AGENDAR CURSO
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
                        "Resposta agendamento:",
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

                    const titulo =
                        criarElemento(
                            "h2",
                            "Curso agendado"
                        );

                    areaPresencial.appendChild(
                        titulo
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

                        const nome =
                            criarElemento(
                                "h3",
                                item.curso.curso
                            );

                        const dataTexto =
                            criarElemento(
                                "p",
                                "Data: " +
                                data
                            );

                        const horarioTexto =
                            criarElemento(
                                "p",
                                "Horário: " +
                                horario
                            );

                        const status =
                            criarElemento(
                                "p",
                                "Status: Agendado"
                            );

                        card.appendChild(
                            nome
                        );

                        card.appendChild(
                            dataTexto
                        );

                        card.appendChild(
                            horarioTexto
                        );

                        card.appendChild(
                            status
                        );

                        areaPresencial.appendChild(
                            card
                        );

                    }

                    const aviso =
                        criarElemento(
                            "p",
                            "O agendamento foi salvo no sistema."
                        );

                    areaPresencial.appendChild(
                        aviso
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

        };

}

// =====================================================
// INICIAR
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