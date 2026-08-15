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
    get
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-database.js";


// =====================================================
// CONFIGURAÇÃO
// =====================================================

const API_URL =
    "https://plataforma-56gy.onrender.com";


// =====================================================
// CONFIGURAÇÃO DO CURSO
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
    document.getElementById("telaSenha");

const conteudoCurso =
    document.getElementById("conteudoCurso");

const senhaInput =
    document.getElementById("senhaCurso");

const btnEntrar =
    document.getElementById("btnEntrarCurso");

const mensagem =
    document.getElementById("mensagemSenha");

const listaMateriais =
    document.getElementById("listaMateriais");

const modal =
    document.getElementById("modal");

const modalTitulo =
    document.getElementById("modalTitulo");

const modalCorpo =
    document.getElementById("modalCorpo");

const fecharModal =
    document.getElementById("fecharModal");


// =====================================================
// PREENCHER CABEÇALHO
// =====================================================

const tituloCurso =
    document.getElementById("tituloCurso");

const descricaoCurso =
    document.getElementById("descricaoCurso");

if (tituloCurso) {

    tituloCurso.textContent =
        CURSO.nome;

}

if (descricaoCurso) {

    descricaoCurso.textContent =
        CURSO.descricao;

}


// =====================================================
// USUÁRIO
// =====================================================

let usuarioAtual = null;


// =====================================================
// PEDIDO DO CURSO
// =====================================================

let pedidoIdAtual = null;


// =====================================================
// LOGIN
// =====================================================

onAuthStateChanged(
    auth,
    async (usuario) => {

        if (!usuario) {

            console.log(
                "Usuário não autenticado."
            );

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


        // =================================================
        // LOCALIZAR PEDIDO
        // =================================================

        pedidoIdAtual =
            await localizarPedido();


        console.log(
            "Pedido do curso:",
            pedidoIdAtual
        );


        if (!pedidoIdAtual) {

            mostrarMensagem(
                "Você não possui este curso liberado.",
                "erro"
            );

            btnEntrar.disabled =
                true;

            return;
        }


        console.log(
            "Curso pronto para acesso."
        );

    }
);


// =====================================================
// LOCALIZAR PEDIDO
// =====================================================

async function localizarPedido() {

    try {

        // =================================================
        // 1. PRIMEIRO TENTA PEGAR DA URL
        // =================================================

        const parametros =
            new URLSearchParams(
                window.location.search
            );

        const pedidoDaURL =
            parametros.get("pedidoId");


        if (pedidoDaURL) {

            console.log(
                "Pedido encontrado na URL:",
                pedidoDaURL
            );

            return pedidoDaURL;

        }


        // =================================================
        // 2. PROCURA NO PERFIL DO USUÁRIO
        // =================================================

        if (!usuarioAtual) {

            return null;

        }


        const cursosRef =
            ref(
                db,
                "usuarios/" +
                usuarioAtual.uid +
                "/cursos"
            );


        const snapshot =
            await get(cursosRef);


        if (!snapshot.exists()) {

            console.log(
                "Usuário não possui cursos."
            );

            return null;

        }


        let pedidoEncontrado =
            null;


        snapshot.forEach(
            (item) => {

                const curso =
                    item.val();


                console.log(
                    "Curso encontrado:",
                    curso
                );


                // =================================================
                // COMPARAR PELO NOME DO CURSO
                // =================================================

                const nomeCurso =
                    curso.curso ||
                    curso.nome;


                if (
                    nomeCurso ===
                    CURSO.nome
                ) {

                    // Preferir somente cursos liberados
                    if (
                        curso.status === "Liberado" ||
                        curso.pago === true ||
                        !curso.status
                    ) {

                        pedidoEncontrado =
                            curso.pedidoId ||
                            item.key;

                    }

                }

            }
        );


        if (pedidoEncontrado) {

            console.log(
                "Pedido encontrado no Firebase:",
                pedidoEncontrado
            );

            return pedidoEncontrado;

        }


        return null;

    }
    catch (error) {

        console.error(
            "ERRO AO LOCALIZAR PEDIDO:",
            error
        );

        mostrarMensagem(
            "Não foi possível localizar seu curso.",
            "erro"
        );

        return null;

    }

}


// =====================================================
// ACESSAR CURSO
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
            "Usuário não autenticado.",
            "erro"
        );

        return;

    }


    // =================================================
    // GARANTIR PEDIDO
    // =================================================

    if (!pedidoIdAtual) {

        pedidoIdAtual =
            await localizarPedido();

    }


    if (!pedidoIdAtual) {

        mostrarMensagem(
            "Não foi possível localizar o pedido deste curso.",
            "erro"
        );

        return;

    }


    console.log(
        "Validando pedido:",
        pedidoIdAtual
    );


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

                            pedidoId:
                                pedidoIdAtual,

                            senha:
                                senha,

                            usuarioId:
                                usuarioAtual.uid

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


        // =================================================
        // SENHA INVÁLIDA
        // =================================================

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
            "Acesso autorizado.",
            "sucesso"
        );


        console.log(
            "Acessos restantes:",
            dados.usosRestantes
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

function abrirMaterial(material) {

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


        iframe.loading =
            "lazy";


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


        video.playsInline =
            true;


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
    .getElementById("btnSair")
    .onclick =
    async () => {

        await signOut(auth);

        window.location =
            "index.html";

    };