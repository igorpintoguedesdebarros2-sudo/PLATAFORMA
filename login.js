import {
    auth,
    db
} from "./firebase.js";

import {
    signInWithEmailAndPassword
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";

import {
    ref,
    get
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-database.js";


// =====================================================
// LOGIN
// =====================================================

const botaoEntrar =
    document.getElementById("entrar");


botaoEntrar.onclick = async () => {

    const email =
        document
            .getElementById("email")
            .value
            .trim()
            .toLowerCase();


    const senha =
        document
            .getElementById("senha")
            .value;


    // =================================================
    // VALIDAR
    // =================================================

    if (!email || !senha) {

        alert(
            "Informe o e-mail e a senha."
        );

        return;
    }


    botaoEntrar.disabled = true;

    botaoEntrar.textContent =
        "Entrando...";


    try {

        // =================================================
        // LOGIN FIREBASE
        // =================================================

        const resultado =
            await signInWithEmailAndPassword(
                auth,
                email,
                senha
            );


        const usuario =
            resultado.user;


        console.log(
            "Usuário autenticado:",
            usuario.uid
        );


        // =================================================
        // BUSCAR PERFIL NO REALTIME DATABASE
        // =================================================

        const usuarioRef =
            ref(
                db,
                "usuarios/" +
                usuario.uid
            );


        const snapshot =
            await get(usuarioRef);


        // =================================================
        // PERFIL NÃO EXISTE
        // =================================================

        if (!snapshot.exists()) {

            alert(
                "Conta autenticada, mas o perfil não foi encontrado."
            );

            await auth.signOut();

            return;
        }


        const dados =
            snapshot.val() || {};


        const tipo =
            String(
                dados.tipo ||
                "usuario"
            )
                .trim()
                .toLowerCase();


        console.log(
            "Tipo de usuário:",
            tipo
        );


        // =================================================
        // ADMIN
        // =================================================

        if (
            tipo === "admin" ||
            tipo === "administrador"
        ) {

            alert(
                "Administrador conectado."
            );


            window.location.href =
                "admin.html";


            return;
        }


        // =================================================
        // USUÁRIO NORMAL
        // =================================================

        alert(
            "Login realizado com sucesso."
        );


        window.location.href =
            "perfil.html";

    }
    catch (error) {

        console.error(
            "ERRO LOGIN:",
            error
        );


        if (
            error.code ===
            "auth/invalid-credential"
        ) {

            alert(
                "E-mail ou senha incorretos."
            );

        }
        else if (
            error.code ===
            "auth/user-not-found"
        ) {

            alert(
                "Usuário não encontrado."
            );

        }
        else if (
            error.code ===
            "auth/wrong-password"
        ) {

            alert(
                "Senha incorreta."
            );

        }
        else if (
            error.code ===
            "auth/too-many-requests"
        ) {

            alert(
                "Muitas tentativas. Aguarde alguns minutos."
            );

        }
        else {

            alert(
                error.message ||
                "Não foi possível realizar o login."
            );

        }

    }
    finally {

        botaoEntrar.disabled = false;

        botaoEntrar.textContent =
            "Entrar";

    }

};