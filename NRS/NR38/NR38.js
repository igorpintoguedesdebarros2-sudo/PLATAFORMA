import { auth } from "../../firebase.js";

import {
    onAuthStateChanged,
    signOut
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";


// =====================================================
// CONFIGURAÇÃO DA API
// =====================================================

const API_URL = "https://plataforma-56gy.onrender.com";


// =====================================================
// CONFIGURAÇÃO DO CURSO
// =====================================================

const CURSO = {
    nome: "NR38",
    descricao: "Curso NR38 - LIMPEZA URBANA."
};


// =====================================================
// ELEMENTOS HTML
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

const btnSair =
    document.getElementById("btnSair");

const tituloCurso =
    document.getElementById("tituloCurso");

const descricaoCurso =
    document.getElementById("descricaoCurso");


// =====================================================
// ESTADO
// =====================================================

let usuarioAtual = null;

let autenticacaoPronta = false;

let cursoAutorizado = null;


// =====================================================
// DEBUG INICIAL
// =====================================================

console.log("======================================");
console.log("INICIANDO NR1.JS");
console.log("======================================");

console.log("API:", API_URL);
console.log("Curso:", CURSO.nome);

console.log("telaSenha:", !!telaSenha);
console.log("conteudoCurso:", !!conteudoCurso);
console.log("senhaInput:", !!senhaInput);
console.log("btnEntrar:", !!btnEntrar);
console.log("mensagem:", !!mensagem);
console.log("listaMateriais:", !!listaMateriais);
console.log("modal:", !!modal);
console.log("btnSair:", !!btnSair);


// =====================================================
// CONFIGURAR TÍTULO
// =====================================================

if (tituloCurso) {
    tituloCurso.textContent = CURSO.nome;
}

if (descricaoCurso) {
    descricaoCurso.textContent = CURSO.descricao;
}


// =====================================================
// AUTENTICAÇÃO FIREBASE
// =====================================================

onAuthStateChanged(
    auth,
    (usuario) => {

        console.log("======================================");
        console.log("ESTADO DA AUTENTICAÇÃO");

        autenticacaoPronta = true;


        // ---------------------------------------------
        // NÃO AUTENTICADO
        // ---------------------------------------------

        if (!usuario) {

            usuarioAtual = null;

            console.warn(
                "Usuário não autenticado."
            );

            window.location.href = "index.html";

            return;
        }


        // ---------------------------------------------
        // USUÁRIO AUTENTICADO
        // ---------------------------------------------

        usuarioAtual = usuario;

        console.log(
            "Usuário autenticado."
        );

        console.log(
            "UID:",
            usuario.uid
        );

        console.log(
            "Email:",
            usuario.email || "não informado"
        );

        console.log(
            "Nome:",
            usuario.displayName || "não informado"
        );

        console.log("======================================");

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
// ENTER NA SENHA
// =====================================================

if (senhaInput) {

    senhaInput.addEventListener(
        "keydown",
        (event) => {

            if (event.key === "Enter") {

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

    console.log("======================================");
    console.log("INICIANDO ACESSO AO CURSO");
    console.log("======================================");


    // =================================================
    // VERIFICAR AUTENTICAÇÃO
    // =================================================

    if (!autenticacaoPronta) {

        mostrarMensagem(
            "Aguardando autenticação...",
            "info"
        );

        return;
    }


    if (!usuarioAtual) {

        mostrarMensagem(
            "Faça login antes de acessar o curso.",
            "erro"
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
        "Usuário:",
        usuarioId
    );

    console.log(
        "Curso:",
        CURSO.nome
    );


    // =================================================
    // DESABILITAR BOTÃO
    // =================================================

    if (btnEntrar) {

        btnEntrar.disabled = true;

        btnEntrar.textContent =
            "Verificando...";

    }


    mostrarMensagem(
        "Validando acesso...",
        "info"
    );


    try {

        // =================================================
        // URL DA API
        // =================================================

        const url =
            `${API_URL}/usar-senha-curso`;

        console.log(
            "Enviando requisição para:",
            url
        );


        // =================================================
        // REQUISIÇÃO
        // =================================================

        const resposta =
            await fetch(
                url,
                {
                    method: "POST",

                    headers: {
                        "Content-Type":
                            "application/json"
                    },

                    body: JSON.stringify({

                        senha: senha,

                        usuarioId: usuarioId,

                        curso: CURSO.nome

                    })
                }
            );


        console.log(
            "HTTP:",
            resposta.status
        );


        // =================================================
        // TENTAR LER RESPOSTA
        // =================================================

        const texto =
            await resposta.text();


        console.log(
            "Resposta bruta:",
            texto
        );


        let dados = null;


        if (texto) {

            try {

                dados =
                    JSON.parse(texto);

            }
            catch (erro) {

                console.error(
                    "Servidor não retornou JSON:",
                    erro
                );

            }

        }


        console.log(
            "Resposta JSON:",
            dados
        );


        // =================================================
        // ROTA NÃO EXISTE
        // =================================================

        if (resposta.status === 404) {

            console.error(
                "A rota /usar-senha-curso não existe no backend."
            );

            mostrarMensagem(
                "O servidor não possui a rota de validação da senha do curso.",
                "erro"
            );

            return;
        }


        // =================================================
        // NÃO AUTORIZADO
        // =================================================

        if (
            resposta.status === 401 ||
            resposta.status === 403
        ) {

            mostrarMensagem(
                dados?.erro ||
                "Acesso não autorizado.",
                "erro"
            );

            return;
        }


        // =================================================
        // ERRO DO SERVIDOR
        // =================================================

        if (resposta.status >= 500) {

            console.error(
                "Erro interno:",
                dados
            );

            mostrarMensagem(
                "Erro interno no servidor. Tente novamente.",
                "erro"
            );

            return;
        }


        // =================================================
        // OUTROS ERROS HTTP
        // =================================================

        if (!resposta.ok) {

            mostrarMensagem(
                dados?.erro ||
                `Erro HTTP ${resposta.status}.`,
                "erro"
            );

            return;
        }


        // =================================================
        // VERIFICAR RESPOSTA
        // =================================================

        if (!dados) {

            mostrarMensagem(
                "O servidor não retornou uma resposta válida.",
                "erro"
            );

            return;
        }


        // =================================================
        // VERIFICAR AUTORIZAÇÃO
        // =================================================

        if (dados.valido !== true) {

            mostrarMensagem(
                dados.erro ||
                "Senha inválida.",
                "erro"
            );

            return;
        }


        // =================================================
        // VERIFICAR CURSO
        // =================================================

        const cursoServidor =
            String(
                dados.curso || ""
            )
                .trim()
                .toUpperCase();


        const cursoEsperado =
            CURSO.nome
                .trim()
                .toUpperCase();


        if (
            cursoServidor &&
            cursoServidor !== cursoEsperado
        ) {

            console.error(
                "Curso incorreto."
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
            dados.usuarioId !== usuarioId
        ) {

            console.error(
                "Usuário inválido."
            );


            mostrarMensagem(
                "O acesso não pertence ao usuário conectado.",
                "erro"
            );

            return;
        }


        // =================================================
        // SALVAR DADOS AUTORIZADOS
        // =================================================

        cursoAutorizado = {

            pedidoId:
                dados.pedidoId || null,

            usuarioId:
                dados.usuarioId || usuarioId,

            curso:
                dados.curso || CURSO.nome,

            categoria:
                dados.categoria || "EAD",

            descricao:
                dados.descricao || CURSO.descricao,

            linkCurso:
                dados.linkCurso || "",

            usosRestantes:
                Number(
                    dados.usosRestantes
                ) || 0,

            autorizadoEm:
                dados.autorizadoEm ||
                new Date().toISOString()

        };


        // =================================================
        // LOG
        // =================================================

        console.log("======================================");
        console.log("ACESSO AUTORIZADO");
        console.log("======================================");

        console.log(
            "Curso:",
            cursoAutorizado.curso
        );

        console.log(
            "Pedido:",
            cursoAutorizado.pedidoId
        );

        console.log(
            "Usuário:",
            cursoAutorizado.usuarioId
        );

        console.log(
            "Categoria:",
            cursoAutorizado.categoria
        );

        console.log(
            "Usos restantes:",
            cursoAutorizado.usosRestantes
        );

        console.log(
            "Link:",
            cursoAutorizado.linkCurso
        );


        // =================================================
        // MENSAGEM
        // =================================================

        mostrarMensagem(
            `Acesso autorizado. Usos restantes: ${cursoAutorizado.usosRestantes}`,
            "sucesso"
        );


        // =================================================
        // SALVAR SESSÃO
        // =================================================

        sessionStorage.setItem(
            "curso_acesso",
            JSON.stringify(cursoAutorizado)
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

        console.error("======================================");
        console.error("ERRO AO VALIDAR ACESSO");
        console.error(error);
        console.error("======================================");


        // ---------------------------------------------
        // ERRO DE REDE
        // ---------------------------------------------

        if (
            error instanceof TypeError
        ) {

            mostrarMensagem(
                "Não foi possível conectar ao servidor.",
                "erro"
            );

        }
        else {

            mostrarMensagem(
                error.message ||
                "Não foi possível validar o acesso.",
                "erro"
            );

        }

    }
    finally {

        // =================================================
        // RESTAURAR BOTÃO
        // =================================================

        if (btnEntrar) {

            btnEntrar.disabled = false;

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
        "Liberando conteúdo..."
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
    // ESCONDER SENHA
    // =================================================

    telaSenha.style.display =
        "none";


    // =================================================
    // MOSTRAR CURSO
    // =================================================

    conteudoCurso.style.display =
        "block";


    // =================================================
    // TÍTULO
    // =================================================

    if (
        tituloCurso &&
        cursoAutorizado
    ) {

        tituloCurso.textContent =
            cursoAutorizado.curso;

    }


    // =================================================
    // DESCRIÇÃO
    // =================================================

    if (
        descricaoCurso &&
        cursoAutorizado
    ) {

        descricaoCurso.textContent =
            cursoAutorizado.descricao;

    }


    // =================================================
    // MATERIAIS
    // =================================================

    carregarMateriais();

}


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
// CARREGAR MATERIAIS
// =====================================================

function carregarMateriais() {

    if (!listaMateriais) {

        console.error(
            "#listaMateriais não encontrado."
        );

        return;
    }


    listaMateriais.innerHTML = "";


    if (
        !Array.isArray(MATERIAIS) ||
        MATERIAIS.length === 0
    ) {

        listaMateriais.innerHTML = `
            <p>Nenhum material disponível.</p>
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

    listaMateriais
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
                            MATERIAIS[indice];


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

function abrirMaterial(material) {

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
    // LIMPAR
    // =================================================

    modalCorpo.innerHTML = "";


    // =================================================
    // PDF
    // =================================================

    if (material.tipo === "pdf") {

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

    else if (material.tipo === "video") {

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
        fecharModalCurso
    );

}


if (modal) {

    modal.addEventListener(
        "click",
        (event) => {

            if (
                event.target === modal
            ) {

                fecharModalCurso();

            }

        }
    );

}


// =====================================================
// FUNÇÃO FECHAR MODAL
// =====================================================

function fecharModalCurso() {

    if (!modal) {
        return;
    }


    modal.classList.remove(
        "ativo"
    );


    if (modalCorpo) {

        const video =
            modalCorpo.querySelector(
                "video"
            );


        if (video) {

            video.pause();

            video.currentTime = 0;

        }


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

        if (event.key === "Escape") {

            fecharModalCurso();

        }

    }
);


// =====================================================
// MENSAGEM
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

                await signOut(auth);

            }
            catch (error) {

                console.error(
                    "Erro ao sair:",
                    error
                );

            }


            // =================================================
            // LIMPAR SESSÃO
            // =================================================

            sessionStorage.removeItem(
                "curso_acesso"
            );


            // =================================================
            // LIMPAR VARIÁVEIS
            // =================================================

            cursoAutorizado =
                null;

            usuarioAtual =
                null;


            // =================================================
            // VOLTAR PARA LOGIN
            // =================================================

            window.location.href =
                "index.html";

        }
    );

}


// =====================================================
// ESCAPAR HTML
// =====================================================

function escaparHTML(texto) {

    return String(
        texto || ""
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
// VERIFICAR SESSÃO LOCAL
// =====================================================

function verificarSessaoLocal() {

    try {

        const dados =
            sessionStorage.getItem(
                "curso_acesso"
            );


        if (!dados) {
            return null;
        }


        const sessao =
            JSON.parse(
                dados
            );


        if (
            !sessao ||
            !sessao.usuarioId
        ) {

            sessionStorage.removeItem(
                "curso_acesso"
            );

            return null;
        }


        // =================================================
        // VERIFICAR USUÁRIO
        // =================================================

        if (
            usuarioAtual &&
            sessao.usuarioId !==
            usuarioAtual.uid
        ) {

            sessionStorage.removeItem(
                "curso_acesso"
            );

            return null;
        }


        return sessao;

    }
    catch (error) {

        console.error(
            "Erro ao recuperar sessão:",
            error
        );


        sessionStorage.removeItem(
            "curso_acesso"
        );


        return null;

    }

}


// =====================================================
// FINAL
// =====================================================

console.log("======================================");
console.log("NR1.JS CARREGADO CORRETAMENTE");
console.log("Curso:", CURSO.nome);
console.log("API:", API_URL);
console.log("Endpoint:", `${API_URL}/usar-senha-curso`);
console.log("======================================");