import {
    auth,
    db
} from "./firebase.js";

import {
    createUserWithEmailAndPassword,
    updateProfile
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";

import {
    ref,
    set
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-database.js";


// =====================================================
// BOTÃO
// =====================================================

const botao =
    document.getElementById("btn");


botao.onclick = async () => {

    // =================================================
    // CAMPOS
    // =================================================

    const nome =
        document
            .getElementById("nome")
            .value
            .trim();


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


    const pais =
        document
            .getElementById("pais")
            .value
            .trim();


    const estado =
        document
            .getElementById("estado")
            .value
            .trim();


    const endereco =
        document
            .getElementById("endereco")
            .value
            .trim();


    const complemento =
        document
            .getElementById("complemento")
            .value
            .trim();


    const telefone =
        document
            .getElementById("telefone")
            .value
            .trim();


    const cpf =
        document
            .getElementById("cpf")
            .value
            .trim();


    const identidade =
        document
            .getElementById("identidade")
            .value
            .trim();


    const dataNascimento =
        document
            .getElementById("dataNascimento")
            .value;


    // =================================================
    // VALIDAÇÃO
    // =================================================

    if (
        !nome ||
        !email ||
        !senha ||
        !pais ||
        !estado ||
        !endereco ||
        !complemento ||
        !telefone ||
        !cpf ||
        !identidade ||
        !dataNascimento
    ) {

        alert(
            "Preencha todos os campos."
        );

        return;
    }


    if (senha.length < 6) {

        alert(
            "A senha precisa ter pelo menos 6 caracteres."
        );

        return;
    }


    // =================================================
    // DESABILITAR BOTÃO
    // =================================================

    botao.disabled = true;

    botao.textContent =
        "Criando conta...";


    try {

        // =================================================
        // CRIAR USUÁRIO NO FIREBASE AUTH
        // =================================================

        const resultado =
            await createUserWithEmailAndPassword(
                auth,
                email,
                senha
            );


        const usuario =
            resultado.user;


        console.log(
            "Conta criada:",
            usuario.uid
        );


        // =================================================
        // NOME NO FIREBASE AUTH
        // =================================================

        await updateProfile(
            usuario,
            {
                displayName:
                    nome
            }
        );


        // =================================================
        // SALVAR PERFIL NO REALTIME DATABASE
        // =================================================

        await set(
            ref(
                db,
                "usuarios/" +
                usuario.uid
            ),
            {

                nome:
                    nome,

                email:
                    email,

                pais:
                    pais,

                estado:
                    estado,

                endereco:
                    endereco,

                complemento:
                    complemento,

                telefone:
                    telefone,

                cpf:
                    cpf,

                identidade:
                    identidade,

                dataNascimento:
                    dataNascimento,

                // =========================================
                // TODA CONTA CRIADA É USUÁRIO NORMAL
                // =========================================

                tipo:
                    "usuario",

                criadoEm:
                    new Date()
                        .toISOString()

            }
        );


        // =================================================
        // SUCESSO
        // =================================================

        alert(
            "Conta criada com sucesso."
        );


        window.location.href =
            "perfil.html";

    }
    catch (error) {

        console.error(
            "ERRO AO CRIAR CONTA:",
            error
        );


        // =================================================
        // E-MAIL JÁ EXISTE
        // =================================================

        if (
            error.code ===
            "auth/email-already-in-use"
        ) {

            alert(
                "Este e-mail já está cadastrado."
            );

        }


        // =================================================
        // E-MAIL INVÁLIDO
        // =================================================

        else if (
            error.code ===
            "auth/invalid-email"
        ) {

            alert(
                "E-mail inválido."
            );

        }


        // =================================================
        // SENHA FRACA
        // =================================================

        else if (
            error.code ===
            "auth/weak-password"
        ) {

            alert(
                "A senha precisa ter pelo menos 6 caracteres."
            );

        }


        // =================================================
        // OUTRO ERRO
        // =================================================

        else {

            alert(
                error.message ||
                "Não foi possível criar a conta."
            );

        }

    }
    finally {

        botao.disabled = false;

        botao.textContent =
            "Cadastrar";

    }

};