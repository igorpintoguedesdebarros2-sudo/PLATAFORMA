import { auth } from "../../firebase.js";

import {
    onAuthStateChanged,
    signOut
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";


// =====================================================
// CONFIGURAÇÃO DA API
// =====================================================

const API_URL =
    "https://plataforma-56gy.onrender.com";


// =====================================================
// CONFIGURAÇÃO DO CURSO
// =====================================================

const CURSO = {

    nome: "NR1",

    descricao:
        "Curso NR1 - Segurança e Saúde no Trabalho."

};


// =====================================================
// MATERIAIS DO CURSO
// =====================================================

const MATERIAIS = [

    {
        tipo: "video",

        titulo:
            "Aula 1 - Introdução à NR1",

        descricao:
            "Introdução ao curso NR1.",

        arquivo:
            "videos/aula1.mp4"
    },


    {
        tipo: "pdf",

        titulo:
            "Material 1 - Introdução",

        descricao:
            "Material complementar da aula 1.",

        arquivo:
            "pdfs/material1.pdf"
    },


    {
        tipo: "video",

        titulo:
            "Aula 2 - NR1",

        descricao:
            "Conteúdo da NR1.",

        arquivo:
            "videos/aula2.mp4"
    },


    {
        tipo: "pdf",

        titulo:
            "Material 2 - NR1",

        descricao:
            "Apostila complementar.",

        arquivo:
            "pdfs/nr1.pdf"
    },


    {
        tipo: "video",

        titulo:
            "Aula 3 - Segurança do Trabalho",

        descricao:
            "Conceitos fundamentais.",

        arquivo:
            "videos/aula3.mp4"
    },


    {
        tipo: "pdf",

        titulo:
            "Material 3 - Segurança",

        descricao:
            "Material complementar.",

        arquivo:
            "pdfs/seguranca.pdf"
    }

];


// =====================================================
// ELEMENTOS HTML
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


const btnSair =
    document.getElementById(
        "btnSair"
    );


const tituloCurso =
    document.getElementById(
        "tituloCurso"
    );


const descricaoCurso =
    document.getElementById(
        "descricaoCurso"
    );


// =====================================================
// DEBUG INICIAL
// =====================================================

console.log(
    "======================================"
);

console.log(
    "INICIANDO NR1.JS"
);

console.log(
    "======================================"
);

console.log(
    "API:",
    API_URL
);

console.log(
    "Curso:",
    CURSO.nome
);

console.log(
    "telaSenha:",
    !!telaSenha
);

console.log(
    "conteudoCurso:",
    !!conteudoCurso
);

console.log(
    "senhaInput:",
    !!senhaInput
);

console.log(
    "btnEntrar:",
    !!btnEntrar
);

console.log(
    "mensagem:",
    !!mensagem
);

console.log(
    "listaMateriais:",
    !!listaMateriais
);

console.log(
    "modal:",
    !!modal
);

console.log(
    "btnSair:",
    !!btnSair
);


// =====================================================
// CONFIGURAR TÍTULO DO CURSO
// =====================================================

if (tituloCurso) {

    tituloCurso.textContent =
        CURSO.nome;

}


if (descricaoCurso) {

    descricaoCurso.textContent =
        CURSO.descricao;

}


// =====================================================
// USUÁRIO ATUAL
// =====================================================

let usuarioAtual =
    null;


// =====================================================
// CONTROLE DA AUTENTICAÇÃO
// =====================================================

let autenticacaoPronta =
    false;


// =====================================================
// AUTENTICAÇÃO FIREBASE
// =====================================================

onAuthStateChanged(
    auth,
    (usuario) => {

        console.log(
            "======================================"
        );

        console.log(
            "ESTADO DA AUTENTICAÇÃO"
        );


        autenticacaoPronta =
            true;


        // =============================================
        // NÃO AUTENTICADO
        // =============================================

        if (!usuario) {

            usuarioAtual =
                null;

            console.warn(
                "Usuário não autenticado."
            );


            window.location.href =
                "index.html";


            return;
        }


        // =============================================
        // AUTENTICADO
        // =============================================

        usuarioAtual =
            usuario;


        console.log(
            "Usuário autenticado:"
        );


        console.log(
            "UID:",
            usuario.uid
        );


        console.log(
            "Email:",
            usuario.email ||
            "não informado"
        );


        console.log(
            "Nome:",
            usuario.displayName ||
            "não informado"
        );


        console.log(
            "======================================"
        );

    }
);


// =====================================================
// BOTÃO ENTRAR
// =====================================================

if (btnEntrar) {

    btnEntrar.addEventListener(
        "click",
        acessarCurso
    );

}


// =====================================================
// ENTER NO CAMPO DE SENHA
// =====================================================

if (senhaInput) {

    senhaInput.addEventListener(
        "keydown",
        (event) => {

            if (
                event.key ===
                "Enter"
            ) {

                event.preventDefault();

                acessarCurso();

            }

        }
    );

}


// =====================================================
// ACESSAR CURSO
// =====================================================

async function acessarCurso() {

    console.log(
        "======================================"
    );

    console.log(
        "INICIANDO ACESSO AO NR1"
    );

    console.log(
        "======================================"
    );


    // =================================================
    // VERIFICAR AUTENTICAÇÃO
    // =================================================

    if (!autenticacaoPronta) {

        mostrarMensagem(
            "Aguardando autenticação...",
            "info"
        );

        console.warn(
            "Firebase ainda não terminou de verificar a autenticação."
        );

        return;
    }


    if (!usuarioAtual) {

        mostrarMensagem(
            "Faça login antes de acessar o curso.",
            "erro"
        );

        console.warn(
            "Tentativa de acesso sem usuário."
        );

        return;
    }


    // =================================================
    // PEGAR SENHA
    // =================================================

    const senha =
        senhaInput
            ? senhaInput.value.trim()
            : "";


    // =================================================
    // VALIDAR SENHA VAZIA
    // =================================================

    if (!senha) {

        mostrarMensagem(
            "Digite a senha do curso.",
            "erro"
        );

        if (senhaInput) {

            senhaInput.focus();

        }

        return;
    }


    // =================================================
    // UID
    // =================================================

    const usuarioId =
        usuarioAtual.uid;


    console.log(
        "UID:",
        usuarioId
    );


    console.log(
        "Curso:",
        CURSO.nome
    );


    console.log(
        "Enviando senha para o servidor."
    );


    // =================================================
    // DESABILITAR BOTÃO
    // =================================================

    if (btnEntrar) {

        btnEntrar.disabled =
            true;

        btnEntrar.textContent =
            "Verificando...";

    }


    mostrarMensagem(
        "Validando acesso...",
        "info"
    );


    try {

        // =================================================
        // REQUISIÇÃO
        // =================================================

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
                                senha,

                            usuarioId:
                                usuarioId

                        })

                }
            );


        // =================================================
        // STATUS HTTP
        // =================================================

        console.log(
            "Status HTTP:",
            resposta.status
        );


        // =================================================
        // LER JSON
        // =================================================

        let dados =
            null;


        try {

            dados =
                await resposta.json();

        }
        catch (erroJSON) {

            console.error(
                "Resposta não é JSON:",
                erroJSON
            );


            throw new Error(
                `Servidor retornou resposta inválida. HTTP ${resposta.status}`
            );

        }


        // =================================================
        // MOSTRAR RESPOSTA
        // =================================================

        console.log(
            "Resposta do servidor:",
            dados
        );


        // =================================================
        // ERRO HTTP
        // =================================================

        if (!resposta.ok) {

            const erro =
                dados?.erro ||
                dados?.detalhe ||
                `Erro HTTP ${resposta.status}`;


            // =============================================
            // 401
            // =============================================

            if (
                resposta.status ===
                401
            ) {

                mostrarMensagem(
                    erro ||
                    "Senha inválida.",
                    "erro"
                );

                console.warn(
                    "401 - Senha inválida."
                );

                return;
            }


            // =============================================
            // 403
            // =============================================

            if (
                resposta.status ===
                403
            ) {

                mostrarMensagem(
                    erro ||
                    "Você não possui acesso a este curso.",
                    "erro"
                );

                console.warn(
                    "403 - Acesso negado."
                );

                return;
            }


            // =============================================
            // 404
            // =============================================

            if (
                resposta.status ===
                404
            ) {

                mostrarMensagem(
                    erro ||
                    "Curso ou pedido não encontrado.",
                    "erro"
                );

                console.warn(
                    "404 - Recurso não encontrado."
                );

                return;
            }


            // =============================================
            // 500
            // =============================================

            if (
                resposta.status >=
                500
            ) {

                mostrarMensagem(
                    "Erro no servidor. Tente novamente.",
                    "erro"
                );

                console.error(
                    "Erro interno:",
                    dados
                );

                return;
            }


            throw new Error(
                erro
            );

        }


        // =================================================
        // VERIFICAR RESPOSTA
        // =================================================

        if (
            dados?.valido !==
            true
        ) {

            mostrarMensagem(
                dados?.erro ||
                "Senha inválida ou inexistente.",
                "erro"
            );


            console.warn(
                "Acesso não autorizado:",
                dados
            );


            return;
        }


        // =================================================
        // VERIFICAR CURSO
        // =================================================

        const cursoServidor =
            String(
                dados.curso ||
                ""
            )
            .trim()
            .toUpperCase();


        const cursoEsperado =
            CURSO.nome
                .trim()
                .toUpperCase();


        if (
            cursoServidor &&
            cursoServidor !==
            cursoEsperado
        ) {

            console.error(
                "Curso incorreto:"
            );


            console.error(
                "Servidor:",
                cursoServidor
            );


            console.error(
                "Esperado:",
                cursoEsperado
            );


            mostrarMensagem(

                `Esta senha pertence ao curso "${dados.curso}" e não ao ${CURSO.nome}.`,

                "erro"

            );


            return;
        }


        // =================================================
        // VERIFICAR USUÁRIO
        // =================================================

        if (
            dados.usuarioId &&
            dados.usuarioId !==
            usuarioId
        ) {

            console.error(
                "Usuário retornado pelo servidor não corresponde ao usuário logado."
            );


            mostrarMensagem(
                "O acesso não pertence ao usuário conectado.",
                "erro"
            );


            return;
        }


        // =================================================
        // ACESSO AUTORIZADO
        // =================================================

        console.log(
            "======================================"
        );

        console.log(
            "ACESSO AO NR1 AUTORIZADO"
        );

        console.log(
            "Curso:",
            dados.curso
        );

        console.log(
            "Pedido:",
            dados.pedidoId
        );

        console.log(
            "Usuário:",
            dados.usuarioId
        );

        console.log(
            "Categoria:",
            dados.categoria
        );

        console.log(
            "Usos restantes:",
            dados.usosRestantes
        );

        console.log(
            "======================================"
        );


        // =================================================
        // MENSAGEM
        // =================================================

        mostrarMensagem(

            `Acesso autorizado. Usos restantes: ${dados.usosRestantes}`,

            "sucesso"

        );


        // =================================================
        // SALVAR SESSÃO
        // =================================================

        const acessoCurso = {

            pedidoId:
                dados.pedidoId ||
                null,

            usuarioId:
                dados.usuarioId ||
                usuarioId,

            curso:
                dados.curso ||
                CURSO.nome,

            categoria:
                dados.categoria ||
                "EAD",

            descricao:
                dados.descricao ||
                CURSO.descricao,

            linkCurso:
                dados.linkCurso ||
                "",

            usosRestantes:
                Number(
                    dados.usosRestantes
                ) || 0,

            autorizadoEm:
                new Date()
                    .toISOString()

        };


        sessionStorage.setItem(
            "curso_acesso",
            JSON.stringify(
                acessoCurso
            )
        );


        console.log(
            "Sessão do curso salva."
        );


        // =================================================
        // LIBERAR CURSO
        // =================================================

        await new Promise(
            (resolve) => {

                setTimeout(
                    resolve,
                    500
                );

            }
        );


        liberarCurso();

    }
    catch (error) {

        console.error(
            "======================================"
        );

        console.error(
            "ERRO AO VALIDAR ACESSO"
        );

        console.error(
            error
        );

        console.error(
            "======================================"
        );


        mostrarMensagem(

            error.message ||
            "Não foi possível validar o acesso.",

            "erro"

        );

    }
    finally {

        // =================================================
        // RESTAURAR BOTÃO
        // =================================================

        if (btnEntrar) {

            btnEntrar.disabled =
                false;

            btnEntrar.textContent =
                "Acessar curso";

        }

    }

}


// =====================================================
// LIBERAR CURSO
// =====================================================

function liberarCurso() {

    console.log(
        "Liberando conteúdo do NR1..."
    );


    if (!telaSenha) {

        console.error(
            "#telaSenha não encontrado."
        );

        return;
    }


    if (!conteudoCurso) {

        console.error(
            "#conteudoCurso não encontrado."
        );

        return;
    }


    // =================================================
    // ESCONDER TELA DA SENHA
    // =================================================

    telaSenha.style.display =
        "none";


    // =================================================
    // MOSTRAR CURSO
    // =================================================

    conteudoCurso.style.display =
        "block";


    // =================================================
    // CARREGAR MATERIAIS
    // =================================================

    carregarMateriais();

}


// =====================================================
// CARREGAR MATERIAIS
// =====================================================

function carregarMateriais() {

    if (!listaMateriais) {

        console.error(
            "#listaMateriais não encontrado."
        );

        return;
    }


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
                material.tipo ===
                "pdf"
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
                    type="button"
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


    // =================================================
    // EVENTOS DOS BOTÕES
    // =================================================

    document
        .querySelectorAll(
            ".btn-material"
        )
        .forEach(
            (botao) => {

                botao.addEventListener(
                    "click",
                    () => {

                        const indice =
                            Number(
                                botao.dataset.indice
                            );


                        const material =
                            MATERIAIS[
                                indice
                            ];


                        if (!material) {

                            console.error(
                                "Material não encontrado:",
                                indice
                            );

                            return;
                        }


                        abrirMaterial(
                            material
                        );

                    }
                );

            }
        );

}


// =====================================================
// ABRIR MATERIAL
// =====================================================

function abrirMaterial(
    material
) {

    if (!modal) {

        console.error(
            "#modal não encontrado."
        );

        return;
    }


    if (!modalTitulo) {

        console.error(
            "#modalTitulo não encontrado."
        );

        return;
    }


    if (!modalCorpo) {

        console.error(
            "#modalCorpo não encontrado."
        );

        return;
    }


    // =================================================
    // TÍTULO
    // =================================================

    modalTitulo.textContent =
        material.titulo;


    // =================================================
    // LIMPAR MODAL
    // =================================================

    modalCorpo.innerHTML =
        "";


    // =================================================
    // PDF
    // =================================================

    if (
        material.tipo ===
        "pdf"
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


        iframe.setAttribute(
            "loading",
            "lazy"
        );


        modalCorpo.appendChild(
            iframe
        );

    }


    // =================================================
    // VÍDEO
    // =================================================

    else if (
        material.tipo ===
        "video"
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


        video.style.width =
            "100%";


        video.style.maxHeight =
            "70vh";


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

        modalCorpo.textContent =
            "Tipo de material não suportado.";

    }


    // =================================================
    // ABRIR MODAL
    // =================================================

    modal.classList.add(
        "ativo"
    );

}


// =====================================================
// FECHAR MODAL
// =====================================================

if (fecharModal) {

    fecharModal.addEventListener(
        "click",
        fechar
    );

}


if (modal) {

    modal.addEventListener(
        "click",
        (event) => {

            if (
                event.target ===
                modal
            ) {

                fechar();

            }

        }
    );

}


function fechar() {

    if (!modal) {

        return;
    }


    modal.classList.remove(
        "ativo"
    );


    if (modalCorpo) {

        modalCorpo.innerHTML =
            "";

    }

}


// =====================================================
// TECLA ESC
// =====================================================

document.addEventListener(
    "keydown",
    (event) => {

        if (
            event.key ===
            "Escape"
        ) {

            fechar();

        }

    }
);


// =====================================================
// MOSTRAR MENSAGEM
// =====================================================

function mostrarMensagem(
    texto,
    tipo
) {

    if (!mensagem) {

        console.warn(
            "#mensagemSenha não encontrado."
        );

        return;
    }


    mensagem.textContent =
        texto;


    mensagem.className =
        `mensagem ${tipo}`;

}


// =====================================================
// BOTÃO SAIR
// =====================================================

if (btnSair) {

    btnSair.addEventListener(
        "click",
        async () => {

            console.log(
                "Saindo da conta..."
            );


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


            // =============================================
            // LIMPAR SESSÃO DO CURSO
            // =============================================

            sessionStorage.removeItem(
                "curso_acesso"
            );


            // =============================================
            // VOLTAR PARA LOGIN
            // =============================================

            window.location.href =
                "index.html";

        }
    );

}


// =====================================================
// FINAL
// =====================================================

console.log(
    "======================================"
);

console.log(
    "NR1.JS CARREGADO CORRETAMENTE"
);

console.log(
    "Curso:",
    CURSO.nome
);

console.log(
    "API:",
    API_URL
);

console.log(
    "======================================"
);