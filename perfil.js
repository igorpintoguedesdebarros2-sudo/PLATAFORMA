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



        const usuarioRef =
        ref(
            db,
            "usuarios/" + usuario.uid
        );



        const dados =
        await get(usuarioRef);



        if(dados.exists()){


            const user =
            dados.val();



            document
            .getElementById("nome")
            .innerHTML =
            user.nome || usuario.displayName;



            document
            .getElementById("email")
            .innerHTML =
            user.email || usuario.email;



            carregarCursos(user.cursos);



            carregarPagamentos(user.pagamentos);



        }
        else{


            document
            .getElementById("nome")
            .innerHTML =
            usuario.displayName || "Usuário";



            document
            .getElementById("email")
            .innerHTML =
            usuario.email;



        }



    }
);







function carregarCursos(cursos){


    const tabela =
    document.getElementById("cursos");



    if(!tabela) return;



    tabela.innerHTML = "";



    if(!cursos){


        tabela.innerHTML =
        "<tr><td>Nenhum curso realizado</td></tr>";


        return;


    }



    Object.values(cursos)
    .forEach((curso)=>{


        tabela.innerHTML += `

        <tr>

        <td>${curso.nome}</td>

        <td>${curso.status}</td>

        </tr>

        `;


    });


}







function carregarPagamentos(pagamentos){


    const tabela =
    document.getElementById("pagamentos");



    if(!tabela) return;



    tabela.innerHTML = "";



    if(!pagamentos){


        tabela.innerHTML =
        "<tr><td>Nenhum pagamento encontrado</td></tr>";


        return;


    }



    Object.values(pagamentos)
    .forEach((pagamento)=>{


        tabela.innerHTML += `

        <tr>

        <td>${pagamento.curso}</td>

        <td>R$ ${pagamento.valor}</td>

        <td>${pagamento.data}</td>

        </tr>

        `;


    });


}







document
.getElementById("sair")
.onclick = ()=>{


    signOut(auth);


    window.location = "index.html";


};