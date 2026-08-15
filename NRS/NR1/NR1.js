import { auth } from "../../firebase.js";

import {
    onAuthStateChanged,
    signOut
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";

// =====================================================
// API
// =====================================================

const API_URL = "https://plataforma-56gy.onrender.com";

// =====================================================
// CURSO
// =====================================================

const CURSO = {
    nome: "NR1",
    descricao: "Curso NR1 - Segurança e Saúde no Trabalho."
};

// =====================================================
// MATERIAIS
// =====================================================

const MATERIAIS = [
    {
        tipo: "video",
        titulo: "Aula 1 - Introdução à NR1",
        descricao: "Introdução ao curso NR1.",
        arquivo: "videos/aula1.mp4"
    },

    {
        tipo: "pdf",
        titulo: "Material 1 - Introdução",
        descricao: "Material complementar da aula 1.",
        arquivo: "pdfs/material1.pdf"
    },

    {
        tipo: "video",
        titulo: "Aula 2 - NR1",
        descricao: "Conteúdo da NR1.",
        arquivo: "videos/aula2.mp4"
    },

    {
        tipo: "pdf",
        titulo: "Material 2 - NR1",
        descricao: "Apostila complementar.",
        arquivo: "pdfs/nr1.pdf"
    },

    {
        tipo: "video",
        titulo: "Aula 3 - Segurança do Trabalho",
        descricao: "Conceitos fundamentais.",
        arquivo: "videos/aula3.mp4"
    },

    {
        tipo: "pdf",
        titulo: "Material 3 - Segurança",
        descricao: "Material complementar.",
        arquivo: "pdfs/seguranca.pdf"
    }
];

// =====================================================
// ELEMENTOS
// =====================================================

const telaSenha = document.getElementById("telaSenha");
const conteudoCurso = document.getElementById("conteudoCurso");
const senhaInput = document.getElementById("senhaCurso");
const btnEntrar = document.getElementById("btnEntrarCurso");
const mensagem = document.getElementById("mensagemSenha");
const listaMateriais = document.getElementById("listaMateriais");

const modal = document.getElementById("modal");
const modalTitulo = document.getElementById("modalTitulo");
const modalCorpo = document.getElementById("modalCorpo");
const fecharModal = document.getElementById("fecharModal");

const btnSair = document.getElementById("btnSair");

const tituloCurso = document.getElementById("tituloCurso");
const descricaoCurso = document.getElementById("descricaoCurso");

// =====================================================
// DEBUG
// =====================================================

console.log("======================================");
console.log("INICIANDO NR1.JS");
console.log("======================================");

console.log("telaSenha:", !!telaSenha);
console.log("conteudoCurso:", !!conteudoCurso);
console.log("senhaInput:", !!senhaInput);
console.log("btnEntrar:", !!btnEntrar);
console.log("mensagem:", !!mensagem);
console.log("listaMateriais:", !!listaMateriais);
console.log("modal:", !!modal);
console.log("btnSair:", !!btnSair);

// =====================================================
// TÍTULO
// =====================================================

if (tituloCurso) {
    tituloCurso.textContent = CURSO.nome;
}

if (descricaoCurso) {
    descricaoCurso.textContent = CURSO.descricao;
}

// =====================================================
// USUÁRIO
// =====================================================

let usuarioAtual = null;

// =====================================================
// AUTENTICAÇÃO
// =====================================================

onAuthStateChanged(auth, (usuario) => {

    console.log(
        "Estado da autenticação:",
        usuario ? "AUTENTICADO" : "NÃO AUTENTICADO"
    );

    if (!usuario) {

        usuarioAtual = null;

        console.warn(
            "Usuário não autenticado. Redirecionando..."
        );

        window.location.href = "index.html";

        return;
    }

    usuarioAtual = usuario;

    console.log(
        "Usuário autenticado:",
        usuario.uid
    );

    console.log(
        "Email:",
        usuario.email || "não informado"
    );
});

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
// ENTER
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
// VALIDAR SENHA
// =====================================================

async function acessarCurso() {

    console.log("======================================");
    console.log("INICIANDO VALIDAÇÃO DA SENHA");

    const senha = senhaInput
        ? senhaInput.value.trim()
        : "";

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

        console.error(
            "Tentativa de acesso sem usuário autenticado."
        );

        return;
    }

    const usuarioId = usuarioAtual.uid;

    console.log(
        "UID enviado:",
        usuarioId
    );

    console.log(
        "Senha informada:",
        senha
    );

    if (btnEntrar) {

        btnEntrar.disabled = true;
        btnEntrar.textContent = "Verificando...";
    }

    mostrarMensagem(
        "Validando senha...",
        "info"
    );

    try {

        const resposta = await fetch(
            `${API_URL}/usar-senha-curso`,
            {
                method: "POST",

                headers: {
                    "Content-Type": "application/json"
                },

                body: JSON.stringify({
                    senha: senha,
                    usuarioId: usuarioId
                })
            }
        );

        console.log(
            "Status HTTP:",
            resposta.status
        );

        let dados;

        try {

            dados = await resposta.json();

        } catch (jsonError) {

            console.error(
                "Resposta não é JSON:",
                jsonError
            );

            throw new Error(
                `O servidor retornou uma resposta inválida. HTTP ${resposta.status}`
            );
        }

        console.log(
            "Resposta do servidor:",
            dados
        );

        if (!resposta.ok) {

            throw new Error(
                dados.erro ||
                dados.detalhe ||
                `Erro HTTP ${resposta.status}`
            );
        }

        // =================================================
        // SENHA INVÁLIDA
        // =================================================

        if (dados.valido !== true) {

            mostrarMensagem(
                dados.erro ||
                "Senha inválida ou inexistente.",
                "erro"
            );

            console.warn(
                "Acesso negado:",
                dados.erro
            );

            return;
        }

        // =================================================
        // VERIFICAR CURSO
        // =================================================

        if (
            dados.curso &&
            dados.curso.toUpperCase() !== CURSO.nome
        ) {

            console.error(
                "Senha pertence a outro curso:",
                dados.curso
            );

            mostrarMensagem(
                `Esta senha pertence ao curso "${dados.curso}" e não ao ${CURSO.nome}.`,
                "erro"
            );

            return;
        }

        // =================================================
        // ACESSO AUTORIZADO
        // =================================================

        console.log("======================================");
        console.log("ACESSO AUTORIZADO");
        console.log("Curso:", dados.curso);
        console.log("Pedido:", dados.pedidoId);
        console.log("Usuário:", dados.usuarioId);
        console.log("Usos restantes:", dados.usosRestantes);
        console.log("======================================");

        mostrarMensagem(
            `Acesso autorizado. Usos restantes: ${dados.usosRestantes}`,
            "sucesso"
        );

        // =================================================
        // SALVAR SESSÃO
        // =================================================

        const acessoCurso = {

            pedidoId: dados.pedidoId,

            usuarioId: dados.usuarioId,

            curso: dados.curso,

            categoria: dados.categoria,

            usosRestantes: dados.usosRestantes,

            autorizadoEm:
                new Date().toISOString()
        };

        sessionStorage.setItem(
            "curso_acesso",
            JSON.stringify(acessoCurso)
        );

        // =================================================
        // LIBERAR CURSO
        // =================================================

        await new Promise(
            resolve => setTimeout(resolve, 500)
        );

        liberarCurso();

    } catch (error) {

        console.error(
            "======================================"
        );

        console.error(
            "ERRO AO VALIDAR SENHA"
        );

        console.error(error);

        console.error(
            "======================================"
        );

        mostrarMensagem(
            error.message ||
            "Não foi possível validar a senha.",
            "erro"
        );

    } finally {

        if (btnEntrar) {

            btnEntrar.disabled = false;
            btnEntrar.textContent = "Acessar curso";
        }
    }
}

// =====================================================
// LIBERAR CURSO
// =====================================================

function liberarCurso() {

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

    telaSenha.style.display = "none";

    conteudoCurso.style.display = "block";

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

    listaMateriais.innerHTML = "";

    MATERIAIS.forEach(
        (material, indice) => {

            const card =
                document.createElement("article");

            card.className = "material";

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
                    type="button"
                    class="btn-material"
                    data-indice="${indice}"
                >
                    Abrir ${tipoTexto}
                </button>
            `;

            listaMateriais.appendChild(card);
        }
    );

    document
        .querySelectorAll(".btn-material")
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

                        abrirMaterial(material);
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

    modalTitulo.textContent =
        material.titulo;

    modalCorpo.innerHTML = "";

    // =================================================
    // PDF
    // =================================================

    if (material.tipo === "pdf") {

        const iframe =
            document.createElement("iframe");

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
            document.createElement("video");

        video.controls = true;

        video.preload = "metadata";

        video.playsInline = true;

        video.style.width = "100%";

        video.style.maxHeight = "70vh";

        const source =
            document.createElement("source");

        source.src =
            material.arquivo;

        source.type =
            "video/mp4";

        video.appendChild(source);

        modalCorpo.appendChild(video);
    }

    else {

        modalCorpo.textContent =
            "Tipo de material não suportado.";
    }

    modal.classList.add("ativo");
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

            if (event.target === modal) {

                fechar();
            }
        }
    );
}

function fechar() {

    if (!modal) {
        return;
    }

    modal.classList.remove("ativo");

    if (modalCorpo) {

        modalCorpo.innerHTML = "";
    }
}

// =====================================================
// ESC
// =====================================================

document.addEventListener(
    "keydown",
    (event) => {

        if (event.key === "Escape") {

            fechar();
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
            "Elemento #mensagemSenha não encontrado."
        );

        return;
    }

    mensagem.textContent =
        texto;

    mensagem.className =
        `mensagem ${tipo}`;
}

// =====================================================
// SAIR
// =====================================================

if (btnSair) {

    btnSair.addEventListener(
        "click",
        async () => {

            try {

                await signOut(auth);

            } catch (error) {

                console.error(
                    "Erro ao sair:",
                    error
                );
            }

            sessionStorage.removeItem(
                "curso_acesso"
            );

            window.location.href =
                "index.html";
        }
    );
}

// =====================================================
// FINAL
// =====================================================

console.log(
    "NR1.js carregado corretamente."
);