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

});


// =====================================================
// PERFIL
// =====================================================

function carregarPerfil(usuario) {

    const nomeElemento =
        document.getElementById("nome");

    const emailElemento =
        document.getElementById("email");


    // =================================================
    // DADOS DO FIREBASE AUTH
    // =================================================

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


    // =================================================
    // DADOS ADICIONAIS DO REALTIME DATABASE
    // =================================================

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


            // =============================================
            // NOME
            // =============================================

            if (nomeElemento) {

                nomeElemento.textContent =
                    dados.nome ||
                    usuario.displayName ||
                    "Usuário";

            }


            // =============================================
            // EMAIL
            // =============================================

            if (emailElemento) {

                emailElemento.textContent =
                    dados.email ||
                    usuario.email ||
                    "";

            }

        },

        (error) => {

            console.warn(
                "Não foi possível carregar dados adicionais:",
                error
            );

            // O perfil continua funcionando
            // usando os dados do Authentication.

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

        }

    );

}


// =====================================================
// FINAL
// =====================================================

console.log(
    "perfil.js carregado corretamente."
);