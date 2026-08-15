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


// =====================================================
// AUTENTICAÇÃO
// =====================================================

onAuthStateChanged(auth, async (usuario) => {

    if (!usuario) {

        window.location.href = "index.html";

        return;
    }

    console.log(
        "Usuário autenticado:",
        usuario.uid
    );

    try {

        // =================================================
        // DADOS DO USUÁRIO
        // =================================================

        const usuarioRef = ref(
            db,
            "usuarios/" + usuario.uid
        );

        const snapshot =
            await get(usuarioRef);

        if (snapshot.exists()) {

            const user =
                snapshot.val();

            const nome =
                document.getElementById("nome");

            const email =
                document.getElementById("email");

            if (nome) {

                nome.textContent =
                    user.nome ||
                    usuario.displayName ||
                    "Usuário";
            }

            if (email) {

                email.textContent =
                    user.email ||
                    usuario.email ||
                    "";
            }

        }
        else {

            const nome =
                document.getElementById("nome");

            const email =
                document.getElementById("email");

            if (nome) {

                nome.textContent =
                    usuario.displayName ||
                    "Usuário";
            }

            if (email) {

                email.textContent =
                    usuario.email ||
                    "";
            }
        }


        // =================================================
        // CARREGAR CURSOS
        // =================================================

        carregarCursos(
            usuario.uid
        );


        // =================================================
        // CARREGAR PAGAMENTOS
        // =================================================

        carregarPagamentos(
            usuario.uid
        );

    }
    catch (error) {

        console.error(
            "Erro ao carregar perfil:",
            error
        );

    }

});


// =====================================================
// CURSOS DO USUÁRIO
// =====================================================

function carregarCursos(usuarioId) {

    const tabela =
        document.getElementById("cursos");

    if (!tabela) {

        console.warn(
            "Elemento #cursos não encontrado."
        );

        return;
    }

    const cursosRef =
        ref(
            db,
            "usuarios/" +
            usuarioId +
            "/cursos"
        );

    onValue(
        cursosRef,

        (snapshot) => {

            tabela.innerHTML = "";

            const dados =
                snapshot.val();

            if (!dados) {

                tabela.innerHTML = `
                    <tr>
                        <td colspan="4">
                            Nenhum curso realizado
                        </td>
                    </tr>
                `;

                return;
            }


            const cursos =
                Object.entries(dados);


            cursos.forEach(
                ([pedidoId, curso]) => {

                    if (!curso) {
                        return;
                    }


                    const linha =
                        document.createElement("tr");


                    // =================================================
                    // NOME
                    // =================================================

                    const nome =
                        document.createElement("td");

                    nome.textContent =
                        curso.nome ||
                        curso.curso ||
                        "Curso";


                    // =================================================
                    // STATUS
                    // =================================================

                    const status =
                        document.createElement("td");

                    status.textContent =
                        curso.status ||
                        "Liberado";


                    // =================================================
                    // CATEGORIA
                    // =================================================

                    const categoria =
                        document.createElement("td");

                    categoria.textContent =
                        curso.categoria ||
                        "-";


                    // =================================================
                    // ACESSO
                    // =================================================

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

                        acesso.appendChild(
                            link
                        );

                    }
                    else {

                        acesso.textContent =
                            "Sem link disponível";

                    }


                    linha.appendChild(nome);

                    linha.appendChild(status);

                    linha.appendChild(categoria);

                    linha.appendChild(acesso);


                    tabela.appendChild(
                        linha
                    );

                }
            );

        },

        (error) => {

            console.error(
                "Erro ao carregar cursos:",
                error
            );

            tabela.innerHTML = `
                <tr>
                    <td colspan="4">
                        Não foi possível carregar os cursos.
                    </td>
                </tr>
            `;

        }
    );
}


// =====================================================
// PAGAMENTOS DO USUÁRIO
// =====================================================

function carregarPagamentos(usuarioId) {

    const tabela =
        document.getElementById("pagamentos");

    if (!tabela) {

        console.warn(
            "Elemento #pagamentos não encontrado."
        );

        return;
    }

    const pagamentosRef =
        ref(
            db,
            "usuarios/" +
            usuarioId +
            "/pagamentos"
        );

    onValue(
        pagamentosRef,

        (snapshot) => {

            tabela.innerHTML = "";

            const dados =
                snapshot.val();

            if (!dados) {

                tabela.innerHTML = `
                    <tr>
                        <td colspan="3">
                            Nenhum pagamento encontrado
                        </td>
                    </tr>
                `;

                return;
            }


            Object.entries(dados)
            .forEach(
                ([pedidoId, pagamento]) => {

                    if (!pagamento) {
                        return;
                    }


                    const linha =
                        document.createElement("tr");


                    // =================================================
                    // CURSO
                    // =================================================

                    const curso =
                        document.createElement("td");

                    curso.textContent =
                        pagamento.curso ||
                        pagamento.nome ||
                        "Curso";


                    // =================================================
                    // VALOR
                    // =================================================

                    const valor =
                        document.createElement("td");

                    const valorNumerico =
                        Number(
                            pagamento.valor || 0
                        );

                    valor.textContent =
                        Number.isFinite(
                            valorNumerico
                        )
                            ? `R$ ${valorNumerico
                                .toFixed(2)
                                .replace(".", ",")}`
                            : "R$ 0,00";


                    // =================================================
                    // DATA
                    // =================================================

                    const data =
                        document.createElement("td");

                    const dataPagamento =
                        pagamento.dataPagamento ||
                        pagamento.data ||
                        "";


                    if (dataPagamento) {

                        const dataObj =
                            new Date(
                                dataPagamento
                            );


                        if (
                            !isNaN(
                                dataObj.getTime()
                            )
                        ) {

                            data.textContent =
                                dataObj.toLocaleString(
                                    "pt-BR"
                                );

                        }
                        else {

                            data.textContent =
                                dataPagamento;

                        }

                    }
                    else {

                        data.textContent =
                            "-";

                    }


                    linha.appendChild(curso);

                    linha.appendChild(valor);

                    linha.appendChild(data);


                    tabela.appendChild(
                        linha
                    );

                }
            );

        },

        (error) => {

            console.error(
                "Erro ao carregar pagamentos:",
                error
            );

            tabela.innerHTML = `
                <tr>
                    <td colspan="3">
                        Não foi possível carregar os pagamentos.
                    </td>
                </tr>
            `;

        }
    );
}


// =====================================================
// SAIR
// =====================================================

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