import {
    auth,
    db
}
from "./firebase.js";



import {
    onAuthStateChanged,
    signOut
}
from
"https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";



import {
    ref,
    get
}
from
"https://www.gstatic.com/firebasejs/10.7.1/firebase-database.js";





onAuthStateChanged(
    auth,
    async(usuario)=>{


        if(!usuario){


            window.location = "index.html";


            return;


        }



        const adminRef =
        ref(
            db,
            "usuarios/" + usuario.uid
        );



        const adminDados =
        await get(adminRef);



        if(adminDados.exists()){


            const perfil =
            adminDados.val();



            if(perfil.tipo !== "admin"){


                alert("Acesso negado");


                window.location = "perfil.html";


                return;


            }



            document
            .getElementById("nome")
            .innerHTML =
            perfil.nome;



            document
            .getElementById("email")
            .innerHTML =
            perfil.email;



        }
        else{


            alert("Administrador não encontrado");


            window.location="index.html";


            return;


        }



        carregarUsuarios();


    }
);







async function carregarUsuarios(){


    const usuariosRef =
    ref(
        db,
        "usuarios"
    );



    const dados =
    await get(usuariosRef);



    const tabela =
    document.getElementById("usuarios");



    tabela.innerHTML = "";



    dados.forEach((item)=>{


        const usuario =
        item.val();



        tabela.innerHTML += `

        <tr>

            <td>${usuario.nome || "Sem nome"}</td>

            <td>${usuario.email || "Sem email"}</td>

            <td>${usuario.tipo || "usuario"}</td>

        </tr>

        `;


    });



}







document
.getElementById("sair")
.onclick = ()=>{


    signOut(auth);


    window.location="index.html";


};