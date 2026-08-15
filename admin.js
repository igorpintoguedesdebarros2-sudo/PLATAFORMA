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
    set
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-database.js";


// =====================================================
// ADMINISTRADORES AUTORIZADOS
// =====================================================

const ADMIN_EMAILS = [

    "ipgbtechadm@gmail.com",

    "salustianocfaob@gmail.com",

    "admzulmircfao@gmail.com"

];


// =====================================================
// VERIFICAR ADMINISTRADOR
// =====================================================

onAuthStateChanged(
    auth,
    async (usuario) => {

        // =================================================
        // NÃO ESTÁ LOGADO
        // =================================================

        if (!usuario) {

            window.location.href =
                "index.html";

            return;
        }


        // =================================================
        // E-MAIL DO USUÁRIO
        // =================================================

        const email =
            usuario.email
                ?.trim()
                .toLowerCase();


        // =================================================
        // VERIFICAR E-MAIL ADMIN
        // =================================================

        if (
            !ADMIN_EMAILS.includes(email)
        ) {

            alert(
                "Acesso negado. Este usuário não é administrador."
            );

            await signOut(auth);

            window.location.href =
                "perfil.html";

            return;
        }


        // =================================================
        // REFERÊNCIA DO USUÁRIO
        // =================================================

        const adminRef =
            ref(
                db,
                "usuarios/" + usuario.uid
            );


        try {

            const adminDados =
                await get(adminRef);


            // =================================================
            // ADMIN JÁ EXISTE NO DATABASE
            // =================================================

            if (adminDados.exists()) {

                const perfil =
                    adminDados.val();


                // -----------------------------------------
                // GARANTIR TIPO ADMIN
                // -----------------------------------------

                if (
                    perfil.tipo !== "admin"
                ) {

                    await set(
                        adminRef,
                        {
                            ...perfil,

                            nome:
                                perfil.nome ||
                                usuario.displayName ||
                                email,

                            email:
                                email,

                            tipo:
                                "admin"
                        }
                    );

                }


                // -----------------------------------------
                // MOSTRAR DADOS
                // -----------------------------------------

                document
                    .getElementById("nome")
                    .textContent =
                    perfil.nome ||
                    usuario.displayName ||
                    email;


                document
                    .getElementById("email")
                    .textContent =
                    email;

            }


            // =================================================
            // ADMIN AINDA NÃO EXISTE
            // =================================================

            else {

                const novoAdministrador = {

                    uid:
                        usuario.uid,

                    nome:
                        usuario.displayName ||
                        email,

                    email:
                        email,

                    tipo:
                        "admin"

                };


                await set(
                    adminRef,
                    novoAdministrador
                );


                console.log(
                    "Administrador criado no Realtime Database:",
                    novoAdministrador
                );


                // -----------------------------------------
                // MOSTRAR DADOS
                // -----------------------------------------

                document
                    .getElementById("nome")
                    .textContent =
                    novoAdministrador.nome;


                document
                    .getElementById("email")
                    .textContent =
                    novoAdministrador.email;

            }


            // =================================================
            // CARREGAR USUÁRIOS
            // =================================================

            await carregarUsuarios();

        }
        catch (error) {

            console.error(
                "ERRO AO VERIFICAR ADMINISTRADOR:",
                error
            );


            alert(
                "Não foi possível verificar os dados do administrador.\n\n" +
                error.message
            );

        }

    }
);


// =====================================================
// CARREGAR USUÁRIOS
// =====================================================

async function carregarUsuarios() {

    try {

        const usuariosRef =
            ref(
                db,
                "usuarios"
            );


        const dados =
            await get(
                usuariosRef
            );


        const tabela =
            document.getElementById(
                "usuarios"
            );


        if (!tabela) {

            console.error(
                "Elemento #usuarios não encontrado."
            );

            return;
        }


        tabela.innerHTML = "";


        if (!dados.exists()) {

            tabela.innerHTML = `
                <tr>
                    <td colspan="3">
                        Nenhum usuário encontrado.
                    </td>
                </tr>
            `;

            return;
        }


        dados.forEach(
            (item) => {

                const usuario =
                    item.val();


                tabela.innerHTML += `

                    <tr>

                        <td>
                            ${usuario.nome || "Sem nome"}
                        </td>

                        <td>
                            ${usuario.email || "Sem email"}
                        </td>

                        <td>
                            ${usuario.tipo || "usuario"}
                        </td>

                    </tr>

                `;

            }
        );

    }
    catch (error) {

        console.error(
            "ERRO AO CARREGAR USUÁRIOS:",
            error
        );

    }

}


// =====================================================
// SAIR
// =====================================================

document
    .getElementById("sair")
    .onclick = async () => {

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

    };