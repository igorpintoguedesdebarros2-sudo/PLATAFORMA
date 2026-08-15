import {
    auth
} from "./firebase.js";

import {
    onAuthStateChanged,
    signOut
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";


// =====================================================
// CONFIGURAÇÃO
// =====================================================

const API_URL =
    "https://plataforma-56gy.onrender.com";


// =====================================================
// DADOS DO CURSO
// =====================================================

const CURSO = {

    nome:
        "Curso Completo de Programação",

    descricao:
        "Aprenda programação do zero ao avançado."

};


// =====================================================
// MATERIAIS DO CURSO
// =====================================================
//
// Você pode adicionar quantos quiser.
//
// tipo:
// "pdf"
// "video"
//
// Para PDF:
// arquivo = caminho ou URL do PDF
//
// Para vídeo:
// arquivo = URL do vídeo
//
// =====================================================

const MATERIAIS = [

    {
        tipo: "video",

        titulo:
            "Aula 1 - Introdução",

        descricao:
            "Introdução ao curso.",

        arquivo:
            "videos/aula1.mp4"
    },


    {
        tipo: "pdf",

        titulo:
            "Material 1 - Introdução",

        descricao:
            "Material complementar da primeira aula.",

        arquivo:
            "pdfs/material1.pdf"
    },


    {
        tipo: "video",

        titulo:
            "Aula 2 - HTML",

        descricao:
            "Aprendendo HTML.",

        arquivo:
            "videos/aula2.mp4"
    },


    {
        tipo: "pdf",

        titulo:
            "Material 2 - HTML",

        descricao:
            "Apostila de HTML.",

        arquivo:
            "pdfs/html.pdf"
    },


    {
        tipo: "video",

        titulo:
            "Aula 3 - CSS",

        descricao:
            "Aprendendo CSS.",

        arquivo:
            "videos/aula3.mp4"
    },


    {
        tipo: "pdf",

        titulo:
            "Material 3 - CSS",

        descricao:
            "Apostila de CSS.",

        arquivo:
            "pdfs/css.pdf"
    }

];


// =====================================================
// ELEMENTOS
// =====================================================

const telaSenha =
    document.getElementById(
        "telaSenha"
    );

const conteudoCurso =
    document.getElementById(
        "conteudoCurso"
    );

const senhaInput =
    document.getElementById(
        "senhaCurso"
    );

const btnEntrar =
    document.getElementById(
        "btnEntrarCurso"
    );

const mensagem =
    document.getElementById(
        "mensagemSenha"
    );

const listaMateriais =
    document.getElementById(
        "listaMateriais"
    );

const modal =
    document.getElementById(
        "modal"
    );

const modalTitulo =
    document.getElementById(
        "modalTitulo"
    );

const modalCorpo =
    document.getElementById(
        "modalCorpo"
    );

const fecharModal =
    document.getElementById(
        "fecharModal"
    );


// =====================================================
// PREENCHER CURSO
// =====================================================

document.getElementById(
    "tituloCurso"
).textContent =
    CURSO.nome;


document.getElementById(
    "descricaoCurso"
).textContent =
    CURSO.descricao;


// =====================================================
// USUÁRIO ATUAL
// =====================================================

let usuarioAtual = null;


// =====================================================
// VERIFICAR LOGIN
// =====================================================

onAuthStateChanged(
    auth,
    (usuario) => {

        if (!usuario) {

            window.location =
                "index.html";

            return;
        }

        usuarioAtual =
            usuario;

    }
);


// =====================================================
// ACESSAR CURSO
// =====================================================

btnEntrar.onclick =
    acessarCurso;


// =====================================================
// ENTER NO CAMPO DE SENHA
// =====================================================

senhaInput.addEventListener(
    "keydown",
    (event) => {

        if (
            event.key === "Enter"
        ) {

            acessarCurso();

        }

    }
);


// =====================================================
// VALIDAR SENHA NO SERVIDOR
// =====================================================

async function acessarCurso() {

    const senha =
        senhaInput.value.trim();


    if (!senha) {

        mostrarMensagem(
            "Digite a senha do curso.",
            "erro"
        );

        return;
    }


    if (!usuarioAtual) {

        mostrarMensagem(
            "Usuário não autenticado.",
            "erro"
        );

        return;
    }


    btnEntrar.disabled =
        true;

    btnEntrar.textContent =
        "Verificando...";


    try {

        const resposta =
            await fetch(
                `${API_URL}/usar-senha-curso`,
                {

                    method:
                        "POST",

                    headers: {

                        "Content-Type":
                            "application/json"

                    },

                    body:
                        JSON.stringify({

                            // Pedido do curso
                            pedidoId:
                                obterPedidoId(),

                            senha:
                                senha

                        })

                }
            );


        const dados =
            await resposta.json();


        console.log(
            "Resposta do servidor:",
            dados
        );


        if (!resposta.ok) {

            throw new Error(
                dados.erro ||
                "Erro no servidor."
            );

        }


        if (!dados.valido) {

            mostrarMensagem(
                dados.erro ||
                "Senha inválida.",
                "erro"
            );

            return;
        }


        // =================================================
        // SENHA VALIDADA
        // =================================================

        mostrarMensagem(
            "Acesso autorizado.",
            "sucesso"
        );


        // Pequeno intervalo visual
        await new Promise(
            resolve =>
                setTimeout(
                    resolve,
                    500
                )
        );


        liberarCurso();

    }
    catch (error) {

        console.error(
            "ERRO AO VALIDAR SENHA:",
            error
        );


        mostrarMensagem(
            error.message ||
            "Não foi possível validar a senha.",
            "erro"
        );

    }
    finally {

        btnEntrar.disabled =
            false;

        btnEntrar.textContent =
            "Acessar curso";

    }

}


// =====================================================
// OBTER PEDIDO
// =====================================================

function obterPedidoId() {

    const parametros =
        new URLSearchParams(
            window.location.search
        );


    const pedidoId =
        parametros.get(
            "pedidoId"
        );


    return pedidoId;

}


// =====================================================
// LIBERAR CURSO
// =====================================================

function liberarCurso() {

    telaSenha.style.display =
        "none";

    conteudoCurso.style.display =
        "block";


    carregarMateriais();

}


// =====================================================
// CARREGAR MATERIAIS
// =====================================================

function carregarMateriais() {

    listaMateriais.innerHTML =
        "";


    MATERIAIS.forEach(
        (material, indice) => {

            const card =
                document.createElement(
                    "article"
                );


            card.className =
                "material";


            const tipoTexto =
                material.tipo === "pdf"
                    ? "PDF"
                    : "Vídeo";


            card.innerHTML = `

                <div class="tipo">
                    ${tipoTexto}
                </div>

                <h3>
                    ${material.titulo}
                </h3>

                <p>
                    ${material.descricao}
                </p>

                <button
                    class="btn-material"
                    data-indice="${indice}"
                >
                    Abrir ${tipoTexto}
                </button>

            `;


            listaMateriais.appendChild(
                card
            );

        }
    );


    document
        .querySelectorAll(
            ".btn-material"
        )
        .forEach(
            (botao) => {

                botao.onclick =
                    () => {

                        const indice =
                            Number(
                                botao.dataset.indice
                            );


                        abrirMaterial(
                            MATERIAIS[indice]
                        );

                    };

            }
        );

}


// =====================================================
// ABRIR MATERIAL
// =====================================================

function abrirMaterial(
    material
) {

    modalTitulo.textContent =
        material.titulo;


    modalCorpo.innerHTML =
        "";


    // =================================================
    // PDF
    // =================================================

    if (
        material.tipo === "pdf"
    ) {

        const iframe =
            document.createElement(
                "iframe"
            );


        iframe.src =
            material.arquivo;


        iframe.title =
            material.titulo;


        modalCorpo.appendChild(
            iframe
        );

    }


    // =================================================
    // VÍDEO
    // =================================================

    else if (
        material.tipo === "video"
    ) {

        const video =
            document.createElement(
                "video"
            );


        video.controls =
            true;


        video.preload =
            "metadata";


        const source =
            document.createElement(
                "source"
            );


        source.src =
            material.arquivo;


        source.type =
            "video/mp4";


        video.appendChild(
            source
        );


        modalCorpo.appendChild(
            video
        );

    }


    modal.classList.add(
        "ativo"
    );

}


// =====================================================
// FECHAR MODAL
// =====================================================

fecharModal.onclick =
    fechar;


modal.onclick =
    (event) => {

        if (
            event.target === modal
        ) {

            fechar();

        }

    };


function fechar() {

    modal.classList.remove(
        "ativo"
    );


    // Para o vídeo quando fechar
    modalCorpo.innerHTML =
        "";

}


// =====================================================
// MENSAGEM
// =====================================================

function mostrarMensagem(
    texto,
    tipo
) {

    mensagem.textContent =
        texto;


    mensagem.className =
        "mensagem " + tipo;

}


// =====================================================
// SAIR
// =====================================================

document
    .getElementById(
        "btnSair"
    )
    .onclick =
    async () => {

        await signOut(auth);

        window.location =
            "index.html";

    };