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
    onValue
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-database.js";


// =====================================================
// AUTENTICAÇÃO
// =====================================================

onAuthStateChanged(auth, (usuario) => {

    if (!usuario) {

        window.location.href = "index.html";

        return;
    }

    console.log(
        "Usuário autenticado:",
        usuario.uid
    );

    carregarPerfil(usuario);
    carregarCursos(usuario.uid);
    carregarPagamentos(usuario.uid);

});


// =====================================================
// PERFIL
// =====================================================

function carregarPerfil(usuario) {

    const nomeElemento =
        document.getElementById("nome");

    const emailElemento =
        document.getElementById("email");


    // Dados do Authentication já podem ser
    // mostrados imediatamente.

    if (nomeElemento) {

        nomeElemento.textContent =
            usuario.displayName ||
            "Usuário";

    }

    if (emailElemento) {

        emailElemento.textContent =
            usuario.email ||
            "";

    }


    // Depois tenta obter dados adicionais
    // do Realtime Database.

    const usuarioRef =
        ref(
            db,
            "usuarios/" + usuario.uid
        );


    onValue(
        usuarioRef,

        (snapshot) => {

            const dados =
                snapshot.val() || {};


            if (nomeElemento) {

                nomeElemento.textContent =
                    dados.nome ||
                    usuario.displayName ||
                    "Usuário";

            }


            if (emailElemento) {

                emailElemento.textContent =
                    dados.email ||
                    usuario.email ||
                    "";

            }

        },

        (error) => {

            console.warn(
                "Não foi possível ler dados adicionais do perfil:",
                error
            );

            // Não interrompe o perfil.
            // Os dados do Authentication continuam sendo usados.

        }
    );

}


// =====================================================
// CURSOS
// =====================================================

function carregarCursos(uid) {

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
            uid +
            "/cursos"
        );


    onValue(
        cursosRef,

        (snapshot) => {

            tabela.innerHTML = "";


            const cursos =
                snapshot.val();


            if (!cursos) {

                tabela.innerHTML = `
                    <tr>
                        <td colspan="4">
                            Nenhum curso realizado
                        </td>
                    </tr>
                `;

                return;
            }


            let encontrou =
                false;


            Object.entries(cursos)
                .forEach(([id, curso]) => {

                    if (!curso) {
                        return;
                    }


                    encontrou = true;


                    const linha =
                        document.createElement("tr");


                    // =================================
                    // NOME
                    // =================================

                    const nome =
                        document.createElement("td");

                    nome.textContent =
                        curso.nome ||
                        curso.curso ||
                        "Curso";


                    // =================================
                    // STATUS
                    // =================================

                    const status =
                        document.createElement("td");

                    status.textContent =
                        curso.status ||
                        "Concluído";


                    // =================================
                    // CATEGORIA
                    // =================================

                    const categoria =
                        document.createElement("td");

                    categoria.textContent =
                        curso.categoria ||
                        "EAD";


                    // =================================
                    // ACESSO
                    // =================================

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
                            "Curso sem link";

                    }


                    linha.appendChild(nome);
                    linha.appendChild(status);
                    linha.appendChild(categoria);
                    linha.appendChild(acesso);


                    tabela.appendChild(linha);

                });


            if (!encontrou) {

                tabela.innerHTML = `
                    <tr>
                        <td colspan="4">
                            Nenhum curso realizado
                        </td>
                    </tr>
                `;

            }

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
// PAGAMENTOS
// =====================================================

function carregarPagamentos(uid) {

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
            uid +
            "/pagamentos"
        );


    onValue(
        pagamentosRef,

        (snapshot) => {

            tabela.innerHTML = "";


            const pagamentos =
                snapshot.val();


            if (!pagamentos) {

                tabela.innerHTML = `
                    <tr>
                        <td colspan="3">
                            Nenhum pagamento encontrado
                        </td>
                    </tr>
                `;

                return;
            }


            let encontrou =
                false;


            Object.entries(pagamentos)
                .forEach(([id, pagamento]) => {

                    if (!pagamento) {
                        return;
                    }


                    encontrou = true;


                    const linha =
                        document.createElement("tr");


                    // =================================
                    // CURSO
                    // =================================

                    const curso =
                        document.createElement("td");


                    curso.textContent =
                        pagamento.curso ||
                        "Curso";


                    // =================================
                    // VALOR
                    // =================================

                    const valor =
                        document.createElement("td");


                    const numero =
                        Number(
                            pagamento.valor ?? 0
                        );


                    valor.textContent =
                        Number.isFinite(numero)
                            ? `R$ ${numero
                                .toFixed(2)
                                .replace(".", ",")}`
                            : "R$ 0,00";


                    // =================================
                    // DATA
                    // =================================

                    const data =
                        document.createElement("td");


                    const dataPagamento =
                        pagamento.data ||
                        pagamento.dataPagamento ||
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


                    tabela.appendChild(linha);

                });


            if (!encontrou) {

                tabela.innerHTML = `
                    <tr>
                        <td colspan="3">
                            Nenhum pagamento encontrado
                        </td>
                    </tr>
                `;

            }

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