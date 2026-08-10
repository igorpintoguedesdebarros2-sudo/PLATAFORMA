import { auth, db } from "./firebase.js";

import {
    onAuthStateChanged
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";

import {
    ref,
    set
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-database.js";


// =====================================================
// CONFIGURAÇÃO
// =====================================================

// Durante desenvolvimento:
const API_URL = "http://localhost:3000";

// Quando publicar seu backend, troque para algo como:
// const API_URL = "https://seu-backend.com";


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


function limparCursos() {

    if (cursosComprados) {
        cursosComprados.innerHTML = "";
    }

}


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
// GERAR SENHA ÚNICA
// =====================================================

function gerarSenhaUnica() {

    const caracteres =
        "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789";

    let senha = "";

    for (let i = 0; i < 12; i++) {

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


    // ==========================
    // TÍTULO
    // ==========================

    const titulo =
        criarElemento(
            "h3",
            curso.curso
        );

    card.appendChild(titulo);


    // ==========================
    // CATEGORIA
    // ==========================

    const categoria =
        criarElemento(
            "p",
            "Categoria: EAD"
        );

    card.appendChild(
        categoria
    );


    // ==========================
    // DESCRIÇÃO
    // ==========================

    const descricao =
        criarElemento(
            "p",
            curso.descricao ||
            "Curso adquirido na plataforma."
        );

    card.appendChild(
        descricao
    );


    // ==========================
    // PAGAMENTO
    // ==========================

    const pagamento =
        criarElemento(
            "p",
            "Pagamento confirmado."
        );

    card.appendChild(
        pagamento
    );


    // ==========================
    // VALOR
    // ==========================

    if (curso.valor !== undefined) {

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


    // ==========================
    // SENHA
    // ==========================

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


    // ==========================
    // AVISO
    // ==========================

    const aviso =
        criarElemento(
            "p",
            "Guarde esta senha para acessar o curso."
        );

    card.appendChild(
        aviso
    );


    // ==========================
    // BOTÃO ACESSAR CURSO
    // ==========================

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


    // ==========================
    // ADICIONAR CARD
    // ==========================

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

        id: id,

        curso: curso

    });


    const card =
        criarElemento("div");

    card.className =
        "curso-card";


    const titulo =
        criarElemento(
            "h3",
            curso.curso
        );

    card.appendChild(
        titulo
    );


    const categoria =
        criarElemento(
            "p",
            "Categoria: Presencial"
        );

    card.appendChild(
        categoria
    );


    const descricao =
        criarElemento(
            "p",
            curso.descricao ||
            "Curso presencial adquirido na plataforma."
        );

    card.appendChild(
        descricao
    );


    const pagamento =
        criarElemento(
            "p",
            "Pagamento confirmado."
        );

    card.appendChild(
        pagamento
    );


    if (curso.valor !== undefined) {

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


    const aviso =
        criarElemento(
            "p",
            "Escolha abaixo a data e o horário da aula."
        );

    card.appendChild(
        aviso
    );


    if (cursosComprados) {

        cursosComprados.appendChild(
            card
        );

    }


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
        categoria === "ead"
    ) {

        criarCardEAD(
            curso,
            id
        );

        return;

    }


    if (
        categoria === "presencial"
    ) {

        criarCardPresencial(
            curso,
            id
        );

    }

}


// =====================================================
// SALVAR CURSO NO FIREBASE
// =====================================================

async function salvarCursoNoFirebase(
    dados
) {

    if (!usuarioAtual) {
        throw new Error(
            "Usuário não autenticado."
        );
    }


    const pedidoId =
        dados.pedidoId ||
        `pedido_${Date.now()}`;


    const senha =
        gerarSenhaUnica();


    const cursoFirebase = {

        usuarioId:
            usuarioAtual.uid,

        nomeUsuario:
            usuarioAtual.displayName ||
            "",

        email:
            usuarioAtual.email ||
            "",

        pedidoId:
            pedidoId,

        curso:
            dados.curso,

        valor:
            dados.valor,

        status:
            "liberado",

        pago:
            true,

        pagamentoId:
            dados.pagamentoId,

        linkCurso:
            dados.linkCurso,

        categoria:
            dados.categoria ||
            "EAD",

        senhaCurso:
            senha,

        dataPagamento:
            dados.dataPagamento ||
            new Date().toISOString()

    };


    await set(

        ref(
            db,
            "solicitacoes_cursos/" +
            pedidoId
        ),

        cursoFirebase

    );


    return {

        id:
            pedidoId,

        curso:
            cursoFirebase

    };

}


// =====================================================
// VERIFICAR PAGAMENTO NO BACKEND
// =====================================================

async function verificarPagamento() {

    if (!sessionId) {

        mostrarStatus(
            "Não foi possível identificar o pagamento."
        );


        limparCursos();


        if (cursosComprados) {

            cursosComprados.innerHTML =
                "<p>Sessão de pagamento não encontrada.</p>";

        }

        return;

    }


    mostrarStatus(
        "Verificando pagamento..."
    );


    try {

        // =================================================
        // CONSULTAR BACKEND
        // =================================================

        const resposta =
            await fetch(

                API_URL +
                "/verificar-pagamento?session_id=" +
                encodeURIComponent(
                    sessionId
                )

            );


        if (!resposta.ok) {

            throw new Error(
                "Erro HTTP " +
                resposta.status
            );

        }


        const dados =
            await resposta.json();


        console.log(
            "Dados recebidos do servidor:",
            dados
        );


        // =================================================
        // PAGAMENTO NÃO CONFIRMADO
        // =================================================

        if (!dados.pago) {

            mostrarStatus(
                "O pagamento ainda não foi confirmado."
            );


            if (cursosComprados) {

                cursosComprados.innerHTML =
                    "<p>Status do pagamento: " +
                    (dados.status || "pendente") +
                    "</p>";

            }

            return;

        }


        // =================================================
        // VALIDAR USUÁRIO
        // =================================================

        if (
            dados.usuarioId &&
            dados.usuarioId !==
            usuarioAtual.uid
        ) {

            console.error(
                "O pagamento pertence a outro usuário."
            );


            mostrarStatus(
                "O pagamento não pertence a este usuário."
            );


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
                "liberado",

            pago:
                true,

            pagamentoId:
                dados.pagamentoId,

            linkCurso:
                dados.linkCurso,

            categoria:
                dados.categoria ||
                "EAD",

            dataPagamento:
                dados.dataPagamento,

            pedidoId:
                dados.pedidoId

        };


        // =================================================
        // SALVAR NO FIREBASE
        // =================================================

        const resultado =
            await salvarCursoNoFirebase(
                curso
            );


        // =================================================
        // MOSTRAR CURSO
        // =================================================

        limparCursos();

        cursosPresenciais = [];


        mostrarCurso(
            resultado.curso,
            resultado.id
        );


        // =================================================
        // STATUS
        // =================================================

        mostrarStatus(
            "Pagamento confirmado. Curso liberado."
        );


        console.log(
            "Curso salvo:",
            resultado.curso
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
                "<p>Não foi possível confirmar o pagamento.</p>" +
                "<p>Verifique se o servidor está online.</p>";

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
// AGENDAR CURSOS PRESENCIAIS
// =====================================================

if (botaoAgendar) {

    botaoAgendar.onclick =
        async function () {

            if (
                cursosPresenciais.length === 0
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


            try {

                for (
                    const item
                    of cursosPresenciais
                ) {

                    await set(

                        ref(
                            db,
                            "agendamentos/" +
                            item.id
                        ),

                        {

                            usuarioId:
                                usuarioAtual.uid,

                            pedidoId:
                                item.id,

                            curso:
                                item.curso.curso,

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


                mostrarStatus(
                    "Pagamento confirmado e cursos presenciais agendados."
                );


                if (areaPresencial) {

                    areaPresencial.innerHTML =
                        "";


                    const titulo =
                        criarElemento(
                            "h2",
                            "Cursos agendados"
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
                            "Os agendamentos foram salvos no sistema."
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
                    "Erro ao salvar o agendamento."
                );

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

            mostrarStatus(
                "Usuário não autenticado."
            );

            return;

        }


        usuarioAtual =
            usuario;


        await verificarPagamento();

    }

);