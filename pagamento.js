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
    onValue,
    get,
    set
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-database.js";


// =====================================================
// STRIPE
// =====================================================

const stripe = Stripe(
    "pk_test_51TE8ZZLs51eEGUV1zJcylus26Ox4xxRVL8iiCeMmGngVvnbnRoR2laAVPhHxldhn0jkKs8kjugG4woYDr93qJX6z00QMKrOCbX"
);


// =====================================================
// BACKEND
// =====================================================

const API_URL =
    "https://plataforma-56gy.onrender.com";


// =====================================================
// CURSOS DISPONÍVEIS
// =====================================================

const cursosDisponiveis = {

    "NR1": {
        categoria: "EAD",
        descricao:
            "Curso completo de NR1."
    },

    "CSS Completo": {
        categoria: "EAD",
        descricao:
            "Curso completo de CSS para criação de interfaces modernas."
    },

    "JavaScript": {
        categoria: "EAD",
        descricao:
            "Curso completo de JavaScript para desenvolvimento web."
    },

    "Python": {
        categoria: "EAD",
        descricao:
            "Curso completo de Python, programação e automação."
    },

    "Firebase": {
        categoria: "EAD",
        descricao:
            "Curso completo de Firebase e integração com aplicações."
    },

    "Python Presencial": {
        categoria: "Presencial",
        descricao:
            "Curso presencial de Python com aulas práticas."
    }

};


// =====================================================
// USUÁRIO ATUAL
// =====================================================

let usuarioAtual = null;


// =====================================================
// AUTENTICAÇÃO
// =====================================================

onAuthStateChanged(
    auth,
    (usuario) => {

        if (!usuario) {

            window.location.href =
                "index.html";

            return;
        }

        usuarioAtual = usuario;

        console.log(
            "Usuário autenticado:",
            usuario.uid
        );

        carregarCursosComprados();

    }
);


// =====================================================
// CARREGAR CURSOS COMPRADOS
// =====================================================

function carregarCursosComprados() {

    const cursosLiberados =
        document.getElementById(
            "cursosLiberados"
        );

    const solicitacoes =
        document.getElementById(
            "solicitacoes"
        );


    // =================================================
    // SOLICITAÇÕES
    // =================================================

    if (solicitacoes) {

        solicitacoes.innerHTML = `
            <p>
                Escolha um curso e realize o pagamento
                para obter acesso.
            </p>
        `;

    }


    if (!cursosLiberados) {

        console.error(
            "Elemento #cursosLiberados não encontrado."
        );

        return;
    }


    // =================================================
    // ESCUTAR CURSOS
    // =================================================

    onValue(

        ref(
            db,
            "solicitacoes_cursos"
        ),

        async (snapshot) => {

            cursosLiberados.innerHTML = "";

            let encontrou = false;


            // =================================================
            // PERCORRER CURSOS
            // =================================================

            for (
                const item of snapshot.val()
                    ? Object.entries(snapshot.val())
                    : []
            ) {

                const id =
                    item[0];

                const curso =
                    item[1];


                if (!curso) {
                    continue;
                }


                // =================================================
                // SOMENTE USUÁRIO LOGADO
                // =================================================

                if (
                    curso.usuarioId !==
                    usuarioAtual.uid
                ) {

                    continue;
                }


                // =================================================
                // SOMENTE PAGAMENTO CONFIRMADO
                // =================================================

                if (
                    curso.pago !== true
                ) {

                    continue;
                }


                encontrou = true;


                // =================================================
                // VERIFICAR CONCLUSÃO
                // =================================================

                const cursoConcluido =
                    await verificarCursoConcluido(id);


                // =================================================
                // DADOS DO CURSO
                // =================================================

                const dadosCurso =
                    cursosDisponiveis[
                        curso.curso
                    ];


                const categoria =
                    curso.categoria ||
                    dadosCurso?.categoria ||
                    "EAD";


                const descricao =
                    curso.descricao ||
                    dadosCurso?.descricao ||
                    "Curso adquirido na plataforma.";


                // =================================================
                // PRESENCIAL
                // =================================================

                if (
                    categoria.toLowerCase() ===
                    "presencial"
                ) {

                    cursosLiberados.innerHTML += `

                        <div
                            class="curso-card ${
                                cursoConcluido
                                    ? "curso-concluido"
                                    : ""
                            }"
                        >

                            ${
                                cursoConcluido
                                    ? `
                                        <div class="curso-status-concluido">
                                            ✓ CURSO CONCLUÍDO
                                        </div>
                                      `
                                    : ""
                            }

                            <h3>
                                ${curso.curso}
                            </h3>

                            <p>
                                <strong>
                                    Categoria:
                                </strong>
                                Presencial
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
                                ${Number(
                                    curso.valor || 0
                                )
                                    .toFixed(2)
                                    .replace(".", ",")}
                            </p>


                            ${
                                curso.agendamento
                                    ? `

                                        <div class="agendamento-info">

                                            <p>
                                                <strong>
                                                    Data:
                                                </strong>

                                                ${curso.agendamento.data}
                                            </p>

                                            <p>
                                                <strong>
                                                    Horário:
                                                </strong>

                                                ${curso.agendamento.horario}
                                            </p>

                                            <p>
                                                <strong>
                                                    Status:
                                                </strong>

                                                Agendado
                                            </p>

                                        </div>

                                    `
                                    : `

                                        <button
                                            type="button"
                                            onclick="abrirAgendamento('${id}')"
                                        >
                                            Agendar curso
                                        </button>

                                    `
                            }

                        </div>

                    `;

                    continue;
                }


                // =================================================
                // EAD
                // =================================================

                cursosLiberados.innerHTML += `

                    <div
                        class="curso-card ${
                            cursoConcluido
                                ? "curso-concluido"
                                : ""
                        }"
                    >

                        ${
                            cursoConcluido
                                ? `
                                    <div class="curso-status-concluido">
                                        ✓ CURSO CONCLUÍDO
                                    </div>
                                  `
                                : ""
                        }


                        <h3>
                            ${curso.curso}
                        </h3>


                        <p>
                            <strong>
                                Categoria:
                            </strong>

                            EAD
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
                            ${Number(
                                curso.valor || 0
                            )
                                .toFixed(2)
                                .replace(".", ",")}
                        </p>


                        ${
                            curso.senhaCurso
                                ? `

                                    <div class="senha-curso">

                                        <p>
                                            <strong>
                                                Senha do curso:
                                            </strong>
                                        </p>

                                        <code>
                                            ${curso.senhaCurso}
                                        </code>

                                        <p>
                                            Esta senha possui

                                            <strong>
                                                ${curso.usosRestantes ?? 0}
                                            </strong>

                                            utilização(ões)
                                            restante(s).
                                        </p>

                                    </div>

                                `
                                : ""
                        }


                        ${
                            curso.linkCurso
                                ? `

                                    <a
                                        href="${curso.linkCurso}"
                                        target="_blank"
                                        rel="noopener noreferrer"
                                    >

                                        <button
                                            type="button"
                                            ${
                                                cursoConcluido
                                                    ? "disabled"
                                                    : ""
                                            }
                                        >

                                            ${
                                                cursoConcluido
                                                    ? "Curso concluído"
                                                    : "Acessar Curso"
                                            }

                                        </button>

                                    </a>

                                `
                                : `

                                    <p>
                                        Link do curso
                                        ainda não configurado.
                                    </p>

                                `
                        }


                        ${
                            !cursoConcluido
                                ? `

                                    <button
                                        type="button"
                                        class="btn-concluir"
                                        onclick="concluirCurso('${id}')"
                                    >

                                        Concluir curso

                                    </button>

                                `
                                : ""
                        }

                    </div>

                `;

            }


            // =================================================
            // NENHUM CURSO
            // =================================================

            if (!encontrou) {

                cursosLiberados.innerHTML = `

                    <p>
                        Você ainda não possui cursos pagos.
                    </p>

                `;

            }

        }

    );

}


// =====================================================
// VERIFICAR CURSO CONCLUÍDO
// =====================================================

async function verificarCursoConcluido(
    pedidoId
) {

    if (!usuarioAtual) {

        return false;
    }


    try {

        const resultado =
            await get(

                ref(
                    db,

                    "usuarios/" +
                    usuarioAtual.uid +
                    "/cursos/" +
                    pedidoId
                )

            );


        if (!resultado.exists()) {

            return false;
        }


        const curso =
            resultado.val();


        return (
            curso &&
            (
                curso.concluido === true ||
                curso.status === "Concluído"
            )
        );

    }
    catch (error) {

        console.error(
            "Erro verificando conclusão:",
            error
        );

        return false;
    }

}


// =====================================================
// CONCLUIR CURSO
// =====================================================

window.concluirCurso =
    async (pedidoId) => {

        try {

            if (!usuarioAtual) {

                alert(
                    "Usuário não autenticado."
                );

                return;
            }


            // =================================================
            // PEGAR CURSO
            // =================================================

            const resultado =
                await get(

                    ref(
                        db,

                        "solicitacoes_cursos/" +
                        pedidoId
                    )

                );


            if (!resultado.exists()) {

                alert(
                    "Curso não encontrado."
                );

                return;
            }


            const curso =
                resultado.val();


            // =================================================
            // VERIFICAR DONO
            // =================================================

            if (
                curso.usuarioId !==
                usuarioAtual.uid
            ) {

                alert(
                    "Este curso pertence a outro usuário."
                );

                return;
            }


            // =================================================
            // VERIFICAR PAGAMENTO
            // =================================================

            if (
                curso.pago !== true
            ) {

                alert(
                    "O curso ainda não foi pago."
                );

                return;
            }


            // =================================================
            // SALVAR CONCLUSÃO
            // =================================================

            await set(

                ref(
                    db,

                    "usuarios/" +
                    usuarioAtual.uid +
                    "/cursos/" +
                    pedidoId
                ),

                {

                    nome:
                        curso.curso ||
                        "Curso",

                    curso:
                        curso.curso ||
                        "Curso",

                    categoria:
                        curso.categoria ||
                        "EAD",

                    pedidoId:
                        pedidoId,

                    usuarioId:
                        usuarioAtual.uid,

                    status:
                        "Concluído",

                    concluido:
                        true,

                    concluidoEm:
                        new Date().toISOString()

                }

            );


            console.log(
                "Curso concluído:",
                pedidoId
            );


            alert(
                "Curso concluído com sucesso."
            );


            // =================================================
            // RECARREGAR CARDS
            // =================================================

            carregarCursosComprados();

        }
        catch (error) {

            console.error(
                "Erro ao concluir curso:",
                error
            );

            alert(
                "Não foi possível concluir o curso."
            );

        }

    };


// =====================================================
// COMPRAR CURSO
// =====================================================

const botaoSolicitar =
    document.getElementById(
        "solicitar"
    );


if (botaoSolicitar) {

    botaoSolicitar.onclick =
        async () => {

            try {

                if (!usuarioAtual) {

                    alert(
                        "Usuário não autenticado."
                    );

                    return;
                }


                const select =
                    document.getElementById(
                        "curso"
                    );


                if (!select) {

                    alert(
                        "Campo de curso não encontrado."
                    );

                    return;
                }


                const curso =
                    select.value;


                if (!curso) {

                    alert(
                        "Selecione um curso."
                    );

                    return;
                }


                // =================================================
                // VALIDAR CURSO
                // =================================================

                if (
                    !cursosDisponiveis[curso]
                ) {

                    alert(
                        "Curso não cadastrado."
                    );

                    return;
                }


                // =================================================
                // GERAR PEDIDO
                // =================================================

                const pedidoId =
                    `pedido_${Date.now()}_${Math.random()
                        .toString(36)
                        .substring(2, 8)}`;


                botaoSolicitar.disabled =
                    true;


                const textoOriginal =
                    botaoSolicitar.textContent;


                botaoSolicitar.textContent =
                    "Abrindo pagamento...";


                // =================================================
                // CHAMAR BACKEND
                // =================================================

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

                                    curso:
                                        curso,

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
                        JSON.parse(texto);

                }
                catch (error) {

                    console.error(
                        "Resposta inválida:",
                        texto
                    );

                    alert(
                        "O servidor retornou uma resposta inválida."
                    );

                    botaoSolicitar.disabled =
                        false;

                    botaoSolicitar.textContent =
                        textoOriginal;

                    return;
                }


                if (!resposta.ok) {

                    console.error(
                        "Erro do servidor:",
                        dados
                    );

                    alert(
                        dados.erro ||
                        "Não foi possível iniciar o pagamento."
                    );

                    botaoSolicitar.disabled =
                        false;

                    botaoSolicitar.textContent =
                        textoOriginal;

                    return;
                }


                // =================================================
                // SESSION ID
                // =================================================

                if (!dados.id) {

                    console.error(
                        "Session ID não recebido:",
                        dados
                    );

                    alert(
                        "A sessão do Stripe não foi criada."
                    );

                    botaoSolicitar.disabled =
                        false;

                    botaoSolicitar.textContent =
                        textoOriginal;

                    return;
                }


                // =================================================
                // STRIPE
                // =================================================

                const checkout =
                    await stripe.redirectToCheckout({

                        sessionId:
                            dados.id

                    });


                if (
                    checkout &&
                    checkout.error
                ) {

                    console.error(
                        "Erro Stripe:",
                        checkout.error
                    );

                    alert(
                        checkout.error.message
                    );

                    botaoSolicitar.disabled =
                        false;

                    botaoSolicitar.textContent =
                        textoOriginal;

                }

            }
            catch (error) {

                console.error(
                    "Erro ao iniciar pagamento:",
                    error
                );

                alert(
                    "Erro ao iniciar pagamento."
                );

                botaoSolicitar.disabled =
                    false;

                botaoSolicitar.textContent =
                    "Solicitar Curso";

            }

        };

}


// =====================================================
// AGENDAR CURSO PRESENCIAL
// =====================================================

window.abrirAgendamento =
    async (id) => {

        try {

            if (!usuarioAtual) {

                alert(
                    "Usuário não autenticado."
                );

                return;
            }


            const resultado =
                await get(

                    ref(
                        db,

                        "solicitacoes_cursos/" +
                        id
                    )

                );


            if (!resultado.exists()) {

                alert(
                    "Curso não encontrado."
                );

                return;
            }


            const curso =
                resultado.val();


            if (
                curso.usuarioId !==
                usuarioAtual.uid
            ) {

                alert(
                    "Este curso pertence a outro usuário."
                );

                return;
            }


            if (
                curso.pago !== true
            ) {

                alert(
                    "O curso ainda não foi pago."
                );

                return;
            }


            const categoria =
                curso.categoria ||
                cursosDisponiveis[
                    curso.curso
                ]?.categoria;


            if (
                !categoria ||
                categoria.toLowerCase() !==
                "presencial"
            ) {

                alert(
                    "Este curso não é presencial."
                );

                return;
            }


            if (
                curso.agendamento
            ) {

                alert(
                    "Este curso já está agendado."
                );

                return;
            }


            const data =
                prompt(
                    "Digite a data do curso (DD/MM/AAAA):"
                );


            if (!data) {
                return;
            }


            const horario =
                prompt(
                    "Digite o horário (exemplo: 14:00):"
                );


            if (!horario) {
                return;
            }


            const resposta =
                await fetch(

                    API_URL +
                    "/agendar-curso",

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
                                    id,

                                usuarioId:
                                    usuarioAtual.uid,

                                data:
                                    data,

                                horario:
                                    horario

                            })

                    }

                );


            const dados =
                await resposta.json();


            if (!resposta.ok) {

                console.error(
                    "Erro agendamento:",
                    dados
                );

                alert(
                    dados.erro ||
                    "Não foi possível realizar o agendamento."
                );

                return;
            }


            alert(
                "Curso agendado com sucesso."
            );


            carregarCursosComprados();

        }
        catch (error) {

            console.error(
                "Erro ao agendar:",
                error
            );

            alert(
                "Não foi possível realizar o agendamento."
            );

        }

    };


// =====================================================
// SAIR
// =====================================================

const botaoSair =
    document.getElementById(
        "sair"
    );


if (botaoSair) {

    botaoSair.onclick =
        async () => {

            try {

                await signOut(auth);

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
// FINAL
// =====================================================

console.log(
    "pagamento.js carregado corretamente."
);