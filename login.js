import { auth } from "./firebase.js";


import {
    signInWithEmailAndPassword,
    GoogleAuthProvider,
    signInWithPopup
}
from
"https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";




// LOGIN ADMINISTRADOR

document
.getElementById("entrar")
.onclick = async()=>{


    const email =
    document.getElementById("email").value;


    const senha =
    document.getElementById("senha").value;



    try{

await signInWithEmailAndPassword(
    auth,
    email,
    senha
);

     alert("Administrador conectado");

window.location = "admin.html";


    }
    catch(error){


        console.error(error);


        alert(error.message);


    }


};





// LOGIN GOOGLE

document
.getElementById("google")
.onclick = async()=>{


    const provider =
    new GoogleAuthProvider();



    try{


        const resultado =
        await signInWithPopup(
            auth,
            provider
        );


        const usuario =
        resultado.user;



        console.log(usuario);



        alert(
            "Bem-vindo " + usuario.displayName
        );



        window.location = "perfil.html";


    }
    catch(error){


        console.error(error);


        alert(error.message);


    }


};