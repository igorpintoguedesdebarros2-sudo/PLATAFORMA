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
// Pode adicionar quantos materiais quiser.
//
// tipo:
// "pdf"
// "video"
//
// arquivo:
// Caminho relativo:
// "videos/aula1.mp4"
//
// ou URL completa:
// "https://site.com/video.mp4"
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

const tituloCurso =
    document.getElementById(
        "tituloCurso"
    );

const descricaoCurso =
    document.getElementById(
        "descricaoCurso"
    );

const btnSair =
    document.getElementById(
        "btnSair"
    );


// =====================================================
// VERIFICAR ELEMENTOS
// =====================================================

if (!telaSenha ||
    !conteudoCurso ||
    !senhaInput ||
    !btnEntrar ||
    !mensagem ||
    !listaMateriais ||
    !modal ||
    !modalTitulo ||
    !modalCorpo ||
    !fecharModal ||
    !tituloCurso ||
    !descricaoCurso ||
    !btnSair
) {

    console.error(
        "Erro: um ou mais elementos do HTML não foram encontrados."
    );

    throw new Error(
        "Estrutura HTML do curso incompleta."
    );

}


// =====================================================
// PREENCHER CURSO
// =====================================================

tituloCurso.textContent =
    CURSO.nome;

descricaoCurso.textContent =
    CURSO.descricao;


// =====================================================
// USUÁRIO ATUAL
// =====================================================

let usuarioAtual = null;


// =====================================================
// PEDIDO ATUAL
// =====================================================

const pedidoId =
    obterPedidoId();


// =====================================================
// VERIFICAR PEDIDO NA URL
// =====================================================

if (!pedidoId) {

    mostrarMensagem(
        "Pedido do curso não informado.",
        "erro"
    );

    btnEntrar.disabled = true;

    console.error(
        "URL sem pedidoId."
    );

}


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

        console.log(
            "Pedido do curso:",
            pedidoId
        );

    }
);


// =====================================================
// BOTÃO ACESSAR
// =====================================================

btnEntrar.onclick =
    acessarCurso;


// =====================================================
// ENTER NA SENHA
// =====================================================

senhaInput.addEventListener(
    "keydown",
    (event) => {

        if (
            event.key === "Enter"
        ) {

            event.preventDefault();

            acessarCurso();

        }

    }
);


// =====================================================
// ACESSAR CURSO
// =====================================================

async function acessarCurso() {

    const senha =
        senhaInput.value.trim();


    // -----------------------------------------
    // VERIFICAR PEDIDO
    // -----------------------------------------

    if (!pedidoId) {

        mostrarMensagem(
            "Pedido do curso não encontrado.",
            "erro"
        );

        return;

    }


    // -----------------------------------------
    // VERIFICAR SENHA
    // -----------------------------------------

    if (!senha) {

        mostrarMensagem(
            "Digite a senha do curso.",
            "erro"
        );

        senhaInput.focus();

        return;

    }


    // -----------------------------------------
    // VERIFICAR USUÁRIO
    // -----------------------------------------

    if (!usuarioAtual) {

        mostrarMensagem(
            "Usuário não autenticado.",
            "erro"
        );

        return;

    }


    // -----------------------------------------
    // BLOQUEAR BOTÃO
    // -----------------------------------------

    btnEntrar.disabled =
        true;

    const textoOriginal =
        btnEntrar.textContent;

    btnEntrar.textContent =
        "Verificando...";


    try {

        console.log(
            "======================================"
        );

        console.log(
            "VALIDANDO SENHA DO CURSO"
        );

        console.log(
            "Pedido:",
            pedidoId
        );

        console.log(
            "Usuário:",
            usuarioAtual.uid
        );

        console.log(
            "======================================"
        );


        // -----------------------------------------
        // ENVIAR PARA O BACKEND
        // -----------------------------------------

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
                                pedidoId,

                            senha:
                                senha

                        })

                }
            );


        // -----------------------------------------
        // LER RESPOSTA
        // -----------------------------------------

        let dados;

        try {

            dados =
                await resposta.json();

        }
        catch (erroJSON) {

            console.error(
                "Resposta do servidor não é JSON:",
                erroJSON
            );

            throw new Error(
                "O servidor retornou uma resposta inválida."
            );

        }


        console.log(
            "Resposta do servidor:",
            dados
        );


        // -----------------------------------------
        // ERRO HTTP
        // -----------------------------------------

        if (!resposta.ok) {

            throw new Error(
                dados.erro ||
                "Erro no servidor."
            );

        }


        // -----------------------------------------
        // SENHA INCORRETA / BLOQUEADA
        // -----------------------------------------

        if (!dados.valido) {

            mostrarMensagem(
                dados.erro ||
                "Senha inválida.",
                "erro"
            );

            senhaInput.select();

            return;

        }


        // -----------------------------------------
        // ACESSO AUTORIZADO
        // -----------------------------------------

        const usosRestantes =
            Number(
                dados.usosRestantes
            );


        if (
            Number.isFinite(
                usosRestantes
            )
        ) {

            if (
                usosRestantes > 0
            ) {

                mostrarMensagem(
                    `Acesso autorizado. Restam ${usosRestantes} uso(s) da senha.`,
                    "sucesso"
                );

            }
            else {

                mostrarMensagem(
                    "Acesso autorizado. Este foi o último uso da senha.",
                    "sucesso"
                );

            }

        }
        else {

            mostrarMensagem(
                "Acesso autorizado.",
                "sucesso"
            );

        }


        // -----------------------------------------
        // PEQUENO INTERVALO VISUAL
        // -----------------------------------------

        await new Promise(
            (resolve) =>
                setTimeout(
                    resolve,
                    500
                )
        );


        // -----------------------------------------
        // LIBERAR CURSO
        // -----------------------------------------

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
            textoOriginal;

    }

}


// =====================================================
// OBTER PEDIDO ID
// =====================================================

function obterPedidoId() {

    const parametros =
        new URLSearchParams(
            window.location.search
        );

    return parametros.get(
        "pedidoId"
    );

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


    if (
        !Array.isArray(
            MATERIAIS
        ) ||
        MATERIAIS.length === 0
    ) {

        listaMateriais.innerHTML = `

            <div class="sem-materiais">

                <h3>
                    Nenhum material disponível
                </h3>

                <p>
                    Os materiais deste curso ainda não foram adicionados.
                </p>

            </div>

        `;

        return;

    }


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


            const botao =
                document.createElement(
                    "button"
                );


            botao.className =
                "btn-material";


            botao.textContent =
                `Abrir ${tipoTexto}`;


            botao.dataset.indice =
                indice;


            card.innerHTML = `

                <div class="tipo">
                    ${tipoTexto}
                </div>

                <h3>
                    ${escaparHTML(
                        material.titulo
                    )}
                </h3>

                <p>
                    ${escaparHTML(
                        material.descricao
                    )}
                </p>

            `;


            card.appendChild(
                botao
            );


            listaMateriais.appendChild(
                card
            );


            botao.onclick =
                () => {

                    abrirMaterial(
                        material
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

    if (
        !material ||
        !material.tipo ||
        !material.arquivo
    ) {

        console.error(
            "Material inválido:",
            material
        );

        return;

    }


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


        iframe.setAttribute(
            "allowfullscreen",
            ""
        );


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


        video.setAttribute(
            "controlsList",
            "nodownload"
        );


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


    // =================================================
    // TIPO INVÁLIDO
    // =================================================

    else {

        modalCorpo.innerHTML = `

            <div class="erro-material">

                <h3>
                    Tipo de material inválido
                </h3>

                <p>
                    O tipo "${material.tipo}" não é suportado.
                </p>

            </div>

        `;

    }


    // =================================================
    // ABRIR MODAL
    // =================================================

    modal.classList.add(
        "ativo"
    );


    document.body.classList.add(
        "modal-aberto"
    );

}


// =====================================================
// FECHAR MODAL
// =====================================================

fecharModal.onclick =
    fecharModalCurso;


modal.onclick =
    (event) => {

        if (
            event.target === modal
        ) {

            fecharModalCurso();

        }

    };


document.addEventListener(
    "keydown",
    (event) => {

        if (
            event.key === "Escape" &&
            modal.classList.contains(
                "ativo"
            )
        ) {

            fecharModalCurso();

        }

    }
);


// =====================================================
// FECHAR MODAL
// =====================================================

function fecharModalCurso() {

    modal.classList.remove(
        "ativo"
    );


    document.body.classList.remove(
        "modal-aberto"
    );


    // Remove o vídeo/iframe.
    // Isso também interrompe o vídeo.

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
        "mensagem " +
        tipo;

}


// =====================================================
// ESCAPAR HTML
// =====================================================

function escaparHTML(
    texto
) {

    if (
        texto === null ||
        texto === undefined
    ) {

        return "";

    }


    const elemento =
        document.createElement(
            "div"
        );


    elemento.textContent =
        String(texto);


    return elemento.innerHTML;

}


// =====================================================
// SAIR
// =====================================================

btnSair.onclick =
    async () => {

        try {

            await signOut(
                auth
            );

        }
        catch (error) {

            console.error(
                "Erro ao sair:",
                error
            );

        }

        window.location =
            "index.html";

    };