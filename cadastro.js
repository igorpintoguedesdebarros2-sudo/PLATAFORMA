import {
    auth,
    db
}
from "./firebase.js";



import {
    createUserWithEmailAndPassword
}
from
"https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";



import {
    ref,
    set
}
from
"https://www.gstatic.com/firebasejs/10.7.1/firebase-database.js";





document
.getElementById("btn")
.onclick = async()=>{



    let nome =
    document.getElementById("nome").value;



    let email =
    document.getElementById("email").value;



    let senha =
    document.getElementById("senha").value;





    try {



        const usuario =
        await createUserWithEmailAndPassword(
            auth,
            email,
            senha
        );





        await set(
            ref(
                db,
                "usuarios/" + usuario.user.uid
            ),
            {

                nome: nome,

                email: email

            }
        );





        alert("Conta criada");



        window.location = "index.html";



    }

    catch(e){


        console.error(e);


        alert(e.message);


    }



};