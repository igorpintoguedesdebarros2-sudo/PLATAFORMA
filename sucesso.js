import { auth, db } from "./firebase.js";

import {
onAuthStateChanged
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";

import {
ref,
onValue,
set
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-database.js";

// =====================================================
// ELEMENTOS
// =====================================================

const statusPagamento =
document.getElementById("statusPagamento");

const cursosComprados =
document.getElementById("cursosComprados");

const areaPresencial =
document.getElementById("areaPresencial");

const dataCurso =
document.getElementById("dataCurso");

const horarioCurso =
document.getElementById("horarioCurso");

const botaoAgendar =
document.getElementById("agendarCurso");

// =====================================================
// STRIPE SESSION ID
// =====================================================

const parametros =
new URLSearchParams(window.location.search);

const sessionId =
parametros.get("session_id");

// =====================================================
// ESTADO
// =====================================================

let usuarioAtual = null;

let cursosPresenciais = [];

// =====================================================
// FUNÇÕES AUXILIARES
// =====================================================

function mostrarStatus(mensagem) {

```
if (statusPagamento) {
    statusPagamento.textContent = mensagem;
}
```

}

function limparCursos() {

```
if (cursosComprados) {
    cursosComprados.innerHTML = "";
}
```

}

function criarElemento(tag, texto = "") {

```
const elemento =
    document.createElement(tag);

if (texto) {
    elemento.textContent = texto;
}

return elemento;
```

}

// =====================================================
// GERAR SENHA ÚNICA
// =====================================================

function gerarSenhaUnica() {

```
const caracteres =
    "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789";

let senha = "";

for (let i = 0; i < 12; i++) {

    const indice =
        Math.floor(
            Math.random() *
            caracteres.length
        );

    senha += caracteres[indice];

}

return senha;
```

}

// =====================================================
// CRIAR CARD EAD
// =====================================================

async function criarCardEAD(curso, id) {

```
let senha =
    curso.senhaCurso;

if (!senha) {

    senha =
        gerarSenhaUnica();

    try {

        await set(
            ref(
                db,
                "solicitacoes_cursos/" +
                id +
                "/senhaCurso"
            ),
            senha
        );

    }
    catch (erro) {

        console.error(
            "Erro ao salvar senha:",
            erro
        );

    }

}


const card =
    criarElemento("div");

card.className =
    "curso-card";


const titulo =
    criarElemento(
        "h3",
        curso.curso
    );

card.appendChild(titulo);


const categoria =
    criarElemento(
        "p",
        "Categoria: EAD"
    );

card.appendChild(categoria);


const descricao =
    criarElemento(
        "p",
        curso.descricao ||
        "Curso adquirido na plataforma."
    );

card.appendChild(descricao);


const pagamento =
    criarElemento(
        "p",
        "Pagamento confirmado."
    );

card.appendChild(pagamento);


const senhaTitulo =
    criarElemento(
        "p"
    );

const senhaStrong =
    criarElemento(
        "strong",
        "Senha do curso: "
    );

const senhaCodigo =
    criarElemento(
        "code",
        senha
    );

senhaTitulo.appendChild(
    senhaStrong
);

senhaTitulo.appendChild(
    senhaCodigo
);

card.appendChild(
    senhaTitulo
);


const aviso =
    criarElemento(
        "p",
        "Guarde esta senha para acessar o curso."
    );

card.appendChild(aviso);


if (curso.linkCurso) {

    const link =
        document.createElement("a");

    link.href =
        curso.linkCurso;

    link.target =
        "_blank";

    link.rel =
        "noopener noreferrer";


    const botao =
        criarElemento(
            "button",
            "Acessar curso"
        );

    link.appendChild(botao);

    card.appendChild(link);

}
else {

    const semLink =
        criarElemento(
            "p",
            "O link do curso ainda não foi disponibilizado."
        );

    card.appendChild(
        semLink
    );

}


if (cursosComprados) {

    cursosComprados.appendChild(
        card
    );

}
```

}

// =====================================================
// CRIAR CARD PRESENCIAL
// =====================================================

function criarCardPresencial(curso, id) {

```
cursosPresenciais.push({
    id: id,
    curso: curso
});


const card =
    criarElemento("div");

card.className =
    "curso-card";


const titulo =
    criarElemento(
        "h3",
        curso.curso
    );

card.appendChild(titulo);


const categoria =
    criarElemento(
        "p",
        "Categoria: Presencial"
    );

card.appendChild(categoria);


const descricao =
    criarElemento(
        "p",
        curso.descricao ||
        "Curso presencial adquirido na plataforma."
    );

card.appendChild(descricao);


const pagamento =
    criarElemento(
        "p",
        "Pagamento confirmado."
    );

card.appendChild(pagamento);


const aviso =
    criarElemento(
        "p",
        "Escolha abaixo a data e o horário da aula."
    );

card.appendChild(aviso);


if (cursosComprados) {

    cursosComprados.appendChild(
        card
    );

}


if (areaPresencial) {

    areaPresencial.style.display =
        "block";

}
```

}

// =====================================================
// MOSTRAR CURSO
// =====================================================

async function mostrarCurso(curso, id) {

```
if (!curso) {
    return;
}


const categoria =
    String(
        curso.categoria ||
        "EAD"
    ).toLowerCase();


if (categoria === "ead") {

    await criarCardEAD(
        curso,
        id
    );

    return;

}


if (categoria === "presencial") {

    criarCardPresencial(
        curso,
        id
    );

}
```

}

// =====================================================
// PROCURAR PAGAMENTO
// =====================================================

function procurarPagamento() {

```
if (!sessionId) {

    mostrarStatus(
        "Não foi possível identificar o pagamento."
    );

    if (cursosComprados) {

        cursosComprados.innerHTML =
            "<p>Sessão de pagamento não encontrada.</p>";

    }

    return;

}


onValue(

    ref(
        db,
        "solicitacoes_cursos"
    ),

    async (snapshot) => {

        limparCursos();

        cursosPresenciais = [];

        let encontrou = false;


        for (
            const item
            of snapshot
        ) {

            const curso =
                item.val();

            const id =
                item.key;


            if (!curso) {
                continue;
            }


            if (
                curso.usuarioId !==
                usuarioAtual.uid
            ) {
                continue;
            }


            if (
                curso.pagamentoId !==
                sessionId
            ) {
                continue;
            }


            if (
                curso.status !==
                "liberado"
            ) {
                continue;
            }


            encontrou = true;


            await mostrarCurso(
                curso,
                id
            );

        }


        if (encontrou) {

            mostrarStatus(
                "Pagamento confirmado."
            );

        }
        else {

            mostrarStatus(
                "Pagamento recebido. Aguardando confirmação do servidor..."
            );


            if (cursosComprados) {

                const mensagem =
                    criarElemento(
                        "p",
                        "O pagamento está sendo processado."
                    );

                const mensagem2 =
                    criarElemento(
                        "p",
                        "Aguarde alguns segundos e atualize a página."
                    );

                cursosComprados.appendChild(
                    mensagem
                );

                cursosComprados.appendChild(
                    mensagem2
                );

            }

        }

    }

);
```

}

// =====================================================
// DATA MÍNIMA
// =====================================================

if (dataCurso) {

```
const hoje =
    new Date();


const ano =
    hoje.getFullYear();


const mes =
    String(
        hoje.getMonth() + 1
    ).padStart(
        2,
        "0"
    );


const dia =
    String(
        hoje.getDate()
    ).padStart(
        2,
        "0"
    );


dataCurso.min =
    ano + "-" +
    mes + "-" +
    dia;
```

}

// =====================================================
// AGENDAR CURSOS PRESENCIAIS
// =====================================================

if (botaoAgendar) {

```
botaoAgendar.onclick =
    async function () {

        if (
            cursosPresenciais.length === 0
        ) {

            alert(
                "Nenhum curso presencial encontrado."
            );

            return;

        }


        const data =
            dataCurso
            ? dataCurso.value
            : "";


        const horario =
            horarioCurso
            ? horarioCurso.value
            : "";


        if (!data) {

            alert(
                "Selecione uma data."
            );

            return;

        }


        if (!horario) {

            alert(
                "Selecione um horário."
            );

            return;

        }


        try {

            for (
                const item
                of cursosPresenciais
            ) {

                await set(

                    ref(
                        db,
                        "agendamentos/" +
                        item.id
                    ),

                    {

                        usuarioId:
                            usuarioAtual.uid,

                        pedidoId:
                            item.id,

                        curso:
                            item.curso.curso,

                        categoria:
                            "Presencial",

                        data:
                            data,

                        horario:
                            horario,

                        status:
                            "agendado",

                        criadoEm:
                            new Date()
                            .toISOString()

                    }

                );

            }


            mostrarStatus(
                "Pagamento confirmado e cursos presenciais agendados."
            );


            if (areaPresencial) {

                areaPresencial.innerHTML =
                    "";

                const titulo =
                    criarElemento(
                        "h2",
                        "Cursos agendados"
                    );

                areaPresencial.appendChild(
                    titulo
                );


                for (
                    const item
                    of cursosPresenciais
                ) {

                    const card =
                        criarElemento(
                            "div"
                        );

                    card.className =
                        "curso-card";


                    const nome =
                        criarElemento(
                            "h3",
                            item.curso.curso
                        );


                    const dataTexto =
                        criarElemento(
                            "p",
                            "Data: " + data
                        );


                    const horarioTexto =
                        criarElemento(
                            "p",
                            "Horário: " + horario
                        );


                    const status =
                        criarElemento(
                            "p",
                            "Status: Agendado"
                        );


                    card.appendChild(nome);

                    card.appendChild(
                        dataTexto
                    );

                    card.appendChild(
                        horarioTexto
                    );

                    card.appendChild(
                        status
                    );


                    areaPresencial.appendChild(
                        card
                    );

                }


                const aviso =
                    criarElemento(
                        "p",
                        "Os agendamentos foram salvos no sistema."
                    );


                areaPresencial.appendChild(
                    aviso
                );

            }

        }
        catch (erro) {

            console.error(
                "Erro ao agendar:",
                erro
            );

            alert(
                "Erro ao salvar o agendamento."
            );

        }

    };
```

}

// =====================================================
// INICIAR
// =====================================================

onAuthStateChanged(

```
auth,

function (usuario) {

    if (!usuario) {

        mostrarStatus(
            "Usuário não autenticado."
        );

        return;

    }


    usuarioAtual =
        usuario;


    procurarPagamento();

}
```

);
