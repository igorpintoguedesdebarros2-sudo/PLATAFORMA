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
    get,
    onValue
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-database.js";


/* =====================================================
   AUTENTICAÇÃO
===================================================== */

onAuthStateChanged(auth, async (usuario) => {

    if (!usuario) {

        window.location.href = "index.html";

        return;
    }

    console.log("Usuário autenticado:", usuario.uid);

    try {

        const usuarioRef = ref(
            db,
            "usuarios/" + usuario.uid
        );

        const snapshot = await get(usuarioRef);

        if (snapshot.exists()) {

            const user = snapshot.val();

            document.getElementById("nome").textContent =
                user.nome ||
                usuario.displayName ||
                "Usuário";

            document.getElementById("email").textContent =
                user.email ||
                usuario.email ||
                "";

        } else {

            document.getElementById("nome").textContent =
                usuario.displayName ||
                "Usuário";

            document.getElementById("email").textContent =
                usuario.email ||
                "";

        }

        /*
         * IMPORTANTE:
         * Os pagamentos confirmados pelo servidor
         * ficam inicialmente em:
         *
         * solicitacoes_cursos/{pedidoId}
         *
         * Portanto carregamos diretamente essa coleção
         * e filtramos pelo UID do usuário.
         */

        carregarCursosEPagamentos(usuario.uid);

    }
    catch (error) {

        console.error(
            "Erro ao carregar perfil:",
            error
        );

    }

});


/* =====================================================
   CARREGAR CURSOS E PAGAMENTOS
===================================================== */

function carregarCursosEPagamentos(usuarioId) {

    const solicitacoesRef = ref(
        db,
        "solicitacoes_cursos"
    );

    onValue(
        solicitacoesRef,
        (snapshot) => {

            const dados = snapshot.val();

            console.log(
                "Dados de solicitacoes_cursos:",
                dados
            );

            const cursos = [];
            const pagamentos = [];

            if (dados) {

                Object.entries(dados)
                .forEach(([pedidoId, pedido]) => {

                    if (!pedido) {
                        return;
                    }

                    /*
                     * Só mostra pedidos do usuário
                     * atualmente autenticado.
                     */

                    if (
                        String(pedido.usuarioId) !==
                        String(usuarioId)
                    ) {

                        return;
                    }


                    /* =====================================
                       CURSO PAGO
                    ===================================== */

                    if (
                        pedido.pago === true
                    ) {

                        cursos.push({

                            pedidoId:
                                pedidoId,

                            nome:
                                pedido.curso ||
                                "Curso",

                            status:
                                pedido.status ||
                                "liberado",

                            categoria:
                                pedido.categoria ||
                                "",

                            linkCurso:
                                pedido.linkCurso ||
                                "",

                            senhaCurso:
                                pedido.senhaCurso ||
                                null,

                            usosRestantes:
                                pedido.usosRestantes ??
                                null

                        });


                        /* =================================
                           PAGAMENTO
                        ================================= */

                        pagamentos.push({

                            pedidoId:
                                pedidoId,

                            curso:
                                pedido.curso ||
                                "Curso",

                            valor:
                                pedido.valor ??
                                0,

                            data:
                                pedido.dataPagamento ||
                                ""

                        });

                    }

                });

            }


            /*
             * Mostrar na tela
             */

            carregarCursos(cursos);

            carregarPagamentos(pagamentos);

        },
        (error) => {

            console.error(
                "Erro ao carregar cursos/pagamentos:",
                error
            );

        }
    );

}


/* =====================================================
   CURSOS
===================================================== */

function carregarCursos(cursos) {

    const tabela =
        document.getElementById("cursos");

    if (!tabela) {

        console.warn(
            "Elemento #cursos não encontrado."
        );

        return;
    }

    tabela.innerHTML = "";


    if (
        !cursos ||
        cursos.length === 0
    ) {

        tabela.innerHTML = `
            <tr>
                <td colspan="4">
                    Nenhum curso realizado
                </td>
            </tr>
        `;

        return;
    }


    cursos.forEach((curso) => {

        const linha =
            document.createElement("tr");


        const nome =
            document.createElement("td");

        nome.textContent =
            curso.nome;


        const status =
            document.createElement("td");

        status.textContent =
            curso.status;


        const categoria =
            document.createElement("td");

        categoria.textContent =
            curso.categoria ||
            "-";


        const acesso =
            document.createElement("td");


        if (curso.linkCurso) {

            const link =
                document.createElement("a");

            link.href =
                curso.linkCurso;

            link.target =
                "_blank";

            link.rel =
                "noopener noreferrer";

            link.textContent =
                "Acessar curso";

            acesso.appendChild(link);

        }
        else {

            acesso.textContent =
                "Sem link";

        }


        linha.appendChild(nome);
        linha.appendChild(status);
        linha.appendChild(categoria);
        linha.appendChild(acesso);


        tabela.appendChild(linha);

    });

}


/* =====================================================
   PAGAMENTOS
===================================================== */

function carregarPagamentos(pagamentos) {

    const tabela =
        document.getElementById("pagamentos");

    if (!tabela) {

        console.warn(
            "Elemento #pagamentos não encontrado."
        );

        return;
    }

    tabela.innerHTML = "";


    if (
        !pagamentos ||
        pagamentos.length === 0
    ) {

        tabela.innerHTML = `
            <tr>
                <td colspan="3">
                    Nenhum pagamento encontrado
                </td>
            </tr>
        `;

        return;
    }


    pagamentos.forEach((pagamento) => {

        const linha =
            document.createElement("tr");


        const curso =
            document.createElement("td");

        curso.textContent =
            pagamento.curso;


        const valor =
            document.createElement("td");

        const valorNumerico =
            Number(pagamento.valor);


        valor.textContent =
            Number.isFinite(valorNumerico)
                ? `R$ ${valorNumerico.toFixed(2).replace(".", ",")}`
                : "R$ 0,00";


        const data =
            document.createElement("td");


        if (pagamento.data) {

            const dataObj =
                new Date(pagamento.data);


            if (!isNaN(dataObj.getTime())) {

                data.textContent =
                    dataObj.toLocaleString(
                        "pt-BR"
                    );

            }
            else {

                data.textContent =
                    pagamento.data;

            }

        }
        else {

            data.textContent =
                "-";

        }


        linha.appendChild(curso);
        linha.appendChild(valor);
        linha.appendChild(data);


        tabela.appendChild(linha);

    });

}


/* =====================================================
   SAIR
===================================================== */

const botaoSair =
    document.getElementById("sair");


if (botaoSair) {

    botaoSair.addEventListener(
        "click",
        async () => {

            try {

                await signOut(auth);

                window.location.href =
                    "index.html";

            }
            catch (error) {

                console.error(
                    "Erro ao sair:",
                    error
                );

            }

        }
    );

}