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
// USUÁRIO
// =====================================================

let usuarioAtual = null;


// =====================================================
// ELEMENTOS
// =====================================================

const campoCursoId =
    document.getElementById(
        "cursoId"
    );


const botaoComprar =
    document.getElementById(
        "solicitar"
    );


const cursosLiberados =
    document.getElementById(
        "cursosLiberados"
    );


const botaoSair =
    document.getElementById(
        "sair"
    );


// =====================================================
// AUTENTICAÇÃO
// =====================================================

onAuthStateChanged(

    auth,

    async (usuario) => {

        if (!usuario) {

            window.location.href =
                "index.html";

            return;
        }


        usuarioAtual =
            usuario;


        console.log(
            "Usuário autenticado:",
            usuario.uid
        );


        await carregarCursos();

    }

);


// =====================================================
// CARREGAR CURSOS
// =====================================================

async function carregarCursos() {

    if (!usuarioAtual) {

        return;
    }


    if (!cursosLiberados) {

        return;
    }


    cursosLiberados.innerHTML = `

        <p>
            Carregando seus cursos...
        </p>

    `;


    try {

        const resposta =
            await fetch(

                API_URL +
                "/meus-cursos?usuarioId=" +
                encodeURIComponent(
                    usuarioAtual.uid
                )

            );


        const texto =
            await resposta.text();


        let dados;


        try {

            dados =
                JSON.parse(
                    texto
                );

        }
        catch {

            console.error(
                "Resposta inválida do servidor:",
                texto
            );

            cursosLiberados.innerHTML = `

                <p>
                    O servidor retornou uma resposta inválida.
                </p>

            `;

            return;
        }


        if (!resposta.ok) {

            console.error(
                "Erro ao carregar cursos:",
                dados
            );


            cursosLiberados.innerHTML = `

                <p>
                    ${
                        dados.erro ||
                        "Não foi possível carregar seus cursos."
                    }
                </p>

            `;

            return;
        }


        const cursos =
            Array.isArray(
                dados.cursos
            )
                ? dados.cursos
                : [];


        if (cursos.length === 0) {

            cursosLiberados.innerHTML = `

                <p>
                    Você ainda não possui cursos pagos.
                </p>

            `;

            return;
        }


        cursosLiberados.innerHTML = "";


        for (
            const curso
            of cursos
        ) {

            criarCardCurso(
                curso
            );

        }

    }
    catch (error) {

        console.error(
            "Erro carregando cursos:",
            error
        );


        cursosLiberados.innerHTML = `

            <p>
                Não foi possível carregar seus cursos.
            </p>

        `;

    }

}


// =====================================================
// ESCAPAR HTML
// =====================================================

function escaparHtml(
    valor
) {

    return String(
        valor ?? ""
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
// CRIAR CARD DO CURSO
// =====================================================

function criarCardCurso(
    curso
) {

    const nome =
        escaparHtml(
            curso.nome ||
            curso.curso ||
            "Curso"
        );


    const cursoId =
        escaparHtml(
            curso.cursoId ||
            curso.id ||
            ""
        );


    const descricao =
        escaparHtml(
            curso.descricao ||
            "Curso adquirido na plataforma."
        );


    const categoria =
        escaparHtml(
            curso.categoria ||
            "EAD"
        );


    const valor =
        Number(
            curso.valor || 0
        );


    const concluido =
        curso.cursoConcluido === true;


    const linkCurso =
        curso.linkCurso ||
        "";


    const card =
        document.createElement(
            "div"
        );


    card.className =
        "curso-card";


    if (concluido) {

        card.classList.add(
            "curso-concluido"
        );

    }


    let html = "";


    if (concluido) {

        html += `

            <div class="curso-status-concluido">

                ✓ CURSO CONCLUÍDO

            </div>

        `;

    }


    html += `

        <h3>
            ${nome}
        </h3>


        <p>

            <strong>
                ID:
            </strong>

            ${cursoId}

        </p>


        <p>

            <strong>
                Categoria:
            </strong>

            ${categoria}

        </p>


        <p>

            ${descricao}

        </p>


        <p>

            <strong>
                Pagamento:
            </strong>

            Confirmado

        </p>


        <p>

            <strong>
                Valor pago:
            </strong>

            R$
            ${valor
                .toFixed(2)
                .replace(".", ",")}

        </p>

    `;


    // =================================================
    // CURSO CONCLUÍDO
    // =================================================

    if (concluido) {

        html += `

            <p>

                Este curso já foi concluído.

            </p>

        `;

    }


    // =================================================
    // CURSO ATIVO
    // =================================================

    else {

        if (linkCurso) {

            const linkSeguro =
                escaparHtml(
                    linkCurso
                );


            html += `

                <p>

                    <a
                        href="${linkSeguro}"
                        target="_blank"
                        rel="noopener noreferrer"
                    >

                        <button
                            type="button"
                        >
                            Acessar Curso
                        </button>

                    </a>

                </p>

            `;

        }
        else {

            html += `

                <p>

                    O link deste curso ainda não
                    foi configurado na plataforma.

                </p>

            `;

        }


        // =============================================
        // CONCLUIR
        // =============================================

        html += `

            <button
                type="button"
                class="btn-concluir"
                data-pedido-id="${escaparHtml(
                    curso.pedidoId
                )}"
            >

                Concluir Curso

            </button>

        `;

    }


    card.innerHTML =
        html;


    cursosLiberados.appendChild(
        card
    );


    const botaoConcluir =
        card.querySelector(
            ".btn-concluir"
        );


    if (botaoConcluir) {

        botaoConcluir.addEventListener(

            "click",

            () => {

                const pedidoId =
                    botaoConcluir
                        .dataset
                        .pedidoId;


                concluirCurso(
                    pedidoId
                );

            }

        );

    }

}


// =====================================================
// COMPRAR CURSO
// =====================================================

if (botaoComprar) {

    botaoComprar.onclick =
        async () => {

            try {

                if (!usuarioAtual) {

                    alert(
                        "Usuário não autenticado."
                    );

                    return;
                }


                const cursoId =
                    String(
                        campoCursoId?.value ||
                        ""
                    ).trim();


                if (!cursoId) {

                    alert(
                        "Digite a ID do curso."
                    );

                    campoCursoId?.focus();

                    return;
                }


                // =========================================
                // DESABILITAR BOTÃO
                // =========================================

                botaoComprar.disabled =
                    true;


                const textoOriginal =
                    botaoComprar.textContent;


                botaoComprar.textContent =
                    "Verificando curso...";


                // =========================================
                // GERAR PEDIDO
                // =========================================

                const pedidoId =
                    gerarPedidoId();


                console.log(
                    "Curso solicitado:",
                    cursoId
                );


                console.log(
                    "Pedido:",
                    pedidoId
                );


                // =========================================
                // CHAMAR BACKEND
                // =========================================

                botaoComprar.textContent =
                    "Abrindo pagamento...";


                const resposta =
                    await fetch(

                        API_URL +
                        "/criar-pagamento",

                        {

                            method:
                                "POST",

                            headers: {

                                "Content-Type":
                                    "application/json"

                            },

                            body:
                                JSON.stringify({

                                    cursoId:
                                        cursoId,

                                    pedidoId:
                                        pedidoId,

                                    usuarioId:
                                        usuarioAtual.uid

                                })

                        }

                    );


                const texto =
                    await resposta.text();


                let dados;


                try {

                    dados =
                        JSON.parse(
                            texto
                        );

                }
                catch {

                    console.error(
                        "Resposta inválida:",
                        texto
                    );


                    throw new Error(
                        "O servidor retornou uma resposta inválida."
                    );

                }


                if (!resposta.ok) {

                    throw new Error(

                        dados.erro ||
                        "Não foi possível criar o pagamento."

                    );

                }


                console.log(
                    "Pagamento criado:",
                    dados
                );


                // =========================================
                // REDIRECIONAR PARA STRIPE
                // =========================================

                if (!dados.url) {

                    throw new Error(
                        "O Stripe não retornou a URL de pagamento."
                    );

                }


                window.location.href =
                    dados.url;

            }
            catch (error) {

                console.error(
                    "Erro ao comprar curso:",
                    error
                );


                alert(
                    error.message ||
                    "Erro ao iniciar pagamento."
                );


                botaoComprar.disabled =
                    false;


                botaoComprar.textContent =
                    "Comprar Curso";

            }

        };

}


// =====================================================
// GERAR ID DO PEDIDO
// =====================================================

function gerarPedidoId() {

    return (

        "pedido_" +

        Date.now() +

        "_" +

        Math.random()
            .toString(36)
            .substring(
                2,
                10
            )

    );

}

// =====================================================
// CONCLUIR CURSO
// =====================================================

async function concluirCurso(
    pedidoId
) {

    try {

        if (!usuarioAtual) {

            alert(
                "Usuário não autenticado."
            );

            return;
        }


        if (!pedidoId) {

            alert(
                "Pedido não informado."
            );

            return;
        }


        const confirmar =
            confirm(

                "Tem certeza que deseja concluir este curso?\n\n" +

                "Depois de concluído, o acesso ao curso será encerrado."

            );


        if (!confirmar) {

            return;
        }


        const resposta =
            await fetch(

                API_URL +
                "/concluir-curso",

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

                            usuarioId:
                                usuarioAtual.uid

                        })

                }

            );


        const texto =
            await resposta.text();


        let dados;


        try {

            dados =
                JSON.parse(
                    texto
                );

        }
        catch {

            console.error(
                "Resposta inválida:",
                texto
            );


            alert(
                "O servidor retornou uma resposta inválida."
            );

            return;
        }


        if (!resposta.ok) {

            alert(

                dados.erro ||
                "Não foi possível concluir o curso."

            );

            return;
        }


        alert(
            "Curso concluído com sucesso."
        );


        await carregarCursos();

    }
    catch (error) {

        console.error(
            "Erro ao concluir curso:",
            error
        );


        alert(
            "Erro ao concluir curso."
        );

    }

}


// =====================================================
// SAIR
// =====================================================

if (botaoSair) {

    botaoSair.onclick =
        async () => {

            try {

                await signOut(
                    auth
                );


                sessionStorage.removeItem(
                    "curso_acesso"
                );


                window.location.href =
                    "index.html";

            }
            catch (error) {

                console.error(
                    "Erro ao sair:",
                    error
                );

            }

        };

}


// =====================================================
// LIMPAR ID DEPOIS DE PAGAMENTO
// =====================================================

if (campoCursoId) {

    campoCursoId.addEventListener(

        "input",

        () => {

            campoCursoId.value =
                campoCursoId.value.trim();

        }

    );

}


// =====================================================
// ENTER PARA COMPRAR
// =====================================================

if (campoCursoId) {

    campoCursoId.addEventListener(

        "keydown",

        (evento) => {

            if (
                evento.key ===
                "Enter"
            ) {

                evento.preventDefault();


                if (botaoComprar) {

                    botaoComprar.click();

                }

            }

        }

    );

}


// =====================================================
// FINAL
// =====================================================

console.log(
    "pagamento.js carregado."
);

console.log(
    "Sistema de compra por ID ativado."
);