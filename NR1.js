import {
    auth
} from "./firebase.js";

import {
    onAuthStateChanged,
    signOut
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";


// =====================================================
// API
// =====================================================

const API_URL =
    "https://plataforma-56gy.onrender.com";


// =====================================================
// CURSO
// =====================================================

const CURSO = {

    nome:
        "Curso Completo de Programação",

    descricao:
        "Aprenda programação do zero ao avançado."

};


// =====================================================
// MATERIAIS
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
            "Material complementar.",

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
// TÍTULO
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
// USUÁRIO
// =====================================================

let usuarioAtual = null;


// =====================================================
// AUTENTICAÇÃO
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


        console.log(
            "Usuário autenticado:",
            usuario.uid
        );

    }
);


// =====================================================
// BOTÃO
// =====================================================

btnEntrar.onclick =
    acessarCurso;


// =====================================================
// ENTER
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
// VALIDAR SENHA
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
            "Usuário ainda não foi autenticado.",
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
        // ACESSO AUTORIZADO
        // =================================================

        mostrarMensagem(

            `Acesso autorizado. Usos restantes: ${dados.usosRestantes}`,

            "sucesso"

        );


        // Guardar apenas informações de sessão.
        // A senha continua sendo controlada pelo servidor.

        sessionStorage.setItem(

            "curso_acesso",

            JSON.stringify({

                pedidoId:
                    dados.pedidoId,

                curso:
                    dados.curso,

                usosRestantes:
                    dados.usosRestantes

            })

        );


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
// MATERIAIS
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

function abrirMaterial(material) {

    modalTitulo.textContent =
        material.titulo;


    modalCorpo.innerHTML =
        "";


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


        iframe.style.width =
            "100%";

        iframe.style.height =
            "70vh";


        iframe.style.border =
            "none";


        modalCorpo.appendChild(
            iframe
        );

    }


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


        video.style.width =
            "100%";


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

        sessionStorage.removeItem(
            "curso_acesso"
        );

        window.location =
            "index.html";

    };