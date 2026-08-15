import { auth } from "./firebase.js";

import {
    signInWithEmailAndPassword,
    GoogleAuthProvider,
    signInWithPopup
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";


// =====================================================
// E-MAILS AUTORIZADOS COMO ADMINISTRADORES
// =====================================================

const ADMIN_EMAILS = [

    "ipgbtechadm@gmail.com",

    "salustianocfaob@gmail.com",

    "admzulmircfao@gmail.com"

];


// =====================================================
// LOGIN ADMINISTRADOR
// =====================================================

document
    .getElementById("entrar")
    .onclick = async () => {

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
        // VALIDAR CAMPOS
        // =================================================

        if (!email || !senha) {

            alert(
                "Informe o e-mail e a senha."
            );

            return;
        }


        // =================================================
        // VERIFICAR SE É ADMIN
        // =================================================

        if (!ADMIN_EMAILS.includes(email)) {

            alert(
                "Este e-mail não possui acesso administrativo."
            );

            return;
        }


        // =================================================
        // LOGIN FIREBASE
        // =================================================

        try {

            const resultado =
                await signInWithEmailAndPassword(
                    auth,
                    email,
                    senha
                );


            const usuario =
                resultado.user;


            console.log(
                "Administrador conectado:",
                usuario.email
            );


            alert(
                "Administrador conectado."
            );


            // =================================================
            // IR PARA ADMIN
            // =================================================

            window.location.href =
                "admin.html";


        }
        catch (error) {

            console.error(
                "ERRO LOGIN ADMIN:",
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
                    "Administrador não cadastrado no Firebase."
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
            else {

                alert(
                    error.message
                );

            }

        }

    };


// =====================================================
// LOGIN GOOGLE
// =====================================================

document
    .getElementById("google")
    .onclick = async () => {

        const provider =
            new GoogleAuthProvider();


        try {

            const resultado =
                await signInWithPopup(
                    auth,
                    provider
                );


            const usuario =
                resultado.user;


            console.log(
                "Usuário Google:",
                usuario
            );


            // =================================================
            // IMPEDIR ADMIN DE USAR GOOGLE
            // =================================================

            const email =
                usuario.email
                    ?.trim()
                    .toLowerCase();


            if (
                ADMIN_EMAILS.includes(email)
            ) {

                alert(
                    "Administradores devem entrar utilizando e-mail e senha."
                );


                await auth.signOut();

                return;
            }


            // =================================================
            // USUÁRIO COMUM
            // =================================================

            alert(
                "Bem-vindo " +
                (
                    usuario.displayName ||
                    usuario.email
                )
            );


            window.location.href =
                "perfil.html";

        }
        catch (error) {

            console.error(
                "ERRO LOGIN GOOGLE:",
                error
            );


            alert(
                error.message
            );

        }

    };